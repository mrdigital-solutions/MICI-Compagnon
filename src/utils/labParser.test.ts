import { describe, expect, it } from 'vitest'
import {
  LAB_MARKERS,
  extractDateFromLabText,
  getMarkerRange,
  isMarkerOutOfRange,
  parseLabText,
} from './labParser'

const marker = (key: string) => LAB_MARKERS.find((m) => m.key === key)!

describe('parseLabText', () => {
  it('extrait les marqueurs principaux avec virgule décimale', () => {
    const text = `Prélevé le 12/09/2026 à 08:15
      CRP 12,4 mg/L (< 5.0)
      Calprotectine fécale [AC] (ELISA) 315,7 µg/g (< 50)
      ALAT 32 UI/L ASAT 28 UI/L GGT 45 UI/L
      Leucocytes 6,8 G/L Hématies 4,52 T/L V.G.M. 88,1 fL`
    const r = parseLabText(text)
    expect(r.date).toBe('2026-09-12')
    expect(r.crp).toBe(12.4)
    expect(r.calprotectin).toBe(315.7)
    expect(r.alat).toBe(32)
    expect(r.asat).toBe(28)
    expect(r.ggt).toBe(45)
    expect(r.leukocytes).toBe(6.8)
    expect(r.erythrocytes).toBe(4.52)
    expect(r.vgm).toBe(88.1)
  })

  it('signale les valeurs sous le seuil de détection', () => {
    const r = parseLabText('Date de l’examen : 03-02-2026 CRP < 0,6 mg/L')
    expect(r.crp).toBe(0.6)
    expect(r.notes).toContain('CRP < 0.6')
  })

  it('convertit les leucocytes en /mm3 vers G/L', () => {
    expect(parseLabText('Leucocytes 6500 /mm3').leukocytes).toBe(6.5)
  })

  it('convertit la calprotectine en mg/g vers µg/g', () => {
    expect(parseLabText('Calprotectine 0,12 mg/g').calprotectin).toBe(120)
  })

  it('accepte la calprotectine en mg/kg (équivalent µg/g)', () => {
    expect(parseLabText('Calprotectine dans les selles 85 mg/kg').calprotectin).toBe(85)
  })

  it('prévient quand la calprotectine est lue sans unité', () => {
    const r = parseLabText('Calprotectine 140')
    expect(r.calprotectin).toBe(140)
    expect(r.notes).toContain('sans unité')
  })
})

describe('extractDateFromLabText', () => {
  it('ignore la date de naissance', () => {
    expect(extractDateFromLabText('Patient né le 04/05/2001 Dossier du 10/06/2026')).toBe(
      '2026-06-10',
    )
  })

  it('ignore les dates dans le futur', () => {
    expect(extractDateFromLabText('Valable jusqu au 01/01/2099 édité 15/03/2026')).toBe(
      '2026-03-15',
    )
  })
})

describe('valeurs de référence', () => {
  it('utilise les normes féminines quand le sexe est F', () => {
    const hematies = marker('erythrocytes')
    expect(getMarkerRange(hematies, 'F').minRef).toBe(3.8)
    expect(isMarkerOutOfRange(hematies, 4.1, 'F')).toBe(false)
    expect(isMarkerOutOfRange(hematies, 4.1, 'M')).toBe(true)
    expect(isMarkerOutOfRange(hematies, 4.1)).toBe(true)
  })

  it('garde la même norme quand elle ne dépend pas du sexe', () => {
    expect(getMarkerRange(marker('crp'), 'F').maxRef).toBe(5)
  })
})
