export type InjectionSite =
  | 'cuisse_gauche'
  | 'cuisse_droite'
  | 'ventre_gauche'
  | 'ventre_droite'

export const INJECTION_SITES: {
  id: InjectionSite
  label: string
  shortLabel: string
  zone: 'Cuisse' | 'Ventre'
  side: 'Gauche' | 'Droite'
}[] = [
  { id: 'cuisse_gauche', label: 'Cuisse gauche', shortLabel: 'Cuisse G', zone: 'Cuisse', side: 'Gauche' },
  { id: 'cuisse_droite', label: 'Cuisse droite', shortLabel: 'Cuisse D', zone: 'Cuisse', side: 'Droite' },
  { id: 'ventre_gauche', label: 'Ventre gauche', shortLabel: 'Ventre G', zone: 'Ventre', side: 'Gauche' },
  { id: 'ventre_droite', label: 'Ventre droite', shortLabel: 'Ventre D', zone: 'Ventre', side: 'Droite' },
]

/** Zones d'injection que la personne souhaite utiliser pour la rotation */
export type InjectionZonePreference = 'all' | 'cuisse' | 'ventre'

export const INJECTION_ZONE_OPTIONS: { id: InjectionZonePreference; label: string }[] = [
  { id: 'all', label: 'Toutes les zones (Ventre & Cuisses)' },
  { id: 'cuisse', label: 'Cuisses uniquement (Cuisse gauche / Cuisse droite)' },
  { id: 'ventre', label: 'Ventre uniquement (Ventre gauche / Ventre droit)' },
]

export type InjectionStatus = 'planned' | 'done' | 'shifted'

export interface InjectionRecord {
  id?: number
  scheduledDate: string // YYYY-MM-DD
  actualDate?: string // YYYY-MM-DD
  status: InjectionStatus
  site?: InjectionSite
  doseMg: number // 0 = dose inconnue (non affichée)
  shiftDays?: number
  shiftReason?: string
  notes?: string
  createdAt: string
}

export type StoolConsistency = 'normale' | 'molle' | 'liquide' | 'dure'
export type MoodLevel = 'serein' | 'moyen' | 'anxieux' | 'difficile'
export type SleepQuality = 'bon' | 'moyen' | 'mauvais'

export interface DailyEntry {
  date: string // YYYY-MM-DD (primary key)
  digestivePain: number // 0 to 5
  jointPain: number // 0 to 5
  fatigue: number // 0 to 5
  migraine?: number // 0 to 5
  feverOrInfection: boolean
  stoolCount?: number
  stoolConsistency?: StoolConsistency
  nocturnalStools?: boolean
  bloodInStools?: boolean
  mood?: MoodLevel
  sleepQuality?: SleepQuality
  waterGlasses?: number
  suspectedFoods?: string[]
  tags: string[]
  notes: string
  updatedAt: string
}

export const QUICK_TAGS = [
  'Écart alimentaire',
  'Stress',
  'Manque de sommeil',
  'Fin de dose',
  'Virus / Rhume',
  'Antibiotiques',
  'Hydratation faible',
  'Activité physique',
] as const

export const SUSPECTED_FOOD_PRESETS = [
  'Lactose / Lait',
  'Crudités / Fibres',
  'Épicé',
  'Café',
  'Gras / Frit',
  'Sucre',
  'Alcool',
  'Gluten / Blé',
] as const

export interface LabResult {
  id?: number
  date: string // YYYY-MM-DD
  crp?: number // mg/L
  calprotectin?: number // µg/g
  alat?: number // U/L
  asat?: number // U/L
  ggt?: number // U/L
  leukocytes?: number // G/L
  erythrocytes?: number // T/L
  vgm?: number // fL
  notes?: string
  pdfFileName?: string
  pdfBlob?: Blob
  createdAt: string
}

export interface AppSettings {
  id: string // 'default'
  treatmentName: string
  cycleDays: number
  lastInjectionDate?: string
  lastInjectionSite?: InjectionSite
  /** Zones utilisées pour la rotation (absent = toutes les zones) */
  injectionZones?: InjectionZonePreference
  reminderDayBefore: boolean
  reminderSameDay: boolean
  reminderHour: string
  theme: 'light' | 'dark'
  onboardingCompleted: boolean
  penStock?: number
  nextDoctorAppointment?: string
  nextLabDate?: string
  doctorName?: string
  doctorPhone?: string
  patientName?: string
  bloodGroup?: string
  allergies?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  emergencyNotes?: string
  priorityCardBlob?: Blob
  priorityCardName?: string
  secondaryTreatmentName?: string
  secondaryCycleDays?: number
  secondaryNextDate?: string
  /** Sexe biologique : sert uniquement à choisir les valeurs de référence des bilans */
  patientSex?: PatientSex
}

export type PatientSex = 'F' | 'M'

export type AppTab = 'calendar' | 'journal' | 'labs' | 'report'
