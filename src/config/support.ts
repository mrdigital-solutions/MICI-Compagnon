/**
 * Remplacez cette URL par votre lien Ko-fi, PayPal.me ou Buy Me a Coffee
 * dès que votre page de don est créée.
 */
export const DONATION_URL = 'https://ko-fi.com/micicompagnon'

export interface TreatmentPreset {
  name: string
  cycleDays: number
  /** Traitement par voie orale (pas de site d'injection ni de stock de stylos) */
  isOral?: boolean
}

export const APP_VERSION = '1.3'

export const CHANGELOG = [
  {
    version: '1.3 — 18 nov.',
    items: [
      'Sauvegarde complète : les PDF des bilans et la photo de la carte de priorité sont désormais inclus, avec confirmation avant toute restauration.',
      'Traitements oraux (Imurel, Rinvoq…) : plus de zone d’injection ni de stock de stylos.',
      'Dose correcte pour chaque traitement et courbe « fin de dose » adaptée à la durée de votre cycle.',
      'Bilans : normes selon le sexe, lecture des PDF plus fiable (date de naissance ignorée, unités converties).',
      'Rappels à l’heure de votre choix, zoom autorisé, application plus légère et plus rapide à ouvrir.',
    ],
  },
  {
    version: '1.2 — 17 nov.',
    items: [
      'Combothérapie : possibilité d’ajouter un 2e traitement (ex : Humira + Méthotrexate, Infliximab + Imurel) dans Paramètres et sur le Calendrier.',
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
  { name: 'Imurel / Azathioprine', cycleDays: 1, isOral: true },
  { name: 'Rinvoq (comprimé)', cycleDays: 1, isOral: true },
]
