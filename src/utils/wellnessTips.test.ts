import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../db/database'
import type { DailyEntry, InjectionRecord } from '../types'
import { GENERAL_TIPS, buildTipSequence, getPersonalTips } from './wellnessTips'

const today = '2026-06-10' // hors saison grippe
const settings = { ...DEFAULT_SETTINGS, penStock: 4 }

function entry(date: string, patch: Partial<DailyEntry> = {}): DailyEntry {
  return {
    date,
    digestivePain: 0,
    jointPain: 0,
    fatigue: 0,
    feverOrInfection: false,
    tags: [],
    notes: '',
    updatedAt: '',
    ...patch,
  }
}

const planned = (scheduledDate: string): InjectionRecord => ({
  scheduledDate,
  status: 'planned',
  doseMg: 80,
  createdAt: '',
})

const ids = (ctx: Parameters<typeof getPersonalTips>[0]) => getPersonalTips(ctx).map((t) => t.id)

describe('getPersonalTips', () => {
  it('ne propose rien quand tout va bien', () => {
    expect(ids({ today, settings, injections: [planned('2026-06-20')], dailyEntries: [entry(today)] })).toEqual([])
  })

  it('rappelle de sortir le stylo la veille de l’injection', () => {
    expect(ids({ today, settings, injections: [planned('2026-06-11')] })).toContain('p-stylo')
  })

  it('pas de rappel stylo pour un traitement oral', () => {
    const oral = { ...settings, treatmentName: 'Imurel / Azathioprine' }
    expect(ids({ today, settings: oral, injections: [planned('2026-06-11')] })).not.toContain('p-stylo')
  })

  it('met la fièvre avant une injection proche en premier', () => {
    const r = ids({
      today,
      settings,
      injections: [planned('2026-06-12')],
      dailyEntries: [entry('2026-06-09', { feverOrInfection: true })],
    })
    expect(r[0]).toBe('p-fievre')
  })

  it('réagit aux selles liquides, douleurs, fatigue et moral', () => {
    const r = ids({
      today,
      settings,
      dailyEntries: [
        entry(today, { stoolConsistency: 'liquide', digestivePain: 3, fatigue: 4, mood: 'difficile' }),
      ],
    })
    expect(r).toEqual(['p-hydratation', 'p-alimentation', 'p-moral', 'p-fatigue'])
  })

  it('ignore les entrées de plus de 2 jours', () => {
    expect(ids({ today, settings, dailyEntries: [entry('2026-06-07', { fatigue: 5 })] })).toEqual([])
  })

  it('signale une perte de poids de 5 % sur un mois', () => {
    const r = getPersonalTips({
      today,
      settings,
      dailyEntries: [entry('2026-05-15', { weightKg: 70 }), entry('2026-06-08', { weightKg: 66 })],
    })
    expect(r.map((t) => t.id)).toContain('p-poids')
    expect(r.find((t) => t.id === 'p-poids')!.text).toContain('4 kg')
  })

  it('stock bas, RDV proche et grippe en saison', () => {
    const r = ids({
      today: '2026-11-20',
      settings: { ...settings, penStock: 1, nextDoctorAppointment: '2026-11-23' },
    })
    expect(r).toEqual(['p-stock', 'p-rdv', 'p-grippe'])
  })
})

describe('buildTipSequence', () => {
  it('met les conseils personnels en tête puis tous les conseils généraux', () => {
    const seq = buildTipSequence({ today, settings, injections: [planned('2026-06-11')] })
    expect(seq[0].id).toBe('p-stylo')
    expect(seq.length).toBe(GENERAL_TIPS.length + 1)
    expect(new Set(seq.map((t) => t.id)).size).toBe(seq.length)
  })

  it('change de conseil du jour d’un jour à l’autre', () => {
    const a = buildTipSequence({ today: '2026-06-10', settings })[0].id
    const b = buildTipSequence({ today: '2026-06-11', settings })[0].id
    expect(a).not.toBe(b)
  })
})
