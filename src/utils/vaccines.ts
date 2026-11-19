import type { VaccinationRecord } from '../types'
import { addDays, diffDays } from './dateUtils'

/**
 * Vaccins habituellement recommandés aux personnes atteintes de MICI, en particulier
 * sous immunosuppresseurs ou biothérapie. Informations générales : le calendrier
 * exact se décide toujours avec le médecin.
 */
export type VaccineRule =
  | { kind: 'seasonal' } // chaque automne
  | { kind: 'once' } // une seule dose (ou schéma décidé par le médecin)
  | { kind: 'doses'; count: number; intervalDays: number } // schéma en plusieurs doses
  | { kind: 'every'; years: number } // rappel régulier

export interface VaccinePreset {
  id: string
  name: string
  advice: string
  rule: VaccineRule
}

export const VACCINE_PRESETS: VaccinePreset[] = [
  {
    id: 'grippe',
    name: 'Grippe',
    advice: 'Chaque automne (campagne d’octobre à février).',
    rule: { kind: 'seasonal' },
  },
  {
    id: 'covid',
    name: 'Covid-19',
    advice: 'Rappel chaque automne pour les personnes sous traitement immunosuppresseur.',
    rule: { kind: 'seasonal' },
  },
  {
    id: 'pneumocoque',
    name: 'Pneumocoque',
    advice: 'Recommandé sous immunosuppresseurs. Le schéma dépend des vaccins déjà reçus.',
    rule: { kind: 'once' },
  },
  {
    id: 'zona',
    name: 'Zona (Shingrix)',
    advice: 'Vaccin non vivant, 2 doses à 2 mois d’intervalle, recommandé dès 18 ans sous immunosuppresseurs.',
    rule: { kind: 'doses', count: 2, intervalDays: 60 },
  },
  {
    id: 'dtp',
    name: 'Diphtérie-Tétanos-Polio',
    advice: 'Rappel tous les 10 ans sous traitement immunosuppresseur.',
    rule: { kind: 'every', years: 10 },
  },
  {
    id: 'hepatite_b',
    name: 'Hépatite B',
    advice: 'À vérifier par une prise de sang (sérologie) avant ou pendant le traitement.',
    rule: { kind: 'once' },
  },
]

/** Vaccins vivants atténués : contre-indiqués sous immunosuppresseurs ou biothérapie. */
export const LIVE_VACCINES = [
  'Fièvre jaune',
  'ROR (rougeole, oreillons, rubéole)',
  'Varicelle',
  'BCG (tuberculose)',
  'Typhoïde par voie orale',
  'Rotavirus',
]

export type VaccineStatusTone = 'ok' | 'todo' | 'info'

export interface VaccineStatus {
  tone: VaccineStatusTone
  text: string
  lastDate?: string
}

/** Début de la saison de vaccination (1er septembre) qui contient la date donnée. */
export function getSeasonStart(todayKey: string): string {
  const year = Number(todayKey.slice(0, 4))
  const month = Number(todayKey.slice(5, 7))
  return `${month >= 9 ? year : year - 1}-09-01`
}

function addYears(key: string, years: number): string {
  return `${Number(key.slice(0, 4)) + years}${key.slice(4)}`
}

export function getVaccineStatus(
  preset: VaccinePreset,
  records: VaccinationRecord[],
  todayKey: string,
): VaccineStatus {
  const doses = records
    .filter((r) => r.vaccine === preset.name && r.date <= todayKey)
    .sort((a, b) => a.date.localeCompare(b.date))
  const last = doses[doses.length - 1]?.date
  const rule = preset.rule

  if (rule.kind === 'seasonal') {
    const seasonStart = getSeasonStart(todayKey)
    if (last && last >= seasonStart) return { tone: 'ok', text: 'Fait cette saison', lastDate: last }
    const month = Number(todayKey.slice(5, 7))
    const inCampaign = month >= 10 || month <= 2
    return inCampaign
      ? { tone: 'todo', text: 'À faire cette saison', lastDate: last }
      : { tone: 'info', text: 'Prochaine campagne en octobre', lastDate: last }
  }

  if (rule.kind === 'doses') {
    if (doses.length >= rule.count) return { tone: 'ok', text: 'Schéma complet', lastDate: last }
    if (doses.length === 0) return { tone: 'todo', text: 'À discuter avec le médecin' }
    const due = addDays(last!, rule.intervalDays)
    const daysLeft = diffDays(todayKey, due)
    return {
      tone: daysLeft <= 0 ? 'todo' : 'info',
      text:
        daysLeft <= 0
          ? `Dose ${doses.length + 1} à faire`
          : `Dose ${doses.length + 1} vers le ${due.slice(8, 10)}/${due.slice(5, 7)}/${due.slice(0, 4)}`,
      lastDate: last,
    }
  }

  if (rule.kind === 'every') {
    if (!last) return { tone: 'todo', text: 'Date du dernier rappel inconnue' }
    const due = addYears(last, rule.years)
    if (due <= todayKey) return { tone: 'todo', text: 'Rappel à faire', lastDate: last }
    return { tone: 'ok', text: `Prochain rappel en ${due.slice(0, 4)}`, lastDate: last }
  }

  return last
    ? { tone: 'ok', text: 'Fait', lastDate: last }
    : { tone: 'todo', text: 'À discuter avec le médecin' }
}
