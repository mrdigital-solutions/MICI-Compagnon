import Dexie, { type Table } from 'dexie'
import {
  INJECTION_SITES,
  type AppSettings,
  type DailyEntry,
  type InjectionRecord,
  type InjectionSite,
  type InjectionZonePreference,
  type LabResult,
  type DoctorQuestion,
  type MemoNote,
  type VaccinationRecord,
} from '../types'
import { addDays, getTodayKey } from '../utils/dateUtils'
import { getDbHealth, setDbHealth } from './dbHealth'
import { extractDoseMg, isOralTreatment } from '../utils/treatment'

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'default',
  treatmentName: 'Yuflima 80 mg',
  cycleDays: 14,
  reminderDayBefore: true,
  reminderSameDay: true,
  reminderHour: '09:00',
  theme: 'light',
  onboardingCompleted: false,
}

class CrohnDatabase extends Dexie {
  injections!: Table<InjectionRecord, number>
  dailyEntries!: Table<DailyEntry, string>
  labResults!: Table<LabResult, number>
  settings!: Table<AppSettings, string>

  constructor() {
    super('crohn_suivi_db')
    this.version(1).stores({
      injections: '++id, scheduledDate, actualDate, status',
      dailyEntries: 'date, feverOrInfection',
      labResults: '++id, date',
      settings: 'id',
    })
    this.version(2)
      .stores({
        injections: '++id, scheduledDate, actualDate, status',
        dailyEntries: 'date, feverOrInfection',
        labResults: '++id, date',
        settings: 'id',
      })
      .upgrade((tx) => {
        return tx.table('settings').toCollection().modify({ theme: 'light' })
      })
    // La version 3 est identique à la version 2. Elle ne peut pas être supprimée :
    // les appareils déjà passés en v3 refuseraient d'ouvrir une base déclarée en v2.
    this.version(3).stores({
      injections: '++id, scheduledDate, actualDate, status',
      dailyEntries: 'date, feverOrInfection',
      labResults: '++id, date',
      settings: 'id',
    })
  }
}

export const db = new CrohnDatabase()

// Gestion des connexions concurrentes (ancienne version restée ouverte en arrière-plan) :
// - blocked : NOTRE ouverture/mise à jour attend qu'une autre connexion se ferme
// - versionchange : une version plus récente veut la main ; on ferme proprement la nôtre
//   (comportement Dexie par défaut) pour ne jamais bloquer l'autre fenêtre
// - close : le navigateur a fermé la connexion
db.on('blocked', () => setDbHealth('blocked'))
db.on('versionchange', () => {
  setDbHealth('outdated')
})
db.on('close', () => setDbHealth((getDbHealth() === 'ok' ? 'closed' : getDbHealth())))
db.on('ready', () => setDbHealth('ok'))

// Si l'ouverture reste en attente (autre connexion qui ne répond pas), on le signale.
const openWatchdog = setTimeout(() => setDbHealth('blocked'), 8000)
db.open()
  .then(() => clearTimeout(openWatchdog))
  .catch(() => {
    clearTimeout(openWatchdog)
    setDbHealth('closed')
  })

export async function ensureDefaultSettings(): Promise<AppSettings> {
  if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
    navigator.storage.persist().catch(() => {})
  }
  const existing = await db.settings.get('default')
  if (existing) return existing
  await db.settings.put(DEFAULT_SETTINGS)
  return DEFAULT_SETTINGS
}

/** Sites autorisés par la préférence de zones (toutes les zones par défaut). */
export function getAllowedSites(preference: InjectionZonePreference = 'all') {
  if (preference === 'cuisse') return INJECTION_SITES.filter((s) => s.zone === 'Cuisse')
  if (preference === 'ventre') return INJECTION_SITES.filter((s) => s.zone === 'Ventre')
  return INJECTION_SITES
}

/**
 * Prochain site de la rotation, toujours choisi parmi les zones autorisées.
 * Si le dernier site est hors des zones choisies (ex. ventre alors que seules les cuisses
 * sont autorisées), on alterne le côté : ventre gauche → cuisse droite.
 */
export function getNextRecommendedSite(
  lastSite?: InjectionSite,
  preference: InjectionZonePreference = 'all',
): InjectionSite {
  const allowed = getAllowedSites(preference)
  if (!lastSite) return allowed[0].id
  const idx = allowed.findIndex((s) => s.id === lastSite)
  if (idx !== -1) return allowed[(idx + 1) % allowed.length].id
  const lastSide = INJECTION_SITES.find((s) => s.id === lastSite)?.side
  return (allowed.find((s) => s.side !== lastSide) ?? allowed[0]).id
}

export function getSiteLabel(site?: InjectionSite): string {
  if (!site) return 'Non renseigné'
  return INJECTION_SITES.find((s) => s.id === site)?.label ?? site
}

/**
 * Initializes or resets future planned injections starting from a reference date.
 * Keeps past 'done' and 'shifted' records untouched.
 */
export async function initializeInjectionSchedule(params: {
  treatmentName?: string
  nextInjectionDate: string
  cycleDays: number
  lastSite?: InjectionSite
  horizonCount?: number
}): Promise<void> {
  const { treatmentName, nextInjectionDate, cycleDays, lastSite, horizonCount = 12 } = params

  await db.transaction('rw', db.injections, db.settings, async () => {
    await db.injections.where('status').equals('planned').delete()

    const currentSettings = await db.settings.get('default')
    const resolvedTreatment =
      treatmentName?.trim() || currentSettings?.treatmentName || DEFAULT_SETTINGS.treatmentName
    const doseMg = extractDoseMg(resolvedTreatment)
    const oral = isOralTreatment(resolvedTreatment)

    const nowIso = new Date().toISOString()
    const records: InjectionRecord[] = []
    let rollingSite = lastSite

    for (let i = 0; i < horizonCount; i++) {
      const scheduledDate = addDays(nextInjectionDate, i * cycleDays)
      const recommendedSite = oral
        ? undefined
        : getNextRecommendedSite(rollingSite, currentSettings?.injectionZones)
      if (recommendedSite) rollingSite = recommendedSite
      records.push({
        scheduledDate,
        status: 'planned',
        site: recommendedSite,
        doseMg,
        createdAt: nowIso,
      })
    }

    await db.injections.bulkAdd(records)
    await db.settings.update('default', {
      treatmentName: resolvedTreatment,
      cycleDays,
      lastInjectionSite: oral ? undefined : lastSite,
      onboardingCompleted: true,
    })
  })
}

/**
 * Ensures there are always upcoming planned injections (e.g., 12 cycles ahead).
 */
export async function ensureUpcomingInjections(horizonCount = 12): Promise<void> {
  const settings = await ensureDefaultSettings()
  const planned = await db.injections
    .where('status')
    .equals('planned')
    .sortBy('scheduledDate')

  if (planned.length >= horizonCount) return

  let lastDate: string | undefined
  let lastSite: InjectionSite | undefined = settings.lastInjectionSite

  if (planned.length > 0) {
    const lastPlanned = planned[planned.length - 1]
    lastDate = lastPlanned.scheduledDate
    lastSite = lastPlanned.site ?? lastSite
  } else {
    const done = await db.injections
      .where('status')
      .equals('done')
      .sortBy('scheduledDate')
    const lastDone = done[done.length - 1]
    if (lastDone) {
      lastDate = lastDone.actualDate ?? lastDone.scheduledDate
      lastSite = lastDone.site ?? lastSite
    }
  }

  if (!lastDate) return

  const needed = horizonCount - planned.length
  const nowIso = new Date().toISOString()
  const oral = isOralTreatment(settings.treatmentName)
  const doseMg = extractDoseMg(settings.treatmentName)
  const newRecords: InjectionRecord[] = []

  for (let i = 1; i <= needed; i++) {
    const scheduledDate = addDays(lastDate, i * settings.cycleDays)
    const nextSite = oral ? undefined : getNextRecommendedSite(lastSite, settings.injectionZones)
    if (nextSite) lastSite = nextSite
    newRecords.push({
      scheduledDate,
      status: 'planned',
      site: nextSite,
      doseMg,
      createdAt: nowIso,
    })
  }

  if (newRecords.length > 0) {
    await db.injections.bulkAdd(newRecords)
  }
}

/**
 * Marks a planned injection as done, records the actual site/date,
 * and ensures upcoming injections follow the configured cycle.
 * For oral treatments, no site is recorded and the pen stock is untouched.
 */
export async function markInjectionDone(params: {
  injectionId: number
  site?: InjectionSite
  actualDate?: string
  notes?: string
}): Promise<void> {
  const { injectionId, actualDate = getTodayKey(), notes } = params

  await db.transaction('rw', db.injections, db.settings, async () => {
    const settings = (await db.settings.get('default')) ?? DEFAULT_SETTINGS
    const oral = isOralTreatment(settings.treatmentName)
    const site = oral ? undefined : params.site

    const target = await db.injections.get(injectionId)
    if (!target) return

    await db.injections.update(injectionId, {
      status: 'done',
      actualDate,
      site,
      notes: notes?.trim() || target.notes,
    })

    // Le stock de stylos ne concerne que les traitements injectables
    const nextStock =
      !oral && settings.penStock !== undefined && settings.penStock > 0
        ? settings.penStock - 1
        : settings.penStock

    await db.settings.update('default', {
      lastInjectionDate: actualDate,
      lastInjectionSite: site ?? settings.lastInjectionSite,
      penStock: nextStock,
    })

    // Recalculate subsequent planned injections from actualDate
    const laterPlanned = await db.injections
      .where('status')
      .equals('planned')
      .filter((inj) => inj.id !== injectionId && inj.scheduledDate >= target.scheduledDate)
      .sortBy('scheduledDate')

    let rollingSite: InjectionSite | undefined = site
    for (let i = 0; i < laterPlanned.length; i++) {
      const nextDate = addDays(actualDate, (i + 1) * settings.cycleDays)
      rollingSite = oral ? undefined : getNextRecommendedSite(rollingSite, settings.injectionZones)
      if (laterPlanned[i].id !== undefined) {
        await db.injections.update(laterPlanned[i].id!, {
          scheduledDate: nextDate,
          site: rollingSite,
        })
      }
    }
  })

  await ensureUpcomingInjections()
}

/**
 * Shifts a planned injection by X days, records the reason,
 * keeps a 'shifted' history marker on the original date,
 * and recalculates all subsequent planned dates automatically.
 */
export async function shiftInjectionAndRecalculate(params: {
  injectionId: number
  shiftDays: number
  reason: string
}): Promise<void> {
  const { injectionId, shiftDays, reason } = params
  if (shiftDays === 0) return

  const settings = await ensureDefaultSettings()
  const oral = isOralTreatment(settings.treatmentName)

  await db.transaction('rw', db.injections, async () => {
    const target = await db.injections.get(injectionId)
    if (!target) return

    const originalDate = target.scheduledDate
    const newDate = addDays(originalDate, shiftDays)
    const nowIso = new Date().toISOString()

    // Mark original planned record as 'shifted' for medical history traceability
    await db.injections.update(injectionId, {
      status: 'shifted',
      shiftDays,
      shiftReason: reason.trim() || 'Report manuel',
    })

    // Collect all planned injections after the shifted one
    const laterPlanned = await db.injections
      .where('status')
      .equals('planned')
      .filter((inj) => inj.id !== injectionId && inj.scheduledDate > originalDate)
      .sortBy('scheduledDate')

    // Create the new planned injection at newDate
    let rollingSite: InjectionSite | undefined = oral
      ? undefined
      : (target.site ?? getNextRecommendedSite(settings.lastInjectionSite, settings.injectionZones))
    await db.injections.add({
      scheduledDate: newDate,
      status: 'planned',
      site: rollingSite,
      doseMg: target.doseMg,
      notes: `${shiftDays > 0 ? `Reportée de ${shiftDays}` : `Avancée de ${-shiftDays}`} j (${reason.trim() || 'Report manuel'})`,
      createdAt: nowIso,
    })

    // Recalculate all subsequent planned dates based on newDate + i * cycleDays
    for (let i = 0; i < laterPlanned.length; i++) {
      const recalculatedDate = addDays(newDate, (i + 1) * settings.cycleDays)
      rollingSite = oral ? undefined : getNextRecommendedSite(rollingSite, settings.injectionZones)
      if (laterPlanned[i].id !== undefined) {
        await db.injections.update(laterPlanned[i].id!, {
          scheduledDate: recalculatedDate,
          site: rollingSite,
        })
      }
    }
  })
}

export async function updateCycleDaysAndRecalculate(newCycleDays: number): Promise<void> {
  await db.transaction('rw', db.injections, db.settings, async () => {
    await db.settings.update('default', { cycleDays: newCycleDays })

    const planned = await db.injections
      .where('status')
      .equals('planned')
      .sortBy('scheduledDate')

    if (planned.length <= 1) return

    const anchorDate = planned[0].scheduledDate
    for (let i = 1; i < planned.length; i++) {
      if (planned[i].id !== undefined) {
        await db.injections.update(planned[i].id!, {
          scheduledDate: addDays(anchorDate, i * newCycleDays),
        })
      }
    }
  })
}

/**
 * Applique un changement de traitement principal aux prises encore prévues :
 * dose recalculée depuis le nom, sites de rotation retirés (oral) ou ajoutés (injectable).
 */
export async function applyTreatmentToPlanned(treatmentName: string): Promise<void> {
  const oral = isOralTreatment(treatmentName)
  const doseMg = extractDoseMg(treatmentName)

  await db.transaction('rw', db.injections, db.settings, async () => {
    const settings = await db.settings.get('default')
    await db.settings.update('default', { treatmentName })

    const planned = await db.injections.where('status').equals('planned').sortBy('scheduledDate')
    let rollingSite = settings?.lastInjectionSite
    for (const inj of planned) {
      if (inj.id === undefined) continue
      let site: InjectionSite | undefined
      if (!oral) {
        site = inj.site ?? getNextRecommendedSite(rollingSite, settings?.injectionZones)
        rollingSite = site
      }
      await db.injections.update(inj.id, { doseMg, site })
    }
  })
}

/**
 * Enregistre les zones d'injection préférées et recalcule le site de toutes les prises
 * encore prévues, en partant du dernier site utilisé. L'historique n'est pas modifié.
 */
export async function applyInjectionZonesToPlanned(
  preference: InjectionZonePreference,
): Promise<void> {
  await db.transaction('rw', db.injections, db.settings, async () => {
    const settings = (await db.settings.get('default')) ?? DEFAULT_SETTINGS
    await db.settings.update('default', { injectionZones: preference })
    if (isOralTreatment(settings.treatmentName)) return

    const planned = await db.injections.where('status').equals('planned').sortBy('scheduledDate')
    let rollingSite = settings.lastInjectionSite
    for (const inj of planned) {
      if (inj.id === undefined) continue
      rollingSite = getNextRecommendedSite(rollingSite, preference)
      await db.injections.update(inj.id, { site: rollingSite })
    }
  })
}

export async function upsertDailyEntry(entry: Omit<DailyEntry, 'updatedAt'>): Promise<void> {
  await db.dailyEntries.put({
    ...entry,
    updatedAt: new Date().toISOString(),
  })
}

// ---------------------------------------------------------------------------
// Sauvegarde / restauration
// ---------------------------------------------------------------------------

export const BACKUP_FORMAT_VERSION = 2

interface EncodedBlob {
  __blob: true
  type: string
  data: string // base64
}

function isEncodedBlob(value: unknown): value is EncodedBlob {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as EncodedBlob).__blob === true &&
    typeof (value as EncodedBlob).data === 'string'
  )
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function encodeBlob(blob: Blob | undefined): Promise<EncodedBlob | undefined> {
  if (!(blob instanceof Blob)) return undefined
  const bytes = new Uint8Array(await blob.arrayBuffer())
  return { __blob: true, type: blob.type, data: bytesToBase64(bytes) }
}

function decodeBlob(value: unknown): Blob | undefined {
  if (!isEncodedBlob(value)) return undefined
  return new Blob([base64ToBytes(value.data)], {
    type: value.type || 'application/octet-stream',
  })
}

/**
 * Exporte toutes les données, y compris les PDF des bilans et la photo de la carte
 * de priorité (encodés en base64), pour permettre une restauration complète.
 */
export async function exportAllDataToJson(): Promise<string> {
  const [injections, dailyEntries, labResults, settings] = await Promise.all([
    db.injections.toArray(),
    db.dailyEntries.toArray(),
    db.labResults.toArray(),
    db.settings.toArray(),
  ])

  const serializableLabs = await Promise.all(
    labResults.map(async ({ pdfBlob, ...rest }) => ({
      ...rest,
      pdfBlob: await encodeBlob(pdfBlob),
    })),
  )
  const serializableSettings = await Promise.all(
    settings.map(async ({ priorityCardBlob, ...rest }) => ({
      ...rest,
      priorityCardBlob: await encodeBlob(priorityCardBlob),
    })),
  )

  return JSON.stringify(
    {
      version: BACKUP_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      app: 'mici-compagnon',
      data: {
        injections,
        dailyEntries,
        labResults: serializableLabs,
        settings: serializableSettings,
      },
    },
    null,
    2,
  )
}

export class BackupFormatError extends Error {}

export interface ParsedBackup {
  exportedAt?: string
  injections: InjectionRecord[]
  dailyEntries: DailyEntry[]
  labResults: LabResult[]
  settings: AppSettings[]
}

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/
const INJECTION_STATUSES = new Set(['planned', 'done', 'shifted'])
const SITE_IDS = new Set<string>(INJECTION_SITES.map((s) => s.id))
const LAB_NUMERIC_KEYS = [
  'crp',
  'calprotectin',
  'alat',
  'asat',
  'ggt',
  'leukocytes',
  'erythrocytes',
  'vgm',
] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asArray(value: unknown, label: string): unknown[] {
  if (value === undefined) return []
  if (!Array.isArray(value)) throw new BackupFormatError(`Section « ${label} » invalide.`)
  return value
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function isDateKey(value: unknown): value is string {
  return typeof value === 'string' && DATE_KEY_RE.test(value)
}

/**
 * Lit et valide un fichier de sauvegarde SANS toucher à la base.
 * Lève une BackupFormatError avec un message lisible si le fichier est invalide.
 */
export function parseBackupJson(jsonText: string): ParsedBackup {
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new BackupFormatError("Ce fichier n'est pas un JSON valide.")
  }
  if (!isRecord(parsed) || !isRecord(parsed.data)) {
    throw new BackupFormatError("Ce fichier n'est pas une sauvegarde MICI Compagnon.")
  }
  if (parsed.app !== undefined && parsed.app !== 'mici-compagnon') {
    throw new BackupFormatError("Ce fichier provient d'une autre application.")
  }
  if (typeof parsed.version === 'number' && parsed.version > BACKUP_FORMAT_VERSION) {
    throw new BackupFormatError(
      "Cette sauvegarde vient d'une version plus récente de l'application. Mettez l'application à jour.",
    )
  }

  const data = parsed.data

  const injections = asArray(data.injections, 'injections').map((raw, i) => {
    if (
      !isRecord(raw) ||
      !isDateKey(raw.scheduledDate) ||
      typeof raw.status !== 'string' ||
      !INJECTION_STATUSES.has(raw.status)
    ) {
      throw new BackupFormatError(`Injection n°${i + 1} invalide.`)
    }
    if (raw.actualDate !== undefined && !isDateKey(raw.actualDate)) {
      throw new BackupFormatError(`Date réelle de l'injection n°${i + 1} invalide.`)
    }
    return {
      ...raw,
      site: typeof raw.site === 'string' && SITE_IDS.has(raw.site) ? raw.site : undefined,
      doseMg: optionalNumber(raw.doseMg) ?? 0,
      createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    } as InjectionRecord
  })

  const dailyEntries = asArray(data.dailyEntries, 'journal').map((raw, i) => {
    if (!isRecord(raw) || !isDateKey(raw.date)) {
      throw new BackupFormatError(`Entrée de journal n°${i + 1} invalide.`)
    }
    return {
      ...raw,
      digestivePain: optionalNumber(raw.digestivePain) ?? 0,
      jointPain: optionalNumber(raw.jointPain) ?? 0,
      fatigue: optionalNumber(raw.fatigue) ?? 0,
      weightKg: optionalNumber(raw.weightKg),
      crohnSigns: Array.isArray(raw.crohnSigns)
        ? raw.crohnSigns.filter((s) => typeof s === 'string')
        : undefined,
      feverOrInfection: raw.feverOrInfection === true,
      tags: Array.isArray(raw.tags) ? raw.tags.filter((t) => typeof t === 'string') : [],
      notes: typeof raw.notes === 'string' ? raw.notes : '',
      updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
    } as DailyEntry
  })

  const labResults = asArray(data.labResults, 'bilans').map((raw, i) => {
    if (!isRecord(raw) || !isDateKey(raw.date)) {
      throw new BackupFormatError(`Bilan n°${i + 1} invalide.`)
    }
    const lab: Record<string, unknown> = { ...raw, pdfBlob: decodeBlob(raw.pdfBlob) }
    for (const key of LAB_NUMERIC_KEYS) lab[key] = optionalNumber(raw[key])
    if (typeof lab.createdAt !== 'string') lab.createdAt = new Date().toISOString()
    return lab as unknown as LabResult
  })

  const settings = asArray(data.settings, 'paramètres').map((raw, i) => {
    if (!isRecord(raw) || typeof raw.id !== 'string') {
      throw new BackupFormatError(`Paramètres n°${i + 1} invalides.`)
    }
    const vaccinations = Array.isArray(raw.vaccinations)
      ? raw.vaccinations.filter(
          (v): v is VaccinationRecord =>
            isRecord(v) &&
            typeof v.id === 'string' &&
            typeof v.vaccine === 'string' &&
            isDateKey(v.date),
        )
      : undefined
    const doctorQuestions = Array.isArray(raw.doctorQuestions)
      ? raw.doctorQuestions.filter(
          (q): q is DoctorQuestion =>
            isRecord(q) &&
            typeof q.id === 'string' &&
            typeof q.text === 'string' &&
            isDateKey(q.createdAt) &&
            (q.askedAt === undefined || isDateKey(q.askedAt)),
        )
      : undefined
    const memoNotes = Array.isArray(raw.memoNotes)
      ? raw.memoNotes.filter(
          (m): m is MemoNote =>
            isRecord(m) &&
            typeof m.id === 'string' &&
            typeof m.text === 'string' &&
            typeof m.createdAt === 'string' &&
            typeof m.updatedAt === 'string',
        )
      : undefined
    return {
      ...DEFAULT_SETTINGS,
      ...raw,
      vaccinations,
      doctorQuestions,
      memoNotes,
      priorityCardBlob: decodeBlob(raw.priorityCardBlob),
    } as AppSettings
  })

  return {
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : undefined,
    injections,
    dailyEntries,
    labResults,
    settings,
  }
}

/** Remplace toutes les données locales par une sauvegarde déjà validée. */
export async function restoreBackup(backup: ParsedBackup): Promise<void> {
  const { injections, dailyEntries, labResults, settings } = backup

  await db.transaction(
    'rw',
    db.injections,
    db.dailyEntries,
    db.labResults,
    db.settings,
    async () => {
      await Promise.all([
        db.injections.clear(),
        db.dailyEntries.clear(),
        db.labResults.clear(),
        db.settings.clear(),
      ])

      if (injections.length) await db.injections.bulkAdd(injections)
      if (dailyEntries.length) await db.dailyEntries.bulkPut(dailyEntries)
      if (labResults.length) await db.labResults.bulkAdd(labResults)
      if (settings.length) {
        await db.settings.bulkPut(settings)
      } else {
        await db.settings.put(DEFAULT_SETTINGS)
      }
    },
  )
}

export async function importAllDataFromJson(jsonText: string): Promise<void> {
  await restoreBackup(parseBackupJson(jsonText))
}
