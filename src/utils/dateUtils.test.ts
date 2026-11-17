import { describe, expect, it } from 'vitest'
import { addDays, diffDays, getMonthGrid, parseDateKey, toDateKey } from './dateUtils'

describe('dateUtils', () => {
  it('ajoute des jours en franchissant les mois et années', () => {
    expect(addDays('2026-01-30', 3)).toBe('2026-02-02')
    expect(addDays('2026-12-25', 14)).toBe('2027-01-08')
    expect(addDays('2026-03-10', -14)).toBe('2026-02-24')
  })

  it("reste stable lors des changements d'heure (été / hiver)", () => {
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29')
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30')
    expect(diffDays('2026-03-28', '2026-03-30')).toBe(2)
    expect(diffDays('2026-10-24', '2026-10-26')).toBe(2)
  })

  it('convertit aller-retour une clé de date', () => {
    expect(toDateKey(parseDateKey('2026-11-18'))).toBe('2026-11-18')
  })

  it('génère une grille de mois commençant le lundi', () => {
    const grid = getMonthGrid(2026, 10) // novembre 2026 (1er = dimanche)
    expect(grid.length % 7).toBe(0)
    expect(grid[0].dateKey).toBe('2026-10-26')
    expect(grid.find((c) => c.dateKey === '2026-11-01')?.isCurrentMonth).toBe(true)
  })
})
