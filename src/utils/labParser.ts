import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { LabResult } from '../types'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

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
    color: '#ea580c',
    maxRef: 50,
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

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(`Timeout: ${label}`)), ms)
    promise.then(
      (val) => {
        window.clearTimeout(timer)
        resolve(val)
      },
      (err) => {
        window.clearTimeout(timer)
        reject(err)
      },
    )
  })
}

export async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    disableFontFace: true,
    useSystemFonts: true,
  })

  const pdf = await withTimeout(loadingTask.promise, 10000, 'Chargement PDF')
  const maxPages = Math.min(pdf.numPages, 8)
  const pagesText: string[] = []

  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const content = await withTimeout(page.getTextContent(), 5000, `Page ${pageNum}`)
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
    .replace(/\u03BC/g, 'µ') // Greek mu to micro sign
    .replace(/,/g, '.') // French decimal comma to dot
    .replace(/\s+/g, ' ')
    .trim()
}

function extractDateFromLabText(normalized: string): string | undefined {
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

/**
 * Searches all occurrences of a marker pattern in the cleaned text
 * and returns the first valid numeric value found.
 */
function extractFromAllMatches(text: string, globalRegex: RegExp): number | undefined {
  for (const match of text.matchAll(globalRegex)) {
    if (match[1]) {
      const val = parseFloat(match[1])
      if (Number.isFinite(val)) return val
    }
  }
  return undefined
}

export type ParsedLabDraft = Omit<LabResult, 'id' | 'createdAt'>

export function parseLabText(rawText: string): ParsedLabDraft {
  const norm = normalizeLabText(rawText)
  const date = extractDateFromLabText(norm) ?? new Date().toISOString().slice(0, 10)

  // Clean out [AC], dates (dd-mm-yyyy / dd/mm/yy), and parenthetical method/reference blocks
  // so that "<Marker> [AC] (Method ...) 315.7 µg/g (< 50)" becomes "<Marker> 315.7 µg/g"
  const cleaned = norm
    .replace(/\[AC\]/gi, ' ')
    .replace(/\b\d{2}[-/]\d{2}[-/]\d{2,4}\b/g, ' ')
    .replace(/\b\d{2}:\d{2}\b/g, ' ')
    .replace(/\([^)]{1,120}\)/g, ' ')
    .replace(/\s+/g, ' ')

  const crp = extractFromAllMatches(
    cleaned,
    /(?:CRP|Prot[ée]ine\s+C\s+R[ée]active)[^0-9<>]{0,80}?(?:[<>]\s*)?(\d+(?:\.\d+)?)\s*(?:[*H↑!]\s*)?mg\s*\/\s*L/gi,
  )

  const calprotectin =
    extractFromAllMatches(
      cleaned,
      /Calprotectine(?:\s+f[ée]cale|\s+dans\s+les\s+selles)?[^0-9<>]{0,120}?(?:[<>]\s*)?(\d+(?:\.\d+)?)\s*(?:[*H↑!]\s*)?(?:µg|ug|mcg|mg)\s*\/\s*(?:g|kg)/gi,
    ) ??
    extractFromAllMatches(
      cleaned,
      /Calprotectine(?:\s+f[ée]cale|\s+dans\s+les\s+selles)?[^0-9<>]{0,100}?(?:[<>]\s*)?(\d+(?:\.\d+)?)/gi,
    )

  const alat = extractFromAllMatches(
    cleaned,
    /\b(?:ALAT|Transaminases\s+TGP)\b[^0-9<>]{0,80}?(?:[<>]\s*)?(\d+(?:\.\d+)?)\s*(?:[*H↑!]\s*)?(?:UI|U)\s*\/\s*L/gi,
  )

  const asat = extractFromAllMatches(
    cleaned,
    /\b(?:ASAT|Transaminases\s+TGO)\b[^0-9<>]{0,80}?(?:[<>]\s*)?(\d+(?:\.\d+)?)\s*(?:[*H↑!]\s*)?(?:UI|U)\s*\/\s*L/gi,
  )

  const ggt = extractFromAllMatches(
    cleaned,
    /\b(?:GGT|Gamma\s+Glutamyl\s+Transpeptidase)\b[^0-9<>]{0,80}?(?:[<>]\s*)?(\d+(?:\.\d+)?)\s*(?:[*H↑!]\s*)?(?:UI|U)\s*\/\s*L/gi,
  )

  const leukocytes = extractFromAllMatches(
    cleaned,
    /Leucocytes[^0-9<>]{0,60}?(\d+(?:\.\d+)?)\s*(?:[*H↑!]\s*)?(?:G\s*\/\s*L|10\^9\/L)/gi,
  )

  const erythrocytes = extractFromAllMatches(
    cleaned,
    /H[ée]maties[^0-9<>]{0,60}?(\d+(?:\.\d+)?)\s*(?:[*H↑!]\s*)?(?:T\s*\/\s*L|10\^12\/L)/gi,
  )

  const vgm = extractFromAllMatches(
    cleaned,
    /V\.?G\.?M\.?[^0-9<>]{0,60}?(\d+(?:\.\d+)?)\s*(?:[*H↑!]\s*)?fL/gi,
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
