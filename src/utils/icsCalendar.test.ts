import { describe, expect, it } from 'vitest'
import { buildInjectionIcs, escapeIcsText, formatIcsUtcStamp } from './icsCalendar'

describe('icsCalendar', () => {
  it('échappe les caractères spéciaux', () => {
    expect(escapeIcsText('a, b; c\\d')).toBe('a\\, b\\; c\\\\d')
  })

  it('produit un DTSTAMP en UTC', () => {
    expect(formatIcsUtcStamp(new Date('2026-11-18T08:15:30.123Z'))).toBe('20261118T081530Z')
  })

  it("utilise l'heure de rappel choisie", () => {
    const ics = buildInjectionIcs(
      { scheduledDate: '2026-12-01', status: 'planned', doseMg: 40, site: 'ventre_droite', createdAt: '' },
      'Humira 40 mg',
      '20:30',
    )
    expect(ics).toContain('DTSTART:20261201T203000')
    expect(ics).toContain('DTEND:20261201T204500')
    expect(ics).toContain('Ventre droite')
  })

  it("n'indique pas de zone pour un traitement oral", () => {
    const ics = buildInjectionIcs(
      { scheduledDate: '2026-12-01', status: 'planned', doseMg: 0, createdAt: '' },
      'Rinvoq (comprimé)',
    )
    expect(ics).toContain('SUMMARY:Prise Rinvoq (comprimé)')
    expect(ics).not.toContain('Zone')
  })
})
