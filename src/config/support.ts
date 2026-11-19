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

export const APP_VERSION = '1.5.0'

export const COPYRIGHT = '© 2026 MR Digital Solutions'

export const CHANGELOG = [
  {
    version: '1.5 — 20 nov.',
    items: [
      'Suivi du poids : notez votre poids dans le journal, le Rapport Médecin affiche son évolution et signale une perte de 5 % ou plus.',
      'Score de Harvey-Bradshaw : calculé automatiquement à partir du journal (avec les nouveaux « Autres signes » : aphtes, fissure, fistule…), avec sa courbe dans le Rapport.',
      'Carnet de vaccination (onglet Bilans) : grippe, Covid, pneumocoque, zona, DTP, hépatite B, avec les rappels à faire et la liste des vaccins vivants interdits sous traitement.',
      'Décaler une injection : on peut maintenant l’avancer, pas seulement la reporter. Une injection en retard ne peut plus être reportée à une date déjà passée.',
      'Paramètres : stock de stylos et prochains rendez-vous mieux présentés.',
    ],
  },
  {
    version: '1.4.2 — 19 nov.',
    items: [
      'Installation plus simple : le bandeau « Installer » s’affiche maintenant sur tous les téléphones, avec la marche à suivre adaptée (iPhone, Android, ou lien ouvert depuis Facebook / Instagram).',
      'Paramètres : nouveau bouton « Comment installer l’application ? » qui explique pas à pas l’installation sur Android, sur iPhone et depuis Facebook / Instagram.',
      'Notifications : si elles sont bloquées, les Paramètres expliquent maintenant comment les réactiver (navigateur, Android, iPhone), et l’état se met à jour tout seul au retour dans l’application.',
    ],
  },
  {
    version: '1.4 — 18 nov.',
    items: [
      'Zones d’injection préférées (Paramètres) : toutes les zones, cuisses uniquement ou ventre uniquement. La rotation suggérée respecte votre choix.',
      'Carte Urgence : l’onglet s’appelle désormais « Toilettes & Priorité » : il contient le message d’accès aux toilettes et la photo de votre carte de priorité (CMI ou carte AFA).',
      'Enregistrement plus fiable : plus de bouton bloqué sur « Enregistrement… ». Un message clair s’affiche si l’app doit être fermée puis rouverte.',
      'Au programme aujourd’hui : à l’ouverture, un rappel de ce qui est prévu dans la journée (injection, prise, rendez-vous).',
      'Nouvelle icône et nouveau logo, plus lisibles sur l’écran d’accueil.',
    ],
  },
  {
    version: '1.3 — 18 nov.',
    items: [
      'Sauvegarde complète : les PDF des bilans et la photo de la carte de priorité sont désormais inclus, avec confirmation avant toute restauration.',
      'Traitements oraux (Imurel, Rinvoq…) : plus de zone d’injection ni de stock de stylos.',
      'Dose correcte pour chaque traitement et courbe « fin de dose » adaptée à la durée de votre cycle.',
      'Bilans : normes selon le sexe, lecture des PDF plus fiable (date de naissance ignorée, unités converties).',
      'Rappels à l’heure de votre choix, zoom autorisé, application plus légère et plus rapide à ouvrir.',
      'Première ouverture : même choix du traitement que dans les Paramètres, avec un 2e traitement optionnel (combothérapie) juste en dessous.',
      'Au premier bilan, choix Femme / Homme (facultatif) pour comparer vos résultats aux bonnes normes.',
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
