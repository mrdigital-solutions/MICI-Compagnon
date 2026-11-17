import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  BackupFormatError,
  DEFAULT_SETTINGS,
  applyTreatmentToPlanned,
  base64ToBytes,
  bytesToBase64,
  db,
  ensureUpcomingInjections,
  exportAllDataToJson,
  initializeInjectionSchedule,
  markInjectionDone,
  parseBackupJson,
  restoreBackup,
} from './database'

async function planned() {
  return db.injections.where('status').equals('planned').sortBy('scheduledDate')
}

beforeEach(async () => {
  await Promise.all([
    db.injections.clear(),
    db.dailyEntries.clear(),
    db.labResults.clear(),
    db.settings.clear(),
  ])
  await db.settings.put({ ...DEFAULT_SETTINGS })
})

describe('planning des injections', () => {
  it('utilise la dose du traitement choisi (pas 80 mg par défaut)', async () => {
    await initializeInjectionSchedule({
      treatmentName: 'Humira 40 mg',
      nextInjectionDate: '2026-12-01',
      cycleDays: 14,
      lastSite: 'cuisse_gauche',
      horizonCount: 3,
    })
    const list = await planned()
    expect(list.map((i) => i.doseMg)).toEqual([40, 40, 40])
    expect(list.map((i) => i.scheduledDate)).toEqual(['2026-12-01', '2026-12-15', '2026-12-29'])
    expect(list[0].site).toBe('cuisse_droite')

    // Les injections ajoutées automatiquement gardent la bonne dose
    await ensureUpcomingInjections(5)
    const extended = await planned()
    expect(extended).toHaveLength(5)
    expect(extended.every((i) => i.doseMg === 40)).toBe(true)
  })

  it('décompte un stylo et fait tourner les sites pour un injectable', async () => {
    await db.settings.update('default', { penStock: 3 })
    await initializeInjectionSchedule({
      treatmentName: 'Yuflima 80 mg',
      nextInjectionDate: '2026-12-01',
      cycleDays: 14,
      horizonCount: 3,
    })
    const [first] = await planned()
    await markInjectionDone({ injectionId: first.id!, site: 'ventre_gauche', actualDate: '2026-12-02' })

    const settings = await db.settings.get('default')
    expect(settings?.penStock).toBe(2)
    expect(settings?.lastInjectionSite).toBe('ventre_gauche')
    const next = await planned()
    expect(next[0].scheduledDate).toBe('2026-12-16')
    expect(next[0].site).toBe('ventre_droite')
  })

  it("ne gère ni site ni stock pour un traitement oral", async () => {
    await db.settings.update('default', { penStock: 3 })
    await initializeInjectionSchedule({
      treatmentName: 'Imurel / Azathioprine',
      nextInjectionDate: '2026-12-01',
      cycleDays: 1,
      lastSite: 'cuisse_gauche',
      horizonCount: 3,
    })
    const list = await planned()
    expect(list.every((i) => i.site === undefined)).toBe(true)
    expect(list[1].scheduledDate).toBe('2026-12-02')

    await markInjectionDone({ injectionId: list[0].id!, site: 'cuisse_droite', actualDate: '2026-12-01' })
    const settings = await db.settings.get('default')
    expect(settings?.penStock).toBe(3)
    const done = await db.injections.get(list[0].id!)
    expect(done?.site).toBeUndefined()
  })

  it('met à jour dose et sites des prises prévues lors du changement de traitement', async () => {
    await initializeInjectionSchedule({
      treatmentName: 'Yuflima 80 mg',
      nextInjectionDate: '2026-12-01',
      cycleDays: 14,
      horizonCount: 2,
    })
    await applyTreatmentToPlanned('Stelara 90 mg')
    expect((await planned()).map((i) => i.doseMg)).toEqual([90, 90])

    await applyTreatmentToPlanned('Rinvoq (comprimé)')
    const oral = await planned()
    expect(oral.every((i) => i.site === undefined && i.doseMg === 0)).toBe(true)
  })
})

describe('sauvegarde et restauration', () => {
  it('encode et décode le base64 sans perte', () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 255, 37, 80, 68, 70])
    expect(Array.from(base64ToBytes(bytesToBase64(bytes)))).toEqual(Array.from(bytes))
  })

  it('conserve les PDF et la carte de priorité dans le fichier de sauvegarde', async () => {
    await db.labResults.add({ date: '2026-11-01', crp: 3, createdAt: '' })
    await db.settings.update('default', { patientName: 'Test' })
    // Les Blob ne passent pas par fake-indexeddb : on vérifie l'encodage via le format exporté
    const json = await exportAllDataToJson()
    const raw = JSON.parse(json)
    raw.data.labResults[0].pdfBlob = {
      __blob: true,
      type: 'application/pdf',
      data: bytesToBase64(new TextEncoder().encode('%PDF-1.4')),
    }
    raw.data.settings[0].priorityCardBlob = {
      __blob: true,
      type: 'image/png',
      data: bytesToBase64(new Uint8Array([137, 80, 78, 71])),
    }
    const parsed = parseBackupJson(JSON.stringify(raw))
    const pdf = parsed.labResults[0].pdfBlob!
    expect(pdf.type).toBe('application/pdf')
    expect(await pdf.text()).toBe('%PDF-1.4')
    expect(parsed.settings[0].priorityCardBlob?.type).toBe('image/png')
    expect(parsed.settings[0].patientName).toBe('Test')
  })

  it('restaure les données exportées', async () => {
    await db.dailyEntries.put({
      date: '2026-11-10',
      digestivePain: 2,
      jointPain: 0,
      fatigue: 1,
      feverOrInfection: false,
      tags: ['Stress'],
      notes: 'ok',
      updatedAt: '',
    })
    const json = await exportAllDataToJson()
    await db.dailyEntries.clear()

    await restoreBackup(parseBackupJson(json))
    expect((await db.dailyEntries.get('2026-11-10'))?.tags).toEqual(['Stress'])
  })

  it('refuse un fichier invalide sans toucher aux données', async () => {
    await db.labResults.add({ date: '2026-11-01', crp: 3, createdAt: '' })
    expect(() => parseBackupJson('pas du json')).toThrow(BackupFormatError)
    expect(() => parseBackupJson('{"data":{"injections":[{"status":"planned"}]}}')).toThrow(
      /Injection n°1/,
    )
    expect(() => parseBackupJson('{"app":"autre","data":{}}')).toThrow(/autre application/)
    expect(() => parseBackupJson('{"version":99,"data":{}}')).toThrow(/plus récente/)
    expect(await db.labResults.count()).toBe(1)
  })

  it('accepte les anciennes sauvegardes (version 1, sans fichiers joints)', () => {
    const v1 = JSON.stringify({
      version: 1,
      app: 'mici-compagnon',
      data: {
        injections: [{ id: 1, scheduledDate: '2026-10-01', status: 'done', doseMg: 80, createdAt: '' }],
        dailyEntries: [],
        labResults: [{ id: 1, date: '2026-10-02', crp: 4, createdAt: '' }],
        settings: [{ id: 'default', treatmentName: 'Yuflima 80 mg', cycleDays: 14 }],
      },
    })
    const parsed = parseBackupJson(v1)
    expect(parsed.injections).toHaveLength(1)
    expect(parsed.labResults[0].pdfBlob).toBeUndefined()
    expect(parsed.settings[0].reminderHour).toBe('09:00')
  })
})
