import Dexie, { type Table } from 'dexie'
import {
  INJECTION_SITES,
  type AppSettings,
  type DailyEntry,
  type InjectionRecord,
  type InjectionSite,
  type LabResult,
} from '../types'
import { addDays, getTodayKey } from '../utils/dateUtils'

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
    this.version(3).stores({
      injections: '++id, scheduledDate, actualDate, status',
      dailyEntries: 'date, feverOrInfection',
      labResults: '++id, date',
      settings: 'id',
    })
  }
}

export const db = new CrohnDatabase()

export async function ensureDefaultSettings(): Promise<AppSettings> {
  if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
    navigator.storage.persist().catch(() => {})
  }
  const existing = await db.settings.get('default')
  if (existing) return existing
  await db.settings.put(DEFAULT_SETTINGS)
  return DEFAULT_SETTINGS
}

export function getNextRecommendedSite(lastSite?: InjectionSite): InjectionSite {
  if (!lastSite) return INJECTION_SITES[0].id
  const idx = INJECTION_SITES.findIndex((s) => s.id === lastSite)
  if (idx === -1) return INJECTION_SITES[0].id
  return INJECTION_SITES[(idx + 1) % INJECTION_SITES.length].id
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
    const resolvedTreatment = treatmentName?.trim() || currentSettings?.treatmentName || 'Yuflima 80 mg'
    const doseMatch = resolvedTreatment.match(/(\d+)\s*mg/i)
    const doseMg = doseMatch ? Number(doseMatch[1]) : 80

    const nowIso = new Date().toISOString()
    const records: InjectionRecord[] = []
    let rollingSite = lastSite

    for (let i = 0; i < horizonCount; i++) {
      const scheduledDate = addDays(nextInjectionDate, i * cycleDays)
      const recommendedSite = getNextRecommendedSite(rollingSite)
      rollingSite = recommendedSite
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
      lastInjectionSite: lastSite,
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
  const newRecords: InjectionRecord[] = []

  for (let i = 1; i <= needed; i++) {
    const scheduledDate = addDays(lastDate, i * settings.cycleDays)
    const nextSite = getNextRecommendedSite(lastSite)
    lastSite = nextSite
    newRecords.push({
      scheduledDate,
      status: 'planned',
      site: nextSite,
      doseMg: 80,
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
 */
export async function markInjectionDone(params: {
  injectionId: number
  site: InjectionSite
  actualDate?: string
  notes?: string
}): Promise<void> {
  const { injectionId, site, actualDate = getTodayKey(), notes } = params
  const settings = await ensureDefaultSettings()

  await db.transaction('rw', db.injections, db.settings, async () => {
    const target = await db.injections.get(injectionId)
    if (!target) return

    await db.injections.update(injectionId, {
      status: 'done',
      actualDate,
      site,
      notes: notes?.trim() || target.notes,
    })

    const nextStock =
      settings.penStock !== undefined && settings.penStock > 0
        ? settings.penStock - 1
        : settings.penStock

    await db.settings.update('default', {
      lastInjectionDate: actualDate,
      lastInjectionSite: site,
      penStock: nextStock,
    })

    // Recalculate subsequent planned injections from actualDate
    const laterPlanned = await db.injections
      .where('status')
      .equals('planned')
      .filter((inj) => inj.id !== injectionId && inj.scheduledDate >= target.scheduledDate)
      .sortBy('scheduledDate')

    let rollingSite: InjectionSite = site
    for (let i = 0; i < laterPlanned.length; i++) {
      const nextDate = addDays(actualDate, (i + 1) * settings.cycleDays)
      rollingSite = getNextRecommendedSite(rollingSite)
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
    let rollingSite = target.site ?? getNextRecommendedSite(settings.lastInjectionSite)
    await db.injections.add({
      scheduledDate: newDate,
      status: 'planned',
      site: rollingSite,
      doseMg: target.doseMg,
      notes: `Reportée de ${shiftDays > 0 ? `+${shiftDays}` : shiftDays} j (${reason.trim() || 'Report manuel'})`,
      createdAt: nowIso,
    })

    // Recalculate all subsequent planned dates based on newDate + i * cycleDays
    for (let i = 0; i < laterPlanned.length; i++) {
      const recalculatedDate = addDays(newDate, (i + 1) * settings.cycleDays)
      rollingSite = getNextRecommendedSite(rollingSite)
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

export async function upsertDailyEntry(entry: Omit<DailyEntry, 'updatedAt'>): Promise<void> {
  await db.dailyEntries.put({
    ...entry,
    updatedAt: new Date().toISOString(),
  })
}

export async function exportAllDataToJson(): Promise<string> {
  const [injections, dailyEntries, labResults, settings] = await Promise.all([
    db.injections.toArray(),
    db.dailyEntries.toArray(),
    db.labResults.toArray(),
    db.settings.toArray(),
  ])

  const serializableLabs = labResults.map(({ pdfBlob: _blob, ...rest }) => rest)

  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      app: 'mici-compagnon',
      data: { injections, dailyEntries, labResults: serializableLabs, settings },
    },
    null,
    2,
  )
}

export async function importAllDataFromJson(jsonText: string): Promise<void> {
  const parsed = JSON.parse(jsonText)
  if (!parsed?.data) {
    throw new Error('Format de sauvegarde JSON invalide.')
  }

  const { injections = [], dailyEntries = [], labResults = [], settings = [] } = parsed.data

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
