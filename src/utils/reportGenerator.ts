import { COPYRIGHT } from '../config/support'
import { getSiteLabel } from '../db/database'
import type { AppSettings, DailyEntry, InjectionRecord, LabResult } from '../types'
import { diffDays, formatDateFr, formatShortDateFr } from './dateUtils'
import { LAB_MARKERS, getMarkerRange, isMarkerOutOfRange, type LabMarkerMeta } from './labParser'
import { isOralTreatment } from './treatment'

export interface PeakDayInfo {
  date: string
  maxScore: number
  details: string[]
  isEndOfCycle: boolean
}

export interface LabComparisonItem {
  meta: LabMarkerMeta
  latestValue: number
  latestDate: string
  previousValue?: number
  previousDate?: string
  outOfRange: boolean
  refText: string
}

export interface EndOfDoseBucket {
  label: string
  avgScore: number
  daysCount: number
}

export interface MedicalReportSummary {
  startDate: string
  endDate: string
  treatmentName: string
  isOral: boolean
  cycleDays: number
  doneInjections: InjectionRecord[]
  shiftedInjections: InjectionRecord[]
  totalLoggedDays: number
  digestiveDays: number
  jointDays: number
  fatigueDays: number
  migraineDays: number
  feverDays: number
  virusDays: number
  antibioticDays: number
  avgDigestive: number
  avgJoint: number
  avgFatigue: number
  avgMigraine: number
  avgStoolCount: number
  liquidStoolDays: number
  nocturnalStoolDays: number
  bloodStoolDays: number
  endOfDoseCurve: EndOfDoseBucket[]
  peakDays: PeakDayInfo[]
  topSuspectedFoods: { food: string; count: number }[]
  topTags: { tag: string; count: number }[]
  labComparisons: LabComparisonItem[]
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function dayLabel(n: number): string {
  return n === 0 ? 'Jour J' : `J-${n}`
}

/**
 * Découpe le cycle en 4 tranches de « jours restants avant la prochaine prise ».
 * Ex. cycle 14 j : J-13 et avant / J-10 à J-7 / J-6 à J-4 / J-3 à Jour J.
 * Pour un cycle de moins de 4 jours (traitement quotidien), la courbe n'a pas de sens.
 */
export function buildEndOfDoseBuckets(
  cycleDays: number,
): { label: string; min: number; max: number }[] {
  if (!Number.isFinite(cycleDays) || cycleDays < 4) return []
  const e1 = Math.round(cycleDays * 0.25)
  const e2 = Math.round(cycleDays * 0.5)
  const e3 = Math.round(cycleDays * 0.75)
  return [
    { label: `${dayLabel(e3)} et avant`, min: e3, max: Number.POSITIVE_INFINITY },
    { label: `${dayLabel(e3 - 1)} à ${dayLabel(e2)}`, min: e2, max: e3 - 1 },
    { label: `${dayLabel(e2 - 1)} à ${dayLabel(e1)}`, min: e1, max: e2 - 1 },
    { label: `${dayLabel(e1 - 1)} à Jour J`, min: 0, max: e1 - 1 },
  ]
}

export function buildMedicalReport(params: {
  startDate: string
  endDate: string
  settings: AppSettings
  injections: InjectionRecord[]
  dailyEntries: DailyEntry[]
  labResults: LabResult[]
}): MedicalReportSummary {
  const { startDate, endDate, settings, injections, dailyEntries, labResults } = params

  const doneInjections = injections
    .filter((inj) => {
      if (inj.status !== 'done') return false
      const d = inj.actualDate ?? inj.scheduledDate
      return d >= startDate && d <= endDate
    })
    .sort((a, b) => (a.actualDate ?? a.scheduledDate).localeCompare(b.actualDate ?? b.scheduledDate))

  const shiftedInjections = injections
    .filter(
      (inj) =>
        inj.status === 'shifted' &&
        inj.scheduledDate >= startDate &&
        inj.scheduledDate <= endDate,
    )
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))

  const periodEntries = dailyEntries
    .filter((e) => e.date >= startDate && e.date <= endDate)
    .sort((a, b) => a.date.localeCompare(b.date))

  const totalLoggedDays = periodEntries.length
  const digestiveDays = periodEntries.filter((e) => e.digestivePain > 0).length
  const jointDays = periodEntries.filter((e) => e.jointPain > 0).length
  const fatigueDays = periodEntries.filter((e) => e.fatigue > 0).length
  const migraineDays = periodEntries.filter((e) => (e.migraine ?? 0) > 0).length
  const feverDays = periodEntries.filter((e) => e.feverOrInfection).length
  const virusDays = periodEntries.filter((e) =>
    e.tags.some((t) => t.toLowerCase().includes('virus') || t.toLowerCase().includes('rhume')),
  ).length
  const antibioticDays = periodEntries.filter((e) =>
    e.tags.some((t) => t.toLowerCase().includes('antibio')),
  ).length

  const avgDigestive =
    totalLoggedDays > 0
      ? round1(periodEntries.reduce((s, e) => s + e.digestivePain, 0) / totalLoggedDays)
      : 0
  const avgJoint =
    totalLoggedDays > 0
      ? round1(periodEntries.reduce((s, e) => s + e.jointPain, 0) / totalLoggedDays)
      : 0
  const avgFatigue =
    totalLoggedDays > 0
      ? round1(periodEntries.reduce((s, e) => s + e.fatigue, 0) / totalLoggedDays)
      : 0
  const avgMigraine =
    totalLoggedDays > 0
      ? round1(periodEntries.reduce((s, e) => s + (e.migraine ?? 0), 0) / totalLoggedDays)
      : 0

  const entriesWithStools = periodEntries.filter((e) => e.stoolCount !== undefined)
  const avgStoolCount =
    entriesWithStools.length > 0
      ? round1(
          entriesWithStools.reduce((s, e) => s + (e.stoolCount ?? 0), 0) /
            entriesWithStools.length,
        )
      : 0
  const liquidStoolDays = periodEntries.filter((e) => e.stoolConsistency === 'liquide').length
  const nocturnalStoolDays = periodEntries.filter((e) => e.nocturnalStools).length
  const bloodStoolDays = periodEntries.filter((e) => e.bloodInStools).length

  // Identify symptom peaks (score >= 3, fever, or 'Fin de dose' tag) and check proximity to next injection
  const allInjectionDates = injections
    .filter((i) => i.status === 'done' || i.status === 'planned')
    .map((i) => i.actualDate ?? i.scheduledDate)
    .sort()

  const buckets = buildEndOfDoseBuckets(settings.cycleDays).map((b) => ({
    ...b,
    scores: [] as number[],
  }))
  // Fenêtre « fin de cycle » proportionnelle au cycle (3 jours pour un cycle de 14 j)
  const endOfCycleWindow = Math.max(1, Math.min(3, Math.round(settings.cycleDays / 4)))

  for (const e of periodEntries) {
    const nextInj = allInjectionDates.find((d) => d >= e.date)
    if (!nextInj || buckets.length === 0) continue
    const daysLeft = diffDays(e.date, nextInj)
    const meanSymptom = (e.digestivePain + e.jointPain + e.fatigue) / 3
    const bucket = buckets.find((b) => daysLeft >= b.min && daysLeft <= b.max)
    if (bucket) bucket.scores.push(meanSymptom)
  }

  const endOfDoseCurve: EndOfDoseBucket[] = buckets.map((b) => ({
    label: b.label,
    daysCount: b.scores.length,
    avgScore:
      b.scores.length > 0
        ? round1(b.scores.reduce((s, v) => s + v, 0) / b.scores.length)
        : 0,
  }))

  const peakDays: PeakDayInfo[] = []
  for (const e of periodEntries) {
    const mig = e.migraine ?? 0
    const maxScore = Math.max(e.digestivePain, e.jointPain, e.fatigue, mig)
    const hasEndOfDoseTag = e.tags.some((t) => t.toLowerCase().includes('fin de dose'))
    if (maxScore >= 3 || e.feverOrInfection || hasEndOfDoseTag) {
      const details: string[] = []
      if (e.digestivePain >= 3) details.push(`Digestif ${e.digestivePain}/5`)
      if (e.jointPain >= 3) details.push(`Articulaire ${e.jointPain}/5`)
      if (e.fatigue >= 3) details.push(`Fatigue ${e.fatigue}/5`)
      if (mig >= 3) details.push(`Migraine ${mig}/5`)
      if (e.feverOrInfection) details.push('Fièvre/Infection')
      if (hasEndOfDoseTag) details.push('Tag Fin de dose')

      const isEndOfCycle =
        hasEndOfDoseTag ||
        allInjectionDates.some((injDate) => {
          const delta = diffDays(e.date, injDate)
          return delta >= 1 && delta <= endOfCycleWindow
        })

      peakDays.push({
        date: e.date,
        maxScore,
        details,
        isEndOfCycle,
      })
    }
  }

  // Count tags & suspected foods
  const tagMap = new Map<string, number>()
  const foodMap = new Map<string, number>()
  for (const e of periodEntries) {
    for (const t of e.tags) {
      tagMap.set(t, (tagMap.get(t) ?? 0) + 1)
    }
    for (const f of e.suspectedFoods ?? []) {
      foodMap.set(f, (foodMap.get(f) ?? 0) + 1)
    }
  }
  const topTags = Array.from(tagMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  const topSuspectedFoods = Array.from(foodMap.entries())
    .map(([food, count]) => ({ food, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  // Lab comparisons (use labs up to endDate, or latest overall if none in range)
  const sortedLabs = [...labResults].sort((a, b) => a.date.localeCompare(b.date))
  const labsInOrBeforePeriod = sortedLabs.filter((l) => l.date <= endDate)
  const referenceLabs = labsInOrBeforePeriod.length > 0 ? labsInOrBeforePeriod : sortedLabs

  const labComparisons: LabComparisonItem[] = []
  for (const meta of LAB_MARKERS) {
    const withValue = referenceLabs.filter((l) => l[meta.key] !== undefined)
    if (withValue.length === 0) continue
    const latest = withValue[withValue.length - 1]
    const previous = withValue.length >= 2 ? withValue[withValue.length - 2] : undefined
    const latestValue = latest[meta.key]!

    labComparisons.push({
      meta,
      latestValue,
      latestDate: latest.date,
      previousValue: previous?.[meta.key],
      previousDate: previous?.date,
      outOfRange: isMarkerOutOfRange(meta, latestValue, settings.patientSex),
      refText: getMarkerRange(meta, settings.patientSex).refText,
    })
  }

  return {
    startDate,
    endDate,
    treatmentName: settings.treatmentName,
    isOral: isOralTreatment(settings.treatmentName),
    cycleDays: settings.cycleDays,
    doneInjections,
    shiftedInjections,
    totalLoggedDays,
    digestiveDays,
    jointDays,
    fatigueDays,
    migraineDays,
    feverDays,
    virusDays,
    antibioticDays,
    avgDigestive,
    avgJoint,
    avgFatigue,
    avgMigraine,
    avgStoolCount,
    liquidStoolDays,
    nocturnalStoolDays,
    bloodStoolDays,
    endOfDoseCurve,
    peakDays,
    topSuspectedFoods,
    topTags,
    labComparisons,
  }
}

export function formatReportAsText(report: MedicalReportSummary): string {
  const lines: string[] = []
  lines.push(`BILAN DE SUIVI — MICI (${report.treatmentName})`)
  lines.push(
    `Période : du ${formatDateFr(report.startDate, { day: 'numeric', month: 'long', year: 'numeric' })} au ${formatDateFr(report.endDate, { day: 'numeric', month: 'long', year: 'numeric' })}`,
  )
  lines.push('')

  lines.push(`1. TRAITEMENT (${report.treatmentName})`)
  lines.push(
    `- ${report.isOral ? 'Prises' : 'Injections'} réalisées : ${report.doneInjections.length} (cycle ${report.cycleDays} j)`,
  )
  for (const inj of report.doneInjections) {
    const d = formatShortDateFr(inj.actualDate ?? inj.scheduledDate)
    const details = [
      inj.site ? getSiteLabel(inj.site) : undefined,
      inj.doseMg > 0 ? `${inj.doseMg} mg` : undefined,
    ].filter(Boolean)
    lines.push(`  • ${d}${details.length ? ` — ${details.join(', ')}` : ''}`)
  }
  if (report.shiftedInjections.length > 0) {
    lines.push(`- Décalages enregistrés : ${report.shiftedInjections.length}`)
    for (const inj of report.shiftedInjections) {
      const sign = inj.shiftDays && inj.shiftDays > 0 ? `+${inj.shiftDays}` : inj.shiftDays
      lines.push(
        `  • Prévue le ${formatShortDateFr(inj.scheduledDate)}, décalée de ${sign} j (${inj.shiftReason || 'Non précisé'})`,
      )
    }
  } else {
    lines.push('- Aucun décalage sur la période.')
  }
  lines.push('')

  lines.push(`2. SYMPTÔMES & JOURNAL QUOTIDIEN (${report.totalLoggedDays} jours saisis)`)
  lines.push(`- Jours avec douleurs digestives : ${report.digestiveDays} (moyenne ${report.avgDigestive}/5)`)
  lines.push(`- Jours avec douleurs articulaires : ${report.jointDays} (moyenne ${report.avgJoint}/5)`)
  lines.push(`- Jours avec fatigue : ${report.fatigueDays} (moyenne ${report.avgFatigue}/5)`)
  lines.push(`- Jours avec migraines : ${report.migraineDays} (moyenne ${report.avgMigraine}/5)`)
  if (report.virusDays > 0 || report.antibioticDays > 0) {
    lines.push(
      `- Infections / Traitements annexes : ${report.virusDays} j Virus/Rhume, ${report.antibioticDays} j Antibiotiques`,
    )
  }
  if (report.totalLoggedDays > 0) {
    lines.push(
      `- Transit : moyenne ${report.avgStoolCount} selles/j (${report.liquidStoolDays} j liquides, ${report.nocturnalStoolDays} j nocturnes, ${report.bloodStoolDays} j avec sang)`,
    )
  }
  if (report.feverDays > 0) {
    lines.push(`- Épisodes de fièvre / infection : ${report.feverDays} jour(s)`)
  }
  if (report.peakDays.length > 0) {
    lines.push(`- Pics de symptômes repérés (${report.peakDays.length}) :`)
    for (const p of report.peakDays) {
      const cycleNote = p.isEndOfCycle
        ? ` [Fin de cycle avant ${report.isOral ? 'la prise' : "l'injection"}]`
        : ''
      lines.push(`  • ${formatShortDateFr(p.date)} : ${p.details.join(', ')}${cycleNote}`)
    }
  }
  if (report.topSuspectedFoods.length > 0) {
    lines.push(
      `- Aliments suspectés lors de douleurs : ${report.topSuspectedFoods.map((f) => `${f.food} (${f.count}x)`).join(', ')}`,
    )
  }
  if (report.topTags.length > 0) {
    lines.push(
      `- Facteurs fréquents : ${report.topTags.map((t) => `${t.tag} (${t.count}x)`).join(', ')}`,
    )
  }
  lines.push('')

  lines.push('3. BILANS BIOLOGIQUES RÉCENTS')
  if (report.labComparisons.length === 0) {
    lines.push('- Aucun bilan biologique enregistré.')
  } else {
    for (const item of report.labComparisons) {
      const prevStr =
        item.previousValue !== undefined
          ? ` (précédent : ${item.previousValue} le ${formatShortDateFr(item.previousDate!)})`
          : ''
      const flag = item.outOfRange ? ' [Hors norme]' : ''
      lines.push(
        `- ${item.meta.shortLabel} (${formatShortDateFr(item.latestDate)}) : ${item.latestValue} ${item.meta.unit} (réf. ${item.refText})${flag}${prevStr}`,
      )
    }
    lines.push(
      '  Valeurs de référence indicatives : seules celles du laboratoire font foi.',
    )
  }

  return lines.join('\n')
}

/**
 * La police Helvetica intégrée à jsPDF ne couvre que l'encodage WinAnsi :
 * on remplace les caractères hors de ce jeu pour éviter un affichage illisible.
 */
export function toPdfSafeText(text: string): string {
  return text
    .replace(/[→⇒➜]/g, '->')
    .replace(/[←]/g, '<-')
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/[   ]/g, ' ')
    .replace(/[^\n -~\xA0-\xFF‘’“”–—…•€Œœ]/g, '?')
}

export async function exportReportToPdf(report: MedicalReportSummary): Promise<void> {
  // jsPDF (et ses dépendances) n'est chargé qu'au moment de l'export
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const text = toPdfSafeText(formatReportAsText(report))
  const lines = doc.splitTextToSize(text, 180)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(15, 118, 110)
  doc.text('Rapport de suivi — MICI (Crohn / RCH)', 15, 18)

  doc.setDrawColor(203, 213, 225)
  doc.line(15, 22, 195, 22)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10.5)
  doc.setTextColor(30, 41, 59)

  let y = 30
  for (const line of lines) {
    if (y > 278) {
      doc.addPage()
      y = 20
    }
    doc.text(line, 15, y)
    y += 5.8
  }

  const pageCount = doc.getNumberOfPages()
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(148, 163, 184)
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page)
    doc.text(COPYRIGHT, 105, 291, { align: 'center' })
  }

  doc.save(`bilan-mici-${report.startDate}_au_${report.endDate}.pdf`)
}
