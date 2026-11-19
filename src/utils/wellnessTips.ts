import type { AppSettings, DailyEntry, InjectionRecord } from '../types'
import { addDays, diffDays } from './dateUtils'
import { isOralTreatment } from './treatment'
import { VACCINE_PRESETS, getVaccineStatus } from './vaccines'

/** Illustration : une photo de /public/tips, ou une icône quand aucune photo ne correspond. */
export type TipVisual =
  | { kind: 'image'; src: string }
  | {
      kind: 'icon'
      icon:
        | 'walk'
        | 'sun'
        | 'smoke'
        | 'heart'
        | 'shield'
        | 'pill'
        | 'bone'
        | 'briefcase'
        | 'users'
        | 'baby'
        | 'alert'
        | 'blood'
        | 'scale'
        | 'calendar'
    }

export type TipTone = 'teal' | 'sky' | 'amber' | 'indigo' | 'emerald' | 'violet' | 'rose' | 'orange'

export interface WellnessTip {
  id: string
  category: string
  text: string
  visual: TipVisual
  tone: TipTone
  /** Conseil choisi d'après les données de la personne */
  personal?: boolean
}

const img = (name: string): TipVisual => ({ kind: 'image', src: `./tips/${name}.jpg` })
const icon = (name: Extract<TipVisual, { kind: 'icon' }>['icon']): TipVisual => ({
  kind: 'icon',
  icon: name,
})

export const GENERAL_TIPS: WellnessTip[] = [
  {
    id: 'stylo-frigo',
    category: 'Biothérapie',
    text: 'Sortez votre stylo du réfrigérateur 15 à 30 min avant l’injection : un produit à température ambiante pique moins.',
    visual: img('biotherapie'),
    tone: 'teal',
  },
  {
    id: 'rotation-sites',
    category: 'Injection',
    text: 'Changez de site à chaque injection et piquez à au moins 3 cm du point précédent. Évitez les zones rouges, dures ou abîmées, et 5 cm autour du nombril.',
    visual: img('biotherapie'),
    tone: 'teal',
  },
  {
    id: 'stylo-hors-frigo',
    category: 'Biothérapie',
    text: 'Selon le traitement, un stylo peut rester un certain temps hors du frigo (sans dépasser 25 °C). La durée exacte est indiquée dans la notice : vérifiez-la avant un voyage.',
    visual: img('voyage'),
    tone: 'teal',
  },
  {
    id: 'hydratation-gorgees',
    category: 'Hydratation',
    text: 'Buvez par petites gorgées tout au long de la journée. En cas de selles liquides, pensez aux bouillons salés ou aux tisanes de camomille.',
    visual: img('hydratation'),
    tone: 'sky',
  },
  {
    id: 'boissons-ballonnements',
    category: 'Hydratation',
    text: 'Limitez les boissons gazeuses, très froides ou très sucrées si vous avez des ballonnements : préférez l’eau tempérée ou les infusions.',
    visual: img('hydratation'),
    tone: 'sky',
  },
  {
    id: 'repas-fractionnes',
    category: 'Alimentation',
    text: 'En période sensible, fractionnez en 4 à 5 petits repas, mâchez lentement et privilégiez les légumes bien cuits.',
    visual: img('alimentation'),
    tone: 'amber',
  },
  {
    id: 'alimentation-douce',
    category: 'Alimentation douce',
    text: 'En cas d’inconfort digestif, le riz blanc, la banane mûre, les carottes cuites et les compotes sans sucre ajouté sont souvent bien tolérés.',
    visual: img('alimentation'),
    tone: 'amber',
  },
  {
    id: 'remission-reintroduire',
    category: 'Rémission',
    text: 'Hors poussée, évitez de garder un régime trop strict : réintroduisez les aliments un par un en observant votre tolérance dans le Journal.',
    visual: img('alimentation'),
    tone: 'emerald',
  },
  {
    id: 'respiration',
    category: 'Stress & Ventre',
    text: 'Le stress peut accentuer les douleurs. 3 minutes de respiration lente (bouton Calme en haut) aident à relâcher les tensions.',
    visual: img('stress'),
    tone: 'indigo',
  },
  {
    id: 'sommeil-regulier',
    category: 'Sommeil',
    text: 'Se coucher et se lever à heures régulières aide à mieux récupérer et à limiter la fatigue, fréquente avec une MICI.',
    visual: img('sommeil'),
    tone: 'violet',
  },
  {
    id: 'fievre-injection',
    category: 'Prévention',
    text: 'En cas de fièvre ou d’infection, demandez l’avis de votre médecin avant de faire l’injection : il peut être nécessaire de la décaler.',
    visual: icon('alert'),
    tone: 'rose',
  },
  {
    id: 'signes-poussee',
    category: 'Poussée',
    text: 'Sang dans les selles, fièvre, douleurs inhabituelles ou selles la nuit : contactez votre équipe soignante sans attendre le prochain rendez-vous.',
    visual: icon('alert'),
    tone: 'rose',
  },
  {
    id: 'anti-inflammatoires',
    category: 'Médicaments',
    text: 'Les anti-inflammatoires (ibuprofène, kétoprofène…) peuvent déclencher une poussée. Pour une douleur ou de la fièvre, demandez d’abord conseil à votre médecin ou pharmacien.',
    visual: icon('pill'),
    tone: 'orange',
  },
  {
    id: 'corticoides',
    category: 'Médicaments',
    text: 'Ne jamais arrêter brutalement des corticoïdes : la diminution doit se faire progressivement, selon le schéma donné par le médecin.',
    visual: icon('pill'),
    tone: 'orange',
  },
  {
    id: 'voyage-isotherme',
    category: 'Voyage',
    text: 'En déplacement, transportez vos stylos dans une pochette isotherme (sans contact direct avec le pain de glace) et gardez l’ordonnance avec vous.',
    visual: img('voyage'),
    tone: 'teal',
  },
  {
    id: 'voyage-vaccins',
    category: 'Voyage',
    text: 'Avant un voyage lointain, consultez tôt : certains vaccins de voyage (fièvre jaune notamment) sont interdits sous traitement immunosuppresseur.',
    visual: img('voyage'),
    tone: 'teal',
  },
  {
    id: 'soleil-peau',
    category: 'Soleil & Peau',
    text: 'L’azathioprine (Imurel) et, dans une moindre mesure, les anti-TNF augmentent le risque de cancer de la peau : crème SPF 50, pas d’exposition aux heures chaudes, et un contrôle chez le dermatologue chaque année.',
    visual: icon('sun'),
    tone: 'orange',
  },
  {
    id: 'mouvement-doux',
    category: 'Mouvement doux',
    text: 'Une marche de 15 à 20 minutes par jour ou des étirements doux soulagent les raideurs articulaires et aident le moral.',
    visual: icon('walk'),
    tone: 'emerald',
  },
  {
    id: 'vaccins-vivants',
    category: 'Vaccins',
    text: 'Sous biothérapie ou immunosuppresseur, les vaccins vivants sont interdits. Tenez votre carnet à jour dans l’onglet Bilans.',
    visual: icon('shield'),
    tone: 'rose',
  },
  {
    id: 'fer-b12',
    category: 'Fatigue',
    text: 'Une fatigue qui dure peut venir d’un manque de fer, de vitamine B12 ou de vitamine D. Demandez si un dosage est utile lors de la prochaine prise de sang.',
    visual: icon('blood'),
    tone: 'violet',
  },
  {
    id: 'os-calcium',
    category: 'Os',
    text: 'Les corticoïdes répétés et une alimentation pauvre en calcium fragilisent les os. Parlez de calcium et vitamine D avec votre médecin si vous en avez souvent pris.',
    visual: icon('bone'),
    tone: 'amber',
  },
  {
    id: 'tabac',
    category: 'Tabac & Crohn',
    text: 'Dans la maladie de Crohn, arrêter le tabac diminue nettement les poussées et améliore l’efficacité du traitement. Le 39 89 (Tabac Info Service) peut vous accompagner.',
    visual: icon('smoke'),
    tone: 'amber',
  },
  {
    id: 'ald',
    category: 'Droits',
    text: 'La maladie de Crohn et la RCH peuvent être reconnues en ALD (affection de longue durée), avec une prise en charge à 100 % des soins liés. Votre médecin traitant fait la demande.',
    visual: icon('briefcase'),
    tone: 'indigo',
  },
  {
    id: 'travail',
    category: 'Travail',
    text: 'Le médecin du travail peut proposer des aménagements (accès aux toilettes, horaires, télétravail). La RQTH peut aussi faciliter ces démarches.',
    visual: icon('briefcase'),
    tone: 'indigo',
  },
  {
    id: 'association',
    category: 'Soutien',
    text: 'Vous n’êtes pas seul(e) : l’afa Crohn RCH France propose écoute, informations et rencontres entre patients.',
    visual: icon('users'),
    tone: 'emerald',
  },
  {
    id: 'grossesse',
    category: 'Projet de grossesse',
    text: 'Un projet de grossesse se prépare avec le gastro-entérologue : la plupart des traitements se poursuivent, mais certains (méthotrexate) doivent être arrêtés bien avant.',
    visual: icon('baby'),
    tone: 'violet',
  },
  {
    id: 'journal-declencheurs',
    category: 'Écoute de soi',
    text: 'Notez vos repas et vos émotions dans le Journal : au fil des semaines, cela aide à repérer vos propres déclencheurs.',
    visual: img('stress'),
    tone: 'indigo',
  },
  {
    id: 'moral',
    category: 'Moral',
    text: 'Les jours difficiles ne durent pas toujours : avancez un jour à la fois, et appuyez-vous sur le Rapport pour en parler avec votre médecin.',
    visual: icon('heart'),
    tone: 'teal',
  },
]

export interface TipContext {
  today: string
  settings?: AppSettings
  injections?: InjectionRecord[]
  dailyEntries?: DailyEntry[]
}

/**
 * Conseils choisis selon la situation (injection proche, symptômes récents, vaccins…).
 * Ils passent avant les conseils généraux. Ordre = priorité.
 */
export function getPersonalTips({ today, settings, injections = [], dailyEntries = [] }: TipContext): WellnessTip[] {
  const tips: WellnessTip[] = []
  if (!settings) return tips
  const oral = isOralTreatment(settings.treatmentName)
  const yesterday = addDays(today, -1)
  const recent = dailyEntries.filter((e) => e.date === today || e.date === yesterday)

  const nextInjection = injections
    .filter((i) => i.status === 'planned' && i.scheduledDate >= today)
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0]
  const daysToInjection = nextInjection ? diffDays(today, nextInjection.scheduledDate) : undefined

  // 1. Fièvre récente avec injection proche
  if (recent.some((e) => e.feverOrInfection) && daysToInjection !== undefined && daysToInjection <= 3 && !oral) {
    tips.push({
      id: 'p-fievre',
      category: 'Avant l’injection',
      text: 'Vous avez noté de la fièvre ou une infection et l’injection approche : demandez l’avis de votre médecin avant de la faire. Vous pourrez la décaler depuis le calendrier.',
      visual: icon('alert'),
      tone: 'rose',
      personal: true,
    })
  }

  // 2. Signes de poussée notés
  if (recent.some((e) => e.bloodInStools || e.nocturnalStools)) {
    tips.push({
      id: 'p-poussee',
      category: 'À surveiller',
      text: 'Vous avez noté du sang ou des selles la nuit. Si cela continue ou s’accompagne de fièvre ou de douleurs, contactez votre équipe soignante.',
      visual: icon('alert'),
      tone: 'rose',
      personal: true,
    })
  }

  // 3. Injection aujourd'hui ou demain
  if (!oral && (daysToInjection === 0 || daysToInjection === 1)) {
    tips.push({
      id: 'p-stylo',
      category: daysToInjection === 0 ? 'Injection aujourd’hui' : 'Injection demain',
      text: 'Pensez à sortir le stylo du réfrigérateur 15 à 30 min avant, et à changer de site par rapport à la dernière fois.',
      visual: img('biotherapie'),
      tone: 'teal',
      personal: true,
    })
  }

  // 4. Selles liquides ou nombreuses
  if (recent.some((e) => e.stoolConsistency === 'liquide' || (e.stoolCount ?? 0) >= 5)) {
    tips.push({
      id: 'p-hydratation',
      category: 'Hydratation',
      text: 'Avec des selles liquides, on perd de l’eau et du sel : buvez régulièrement, bouillons salés compris. Fatigue intense ou vertiges : consultez.',
      visual: img('hydratation'),
      tone: 'sky',
      personal: true,
    })
  }

  // 5. Douleurs digestives marquées
  if (recent.some((e) => e.digestivePain >= 3)) {
    tips.push({
      id: 'p-alimentation',
      category: 'Ventre sensible',
      text: 'Ventre douloureux ces jours-ci : petits repas, aliments bien cuits (riz, carottes, compote) et notez ce que vous mangez dans le Journal.',
      visual: img('alimentation'),
      tone: 'amber',
      personal: true,
    })
  }

  // 6. Moral difficile
  if (recent.some((e) => e.mood === 'anxieux' || e.mood === 'difficile')) {
    tips.push({
      id: 'p-moral',
      category: 'Prendre soin de soi',
      text: 'Journée difficile ? Essayez 3 minutes de respiration avec le bouton Calme. Si cela dure, en parler à votre médecin peut vraiment aider.',
      visual: img('stress'),
      tone: 'indigo',
      personal: true,
    })
  }

  // 7. Fatigue forte
  if (recent.some((e) => e.fatigue >= 4)) {
    tips.push({
      id: 'p-fatigue',
      category: 'Fatigue',
      text: 'Grosse fatigue : accordez-vous des pauses, et si elle dure, demandez un dosage du fer et de la vitamine B12 à la prochaine prise de sang.',
      visual: img('sommeil'),
      tone: 'violet',
      personal: true,
    })
  }

  // 8. Perte de poids sur 30 jours
  const weights = dailyEntries
    .filter((e) => typeof e.weightKg === 'number' && e.date >= addDays(today, -30) && e.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date))
  if (weights.length >= 2) {
    const first = weights[0].weightKg!
    const last = weights[weights.length - 1].weightKg!
    if ((last - first) / first <= -0.05) {
      tips.push({
        id: 'p-poids',
        category: 'Poids',
        text: `Vous avez perdu ${Math.round((first - last) * 10) / 10} kg en un mois. Une perte de 5 % ou plus est à signaler à votre gastro-entérologue.`,
        visual: icon('scale'),
        tone: 'rose',
        personal: true,
      })
    }
  }

  // 9. Stock de stylos bas
  if (!oral && settings.penStock !== undefined && settings.penStock <= 1) {
    tips.push({
      id: 'p-stock',
      category: 'Stock',
      text:
        settings.penStock === 0
          ? 'Plus aucun stylo en stock : pensez à passer à la pharmacie avec votre ordonnance.'
          : 'Il ne reste qu’un stylo : pensez à commander les suivants à la pharmacie.',
      visual: img('biotherapie'),
      tone: 'amber',
      personal: true,
    })
  }

  // 10. RDV gastro dans les 7 jours
  if (settings.nextDoctorAppointment) {
    const d = diffDays(today, settings.nextDoctorAppointment)
    if (d >= 0 && d <= 7) {
      tips.push({
        id: 'p-rdv',
        category: 'RDV gastro',
        text: `Rendez-vous ${d === 0 ? 'aujourd’hui' : d === 1 ? 'demain' : `dans ${d} jours`} : préparez le Rapport (onglet Rapport) pour montrer l’évolution de vos symptômes.`,
        visual: icon('calendar'),
        tone: 'teal',
        personal: true,
      })
    }
  }

  // 11. Prise de sang dans les 2 jours
  if (settings.nextLabDate) {
    const d = diffDays(today, settings.nextLabDate)
    if (d >= 0 && d <= 2) {
      tips.push({
        id: 'p-prise-sang',
        category: 'Prise de sang',
        text: 'Prise de sang bientôt : buvez de l’eau avant, et restez à jeun seulement si l’ordonnance le précise. Importez ensuite le PDF dans l’onglet Bilans.',
        visual: icon('blood'),
        tone: 'violet',
        personal: true,
      })
    }
  }

  // 12. Grippe de la saison non faite pendant la campagne
  const flu = VACCINE_PRESETS.find((p) => p.id === 'grippe')
  if (flu && getVaccineStatus(flu, settings.vaccinations ?? [], today).tone === 'todo') {
    tips.push({
      id: 'p-grippe',
      category: 'Vaccin grippe',
      text: 'C’est la saison du vaccin contre la grippe, recommandé sous traitement. Une fois fait, notez-le dans le carnet (onglet Bilans).',
      visual: icon('shield'),
      tone: 'emerald',
      personal: true,
    })
  }

  return tips
}

/** Ordre d'affichage : conseils personnels, puis conseils généraux à partir du « conseil du jour ». */
export function buildTipSequence(context: TipContext): WellnessTip[] {
  const personal = getPersonalTips(context)
  const dayNumber = Math.floor(Date.parse(`${context.today}T12:00:00Z`) / 86_400_000)
  const start = ((dayNumber % GENERAL_TIPS.length) + GENERAL_TIPS.length) % GENERAL_TIPS.length
  const general = [...GENERAL_TIPS.slice(start), ...GENERAL_TIPS.slice(0, start)]
  return [...personal, ...general]
}

export const TIP_TONE_CLASSES: Record<TipTone, { badge: string; tile: string }> = {
  teal: {
    badge: 'bg-teal-500/15 text-teal-700 dark:text-teal-300',
    tile: 'bg-teal-500/15 text-teal-600 dark:text-teal-300',
  },
  sky: {
    badge: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
    tile: 'bg-sky-500/15 text-sky-600 dark:text-sky-300',
  },
  amber: {
    badge: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
    tile: 'bg-amber-500/15 text-amber-600 dark:text-amber-300',
  },
  indigo: {
    badge: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
    tile: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300',
  },
  emerald: {
    badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    tile: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
  },
  violet: {
    badge: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
    tile: 'bg-violet-500/15 text-violet-600 dark:text-violet-300',
  },
  rose: {
    badge: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
    tile: 'bg-rose-500/15 text-rose-600 dark:text-rose-300',
  },
  orange: {
    badge: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
    tile: 'bg-orange-500/15 text-orange-600 dark:text-orange-300',
  },
}
