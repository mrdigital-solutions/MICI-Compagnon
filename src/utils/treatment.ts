import { TREATMENT_PRESETS } from '../config/support'

const ORAL_KEYWORDS = [
  'comprimé',
  'comprime',
  'gélule',
  'gelule',
  'oral',
  ' cp',
  'imurel',
  'azathioprine',
  'purinethol',
  'mercaptopurine',
  'rinvoq',
  'upadacitinib',
  'jyseleca',
  'filgotinib',
  'xeljanz',
  'tofacitinib',
  'zeposia',
  'ozanimod',
  'velsipity',
  'etrasimod',
]

/** Vrai si le nom correspond exactement à un traitement de la liste. */
export function isPresetTreatment(name: string): boolean {
  return TREATMENT_PRESETS.some((p) => p.name === name)
}

/**
 * Indique si un traitement se prend par voie orale (comprimé / gélule).
 * Dans ce cas il n'y a ni rotation des sites d'injection ni stock de stylos.
 */
export function isOralTreatment(name?: string): boolean {
  if (!name) return false
  const preset = TREATMENT_PRESETS.find((p) => p.name === name)
  if (preset) return Boolean(preset.isOral)
  const lower = ` ${name.toLowerCase()}`
  return ORAL_KEYWORDS.some((k) => lower.includes(k))
}

/**
 * Extrait la dose en mg du nom du traitement ("Humira 40 mg" → 40).
 * Retourne 0 si aucune dose n'est indiquée (elle n'est alors pas affichée).
 */
export function extractDoseMg(name?: string): number {
  const match = name?.match(/(\d+(?:[.,]\d+)?)\s*mg/i)
  return match ? Number(match[1].replace(',', '.')) : 0
}

/** Libellé d'une prise : "injection" ou "prise" selon la voie d'administration. */
export function intakeWord(name?: string): string {
  return isOralTreatment(name) ? 'prise' : 'injection'
}
