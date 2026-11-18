import { describe, expect, it } from 'vitest'
import { extractDoseMg, isOralTreatment, isPresetTreatment } from './treatment'

describe('treatment', () => {
  it('extrait la dose du nom du traitement', () => {
    expect(extractDoseMg('Humira 40 mg')).toBe(40)
    expect(extractDoseMg('Stelara 90mg')).toBe(90)
    expect(extractDoseMg('Méthotrexate 7,5 mg')).toBe(7.5)
    expect(extractDoseMg('Remicade / Infliximab')).toBe(0)
  })

  it('reconnaît les traitements oraux', () => {
    expect(isOralTreatment('Imurel / Azathioprine')).toBe(true)
    expect(isOralTreatment('Rinvoq (comprimé)')).toBe(true)
    expect(isOralTreatment('Rinvoq 45 mg')).toBe(true)
    expect(isOralTreatment('Pentasa comprimé 1 g')).toBe(true)
  })

  it('considère les biothérapies injectables comme non orales', () => {
    expect(isOralTreatment('Yuflima 80 mg')).toBe(false)
    expect(isOralTreatment('Humira 40 mg')).toBe(false)
    expect(isOralTreatment('Méthotrexate 15 mg')).toBe(false)
    expect(isOralTreatment(undefined)).toBe(false)
  })

  it('reconnaît les traitements de la liste', () => {
    expect(isPresetTreatment('Humira 40 mg')).toBe(true)
    expect(isPresetTreatment('Humira 40mg')).toBe(false)
    expect(isPresetTreatment('')).toBe(false)
  })
})
