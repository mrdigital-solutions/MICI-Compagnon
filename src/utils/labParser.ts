import * as pdfjsLib from 'pdfjs-dist'
import type { LabResult } from '../types'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export type LabMarkerKey =
  | 'crp'
  | 'calprotectin'
  | 'alat'
  | 'asat'
  | 'ggt'
  | 'leukocytes'
  | 'erythrocytes'
  | 'vgm'

export interface LabMarkerMeta {
  key: LabMarkerKey
  label: string
  shortLabel: string
  unit: string
  refText: string
  minRef?: number
  maxRef?: number
  color: string
}

export const LAB_MARKERS: LabMarkerMeta[] = [
  {
    key: 'crp',
    label: 'CRP (Protéine C Réactive)',
    shortLabel: 'CRP',
    unit: 'mg/L',
    refText: '< 5.0',
    maxRef: 5,
    color: '#0d9488',
  },
  {
    key: 'calprotectin',
    label: 'Calprotectine fécale',
    shortLabel: 'Calprotectine',
    unit: 'µg/g',
    refText: '< 50',
    maxRef: 50,
    color: '#e11d48',
  },
  {
    key: 'alat',
    label: 'ALAT (TGP)',
    shortLabel: 'ALAT',
    unit: 'U/L',
    refText: '< 50',
    maxRef: 50,
    color: '#d97706',
  },
  {
    key: 'asat',
    label: 'ASAT (TGO)',
    shortLabel: 'ASAT',
    unit: 'U/L',
    refText: '< 50',
    maxRef: 50,
    color: '#ea580c',
  },
  {
    key: 'ggt',
    label: 'GGT',
    shortLabel: 'GGT',
    unit: 'U/L',
    refText: '< 60',
    maxRef: 60,
    color: '#8b5cf6',
  },
  {
    key: 'leukocytes',
    label: 'Leucocytes',
    shortLabel: 'Leucocytes',
    unit: 'G/L',
    refText: '4.10 – 10.80',
    minRef: 4.1,
    maxRef: 10.8,
    color: '#2563eb',
  },
  {
    key: 'erythrocytes',
    label: 'Hématies',
    shortLabel: 'Hématies',
    unit: 'T/L',
    refText: '4.39 – 5.68',
    minRef: 4.39,
    maxRef: 5.68,
    color: '#dc2626',
  },
  {
    key: 'vgm',
    label: 'V.G.M.',
    shortLabel: 'VGM',
    unit: 'fL',
    refText: '80.2 – 95.0',
    minRef: 80.2,
    maxRef: 95.0,
    color: '#059669',
  },
]

export function isMarkerOutOfRange(meta: LabMarkerMeta, value?: number): boolean {
  if (value === undefined || Number.isNaN(value)) return false
  if (meta.maxRef !== undefined && value > meta.maxRef) return true
  if (meta.minRef !== undefined && value < meta.minRef) return true
  return false
}

export async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pagesText: string[] = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const content = await page.getTextContent()
    const strings = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .filter(Boolean)
    pagesText.push(strings.join(' '))
  }

  return pagesText.join('\n')
}

function normalizeLabText(raw: string): string {
  return raw
    .replace(/[\u2212\u2013\u2014]/g, '-') // Unicode minus/dashes to ASCII hyphen
    .replace(/,/g, '.') // French decimal comma to dot
    .replace(/\s+/g, ' ')
    .trim()
}

function extractDateFromLabText(normalized: string): string | undefined {
  // Prioritize explicit exam/sample date patterns
  const patterns = [
    /Date de l['’]examen\s*:\s*(\d{2})[-/](\d{2})[-/](\d{4})/i,
    /Pr[ée]lev[ée]\s+le\s+(\d{2})[-/](\d{2})[-/](\d{4})/i,
    /Dossier\s+[A-Z0-9]+\s+du\s+(\d{2})[-/](\d{2})[-/](\d{4})/i,
    /(\d{2})[-/](\d{2})[-/](20\d{2})/,
  ]

  for (const regex of patterns) {
    const match = normalized.match(regex)
    if (match) {
      const [, dd, mm, yyyy] = match
      return `${yyyy}-${mm}-${dd}`
    }
  }
  return undefined
}

function extractMarkerValue(normalized: string, markerRegex: RegExp): number | undefined {
  const match = normalized.match(markerRegex)
  if (!match?.[1]) return undefined
  const val = parseFloat(match[1])
  return Number.isFinite(val) ? val : undefined
}

export type ParsedLabDraft = Omit<LabResult, 'id' | 'createdAt'>

export function parseLabText(rawText: string): ParsedLabDraft {
  const norm = normalizeLabText(rawText)
  const date = extractDateFromLabText(norm) ?? new Date().toISOString().slice(0, 10)

  // Patterns allow optional [AC] and parenthetical method descriptions between name and value
  const crp = extractMarkerValue(
    norm,
    /(?:CRP|Prot[ée]ine\s+C\s+R[ée]active)[^0-9]{0,90}?(\d+(?:\.\d+)?)\s*mg\/L/i,
  )
  const calprotectin = extractMarkerValue(
    norm,
    /Calprotectine(?:\s+f[ée]cale)?[^0-9]{0,90}?(\d+(?:\.\d+)?)\s*(?:µg\/g|ug\/g|mg\/kg)/i,
  )
  const alat = extractMarkerValue(
    norm,
    /ALAT(?:\s*\([^)]*\))?[^0-9]{0,90}?(\d+(?:\.\d+)?)\s*(?:U\/L|UI\/L)/i,
  )
  const asat = extractMarkerValue(
    norm,
    /ASAT(?:\s*\([^)]*\))?[^0-9]{0,90}?(\d+(?:\.\d+)?)\s*(?:U\/L|UI\/L)/i,
  )
  const ggt = extractMarkerValue(
    norm,
    /GGT(?:\s*\([^)]*\))?[^0-9]{0,90}?(\d+(?:\.\d+)?)\s*(?:U\/L|UI\/L)/i,
  )
  const leukocytes = extractMarkerValue(
    norm,
    /Leucocytes[^0-9]{0,60}?(\d+(?:\.\d+)?)\s*(?:G\/L|10\^9\/L)/i,
  )
  const erythrocytes = extractMarkerValue(
    norm,
    /H[ée]maties[^0-9]{0,60}?(\d+(?:\.\d+)?)\s*(?:T\/L|10\^12\/L)/i,
  )
  const vgm = extractMarkerValue(
    norm,
    /V\.?G\.?M\.?[^0-9]{0,60}?(\d+(?:\.\d+)?)\s*fL/i,
  )

  return {
    date,
    crp,
    calprotectin,
    alat,
    asat,
    ggt,
    leukocytes,
    erythrocytes,
    vgm,
  }
}
