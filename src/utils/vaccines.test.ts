import { describe, expect, it } from 'vitest'
import type { VaccinationRecord } from '../types'
import { VACCINE_PRESETS, getSeasonStart, getVaccineStatus } from './vaccines'

const preset = (id: string) => VACCINE_PRESETS.find((p) => p.id === id)!
const rec = (vaccine: string, date: string): VaccinationRecord => ({ id: date, vaccine, date })

describe('getSeasonStart', () => {
  it('commence la saison au 1er septembre', () => {
    expect(getSeasonStart('2026-11-20')).toBe('2026-09-01')
    expect(getSeasonStart('2027-01-15')).toBe('2026-09-01')
    expect(getSeasonStart('2026-08-31')).toBe('2025-09-01')
  })
})

describe('getVaccineStatus', () => {
  it('grippe : à faire pendant la campagne, à jour si faite cette saison', () => {
    expect(getVaccineStatus(preset('grippe'), [], '2026-11-20').tone).toBe('todo')
    expect(getVaccineStatus(preset('grippe'), [rec('Grippe', '2025-10-10')], '2026-11-20').tone).toBe('todo')
    expect(getVaccineStatus(preset('grippe'), [rec('Grippe', '2026-10-15')], '2026-11-20').tone).toBe('ok')
    expect(getVaccineStatus(preset('grippe'), [], '2026-06-01').tone).toBe('info')
  })

  it('zona : 2 doses à 2 mois', () => {
    const z = preset('zona')
    expect(getVaccineStatus(z, [rec(z.name, '2026-10-01')], '2026-11-01').text).toMatch(/Dose 2 vers le 30\/11\/2026/)
    expect(getVaccineStatus(z, [rec(z.name, '2026-08-01')], '2026-11-01').tone).toBe('todo')
    expect(
      getVaccineStatus(z, [rec(z.name, '2026-08-01'), rec(z.name, '2026-10-01')], '2026-11-01').tone,
    ).toBe('ok')
  })

  it('DTP : rappel tous les 10 ans', () => {
    const d = preset('dtp')
    expect(getVaccineStatus(d, [rec(d.name, '2020-05-01')], '2026-11-20').text).toBe('Prochain rappel en 2030')
    expect(getVaccineStatus(d, [rec(d.name, '2015-05-01')], '2026-11-20').tone).toBe('todo')
  })

  it('ignore les dates futures', () => {
    expect(getVaccineStatus(preset('grippe'), [rec('Grippe', '2026-12-01')], '2026-11-20').tone).toBe('todo')
  })
})
