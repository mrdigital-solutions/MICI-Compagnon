/**
 * Remplacez cette URL par votre lien Ko-fi, PayPal.me ou Buy Me a Coffee
 * dès que votre page de don est créée.
 */
export const DONATION_URL = 'https://ko-fi.com/micicompagnon'

export interface TreatmentPreset {
  name: string
  cycleDays: number
}

export const APP_VERSION = '1.3'

export const CHANGELOG = [
  {
    version: '1.3 — 18 nov.',
    items: [
      'Combothérapie : possibilité d’ajouter un 2e traitement (ex : Humira + Méthotrexate, Infliximab + Imurel) dans Paramètres et sur le Calendrier.',
      'Ajout de Méthotrexate 15 mg et Imurel / Azathioprine dans les pré-réglages.',
    ],
  },
  {
    version: '1.2 — 17 nov.',
    items: [
      'Carte Urgence améliorée : onglets séparés Carte Toilettes & Fiche Secours (groupe sanguin, allergies, proche à prévenir).',
      'Ajout de votre carte de priorité (AFA / CMI) en photo avec affichage plein écran.',
      'Journal : suivi des migraines (0 à 5), aliments suspectés et tags Virus / Antibiotiques comptés dans le Rapport Médecin.',
      'Textes et compteurs agrandis sur mobile + installation en 1 clic.',
    ],
  },
  {
    version: '1.1 — 16 nov.',
    items: [
      'Import PDF automatique amélioré (conservation du PDF original hors-ligne + détection Calprotectine).',
      'Conseils bien-être illustrés et pause respiration calme.',
    ],
  },
] as const

export const TREATMENT_PRESETS: TreatmentPreset[] = [
  { name: 'Yuflima 80 mg', cycleDays: 14 },
  { name: 'Yuflima 40 mg', cycleDays: 14 },
  { name: 'Humira 40 mg', cycleDays: 14 },
  { name: 'Stelara 90 mg', cycleDays: 56 },
  { name: 'Skyrizi 360 mg', cycleDays: 56 },
  { name: 'Entyvio 108 mg', cycleDays: 14 },
  { name: 'Remicade / Infliximab', cycleDays: 56 },
  { name: 'Méthotrexate 15 mg', cycleDays: 7 },
  { name: 'Imurel / Azathioprine', cycleDays: 1 },
  { name: 'Rinvoq (comprimé)', cycleDays: 1 },
]
