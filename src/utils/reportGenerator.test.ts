import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../db/database'
import type { DailyEntry, InjectionRecord } from '../types'
import {
  buildEndOfDoseBuckets,
  buildMedicalReport,
  formatReportAsText,
  toPdfSafeText,
} from './reportGenerator'

function entry(date: string, score: number): DailyEntry {
  return {
    date,
    digestivePain: score,
    jointPain: score,
    fatigue: score,
    feverOrInfection: false,
    tags: [],
    notes: '',
    updatedAt: '',
  }
}

describe('buildEndOfDoseBuckets', () => {
  it('découpe un cycle de 14 jours en 4 tranches contiguës', () => {
    const b = buildEndOfDoseBuckets(14)
    expect(b.map((x) => x.label)).toEqual([
      'J-11 et avant',
      'J-10 à J-7',
      'J-6 à J-4',
      'J-3 à Jour J',
    ])
    // chaque nombre de jours restants tombe dans exactement une tranche
    for (let d = 0; d < 14; d++) {
      expect(b.filter((x) => d >= x.min && d <= x.max)).toHaveLength(1)
    }
  })

  it("s'adapte à un cycle de 56 jours", () => {
    const b = buildEndOfDoseBuckets(56)
    expect(b[3].label).toBe('J-13 à Jour J')
    expect(b[0].min).toBe(42)
  })

  it('ne produit pas de courbe pour un traitement quotidien', () => {
    expect(buildEndOfDoseBuckets(1)).toEqual([])
  })
})

describe('buildMedicalReport', () => {
  const injections: InjectionRecord[] = [
    { id: 1, scheduledDate: '2026-11-15', status: 'done', actualDate: '2026-11-15', doseMg: 80, site: 'cuisse_gauche', createdAt: '' },
  ]

  it('classe les symptômes selon les jours restants avant la prise', () => {
    const report = buildMedicalReport({
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      settings: { ...DEFAULT_SETTINGS, cycleDays: 14 },
      injections,
      dailyEntries: [entry('2026-11-14', 4), entry('2026-11-02', 1)],
      labResults: [],
    })
    const last = report.endOfDoseCurve[3]
    expect(last.daysCount).toBe(1)
    expect(last.avgScore).toBe(4)
    expect(report.isOral).toBe(false)
  })

  it('applique les normes féminines dans le rapport', () => {
    const report = buildMedicalReport({
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      settings: { ...DEFAULT_SETTINGS, patientSex: 'F' },
      injections: [],
      dailyEntries: [],
      labResults: [{ date: '2026-11-10', erythrocytes: 4.1, createdAt: '' }],
    })
    expect(report.labComparisons[0].outOfRange).toBe(false)
    expect(formatReportAsText(report)).toContain('réf. 3.80 – 5.10')
  })

  it('parle de « prises » pour un traitement oral', () => {
    const report = buildMedicalReport({
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      settings: { ...DEFAULT_SETTINGS, treatmentName: 'Imurel / Azathioprine', cycleDays: 1 },
      injections: [],
      dailyEntries: [],
      labResults: [],
    })
    const text = formatReportAsText(report)
    expect(text).toContain('Prises réalisées')
    expect(text).toContain('BILAN DE SUIVI — MICI')
  })
})

describe('toPdfSafeText', () => {
  it('remplace les caractères absents de la police PDF', () => {
    expect(toPdfSafeText('A → B ≥ 3')).toBe('A -> B >= 3')
    expect(toPdfSafeText('Fièvre — µg/g • ok')).toBe('Fièvre — µg/g • ok')
  })
})
