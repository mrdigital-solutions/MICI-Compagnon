/**
 * Remplacez cette URL par votre lien Ko-fi, PayPal.me ou Buy Me a Coffee
 * dès que votre page de don est créée.
 */
export const DONATION_URL = ''

export interface TreatmentPreset {
  name: string
  cycleDays: number
}

export const TREATMENT_PRESETS: TreatmentPreset[] = [
  { name: 'Yuflima 80 mg', cycleDays: 14 },
  { name: 'Yuflima 40 mg', cycleDays: 14 },
  { name: 'Humira 40 mg', cycleDays: 14 },
  { name: 'Stelara 90 mg', cycleDays: 56 },
  { name: 'Skyrizi 360 mg', cycleDays: 56 },
  { name: 'Entyvio 108 mg', cycleDays: 14 },
  { name: 'Remicade / Infliximab', cycleDays: 56 },
  { name: 'Rinvoq (comprimé)', cycleDays: 1 },
]
