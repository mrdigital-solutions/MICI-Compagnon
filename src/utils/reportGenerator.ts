import { jsPDF } from 'jspdf'
import { getSiteLabel } from '../db/database'
import type { AppSettings, DailyEntry, InjectionRecord, LabResult } from '../types'
import { diffDays, formatDateFr, formatShortDateFr } from './dateUtils'
import { LAB_MARKERS, isMarkerOutOfRange, type LabMarkerMeta } from './labParser'

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
  doneInjections: InjectionRecord[]
  shiftedInjections: InjectionRecord[]
  totalLoggedDays: number
  digestiveDays: number
  jointDays: number
  fatigueDays: number
  feverDays: number
  avgDigestive: number
  avgJoint: number
  avgFatigue: number
  avgStoolCount: number
  liquidStoolDays: number
  nocturnalStoolDays: number
  bloodStoolDays: number
  endOfDoseCurve: EndOfDoseBucket[]
  peakDays: PeakDayInfo[]
  topTags: { tag: string; count: number }[]
  labComparisons: LabComparisonItem[]
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
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
  const feverDays = periodEntries.filter((e) => e.feverOrInfection).length

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

  const buckets: { label: string; min: number; max: number; scores: number[] }[] = [
    { label: 'J-14 à J-10', min: 10, max: 60, scores: [] },
    { label: 'J-9 à J-6', min: 6, max: 9, scores: [] },
    { label: 'J-5 à J-3', min: 3, max: 5, scores: [] },
    { label: 'J-2 à Jour J', min: 0, max: 2, scores: [] },
  ]

  for (const e of periodEntries) {
    const nextInj = allInjectionDates.find((d) => d >= e.date)
    if (!nextInj) continue
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
    const maxScore = Math.max(e.digestivePain, e.jointPain, e.fatigue)
    const hasEndOfDoseTag = e.tags.some((t) => t.toLowerCase().includes('fin de dose'))
    if (maxScore >= 3 || e.feverOrInfection || hasEndOfDoseTag) {
      const details: string[] = []
      if (e.digestivePain >= 3) details.push(`Digestif ${e.digestivePain}/5`)
      if (e.jointPain >= 3) details.push(`Articulaire ${e.jointPain}/5`)
      if (e.fatigue >= 3) details.push(`Fatigue ${e.fatigue}/5`)
      if (e.feverOrInfection) details.push('Fièvre/Infection')
      if (hasEndOfDoseTag) details.push('Tag Fin de dose')

      const isEndOfCycle =
        hasEndOfDoseTag ||
        allInjectionDates.some((injDate) => {
          const delta = diffDays(e.date, injDate)
          return delta >= 1 && delta <= 3
        })

      peakDays.push({
        date: e.date,
        maxScore,
        details,
        isEndOfCycle,
      })
    }
  }

  // Count tags
  const tagMap = new Map<string, number>()
  for (const e of periodEntries) {
    for (const t of e.tags) {
      tagMap.set(t, (tagMap.get(t) ?? 0) + 1)
    }
  }
  const topTags = Array.from(tagMap.entries())
    .map(([tag, count]) => ({ tag, count }))
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
      outOfRange: isMarkerOutOfRange(meta, latestValue),
    })
  }

  return {
    startDate,
    endDate,
    treatmentName: settings.treatmentName,
    doneInjections,
    shiftedInjections,
    totalLoggedDays,
    digestiveDays,
    jointDays,
    fatigueDays,
    feverDays,
    avgDigestive,
    avgJoint,
    avgFatigue,
    avgStoolCount,
    liquidStoolDays,
    nocturnalStoolDays,
    bloodStoolDays,
    endOfDoseCurve,
    peakDays,
    topTags,
    labComparisons,
  }
}

export function formatReportAsText(report: MedicalReportSummary): string {
  const lines: string[] = []
  lines.push(`BILAN DE SUIVI — MALADIE DE CROHN (${report.treatmentName})`)
  lines.push(
    `Période : du ${formatDateFr(report.startDate, { day: 'numeric', month: 'long', year: 'numeric' })} au ${formatDateFr(report.endDate, { day: 'numeric', month: 'long', year: 'numeric' })}`,
  )
  lines.push('')

  lines.push(`1. TRAITEMENT (${report.treatmentName})`)
  lines.push(`- Injections réalisées : ${report.doneInjections.length}`)
  for (const inj of report.doneInjections) {
    const d = formatShortDateFr(inj.actualDate ?? inj.scheduledDate)
    lines.push(`  • ${d} — ${getSiteLabel(inj.site)} (${inj.doseMg} mg)`)
  }
  if (report.shiftedInjections.length > 0) {
    lines.push(`- Décalages enregistrés : ${report.shiftedInjections.length}`)
    for (const inj of report.shiftedInjections) {
      const sign = inj.shiftDays && inj.shiftDays > 0 ? `+${inj.shiftDays}` : inj.shiftDays
      lines.push(
        `  • Prévue le ${formatShortDateFr(inj.scheduledDate)} → décalée de ${sign} j (${inj.shiftReason || 'Non précisé'})`,
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
      const cycleNote = p.isEndOfCycle ? ' [Fin de cycle avant injection]' : ''
      lines.push(`  • ${formatShortDateFr(p.date)} : ${p.details.join(', ')}${cycleNote}`)
    }
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
        `- ${item.meta.shortLabel} (${formatShortDateFr(item.latestDate)}) : ${item.latestValue} ${item.meta.unit}${flag}${prevStr}`,
      )
    }
  }

  return lines.join('\n')
}

export function exportReportToPdf(report: MedicalReportSummary): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const text = formatReportAsText(report)
  const lines = doc.splitTextToSize(text, 180)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(15, 118, 110)
  doc.text('Rapport de suivi — Maladie de Crohn', 15, 18)

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

  doc.save(`bilan-crohn-${report.startDate}_au_${report.endDate}.pdf`)
}
