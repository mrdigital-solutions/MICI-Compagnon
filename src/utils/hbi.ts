import type { DailyEntry } from '../types'

/**
 * Score de Harvey-Bradshaw (HBI) estimé à partir du journal du jour.
 *
 * Le score officiel additionne :
 * - état général (0 très bon → 4 terrible)
 * - douleurs abdominales (0 aucune → 3 sévères)
 * - nombre de selles liquides ou molles de la veille
 * - masse abdominale (0 → 3) : examen médical, impossible à évaluer seul → compté 0
 * - 1 point par complication : douleurs articulaires, uvéite, érythème noueux, aphtes,
 *   pyoderma gangrenosum, fissure anale, nouvelle fistule, abcès
 *
 * C'est une estimation indicative : elle ne remplace pas l'évaluation du médecin.
 */

/** Curseur « Fatigue / état général » 0–5 → état général HBI 0–4 */
const WELLBEING_FROM_FATIGUE = [0, 1, 1, 2, 3, 4]
/** Curseur « Douleurs digestives » 0–5 → douleurs abdominales HBI 0–3 */
const PAIN_FROM_DIGESTIVE = [0, 1, 1, 2, 3, 3]

export interface HbiResult {
  score: number
  wellbeing: number
  abdominalPain: number
  liquidStools: number
  complications: number
}

function clampIndex(value: number, max: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(max, Math.max(0, Math.round(value)))
}

export function computeHbi(
  entry: Pick<
    DailyEntry,
    'fatigue' | 'digestivePain' | 'jointPain' | 'stoolCount' | 'stoolConsistency' | 'crohnSigns'
  >,
): HbiResult {
  const wellbeing = WELLBEING_FROM_FATIGUE[clampIndex(entry.fatigue, 5)]
  const abdominalPain = PAIN_FROM_DIGESTIVE[clampIndex(entry.digestivePain, 5)]
  const isLoose = entry.stoolConsistency === 'liquide' || entry.stoolConsistency === 'molle'
  const liquidStools = isLoose ? Math.max(0, Math.round(entry.stoolCount ?? 0)) : 0
  const complications =
    (entry.jointPain > 0 ? 1 : 0) + new Set(entry.crohnSigns ?? []).size

  return {
    score: wellbeing + abdominalPain + liquidStools + complications,
    wellbeing,
    abdominalPain,
    liquidStools,
    complications,
  }
}

export type HbiLevel = 'remission' | 'legere' | 'moderee' | 'severe'

export function getHbiLevel(score: number): { level: HbiLevel; label: string } {
  if (score < 5) return { level: 'remission', label: 'Rémission' }
  if (score <= 7) return { level: 'legere', label: 'Activité légère' }
  if (score <= 16) return { level: 'moderee', label: 'Activité modérée' }
  return { level: 'severe', label: 'Activité sévère' }
}

export const HBI_LEVEL_STYLES: Record<HbiLevel, string> = {
  remission: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  legere: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  moderee: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  severe: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
}
