import type { LabResult, PatientSex } from '../types'
import { getTodayKey } from './dateUtils'

export type LabMarkerKey =
  | 'crp'
  | 'calprotectin'
  | 'alat'
  | 'asat'
  | 'ggt'
  | 'leukocytes'
  | 'erythrocytes'
  | 'vgm'

export interface LabRange {
  refText: string
  minRef?: number
  maxRef?: number
}

export interface LabMarkerMeta extends LabRange {
  key: LabMarkerKey
  label: string
  shortLabel: string
  unit: string
  color: string
  /** Valeurs de référence propres aux femmes, si elles diffèrent */
  female?: LabRange
}

/**
 * Valeurs de référence indicatives (adultes). Chaque laboratoire a ses propres
 * normes : celles imprimées sur le compte rendu font foi.
 */
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
    female: { refText: '< 35', maxRef: 35 },
    color: '#d97706',
  },
  {
    key: 'asat',
    label: 'ASAT (TGO)',
    shortLabel: 'ASAT',
    unit: 'U/L',
    refText: '< 50',
    maxRef: 50,
    female: { refText: '< 35', maxRef: 35 },
    color: '#ea580c',
  },
  {
    key: 'ggt',
    label: 'GGT',
    shortLabel: 'GGT',
    unit: 'U/L',
    refText: '< 60',
    maxRef: 60,
    female: { refText: '< 40', maxRef: 40 },
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
    female: { refText: '3.80 – 5.10', minRef: 3.8, maxRef: 5.1 },
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

/** Plage de référence à utiliser selon le sexe renseigné dans les paramètres. */
export function getMarkerRange(meta: LabMarkerMeta, sex?: PatientSex): LabRange {
  if (sex === 'F' && meta.female) return meta.female
  return { refText: meta.refText, minRef: meta.minRef, maxRef: meta.maxRef }
}

export function isMarkerOutOfRange(
  meta: LabMarkerMeta,
  value?: number,
  sex?: PatientSex,
): boolean {
  if (value === undefined || Number.isNaN(value)) return false
  const range = getMarkerRange(meta, sex)
  if (range.maxRef !== undefined && value > range.maxRef) return true
  if (range.minRef !== undefined && value < range.minRef) return true
  return false
}

function normalizeLabText(raw: string): string {
  return raw
    .replace(/[−–—]/g, '-') // Unicode minus/dashes to ASCII hyphen
    .replace(/μ/g, 'µ') // Greek mu to micro sign
    .replace(/,/g, '.') // French decimal comma to dot
    .replace(/\s+/g, ' ')
    .trim()
}

const BIRTH_CONTEXT_RE = /(naissance|n[ée]e?\s+le|DDN|date\s+de\s+naiss)/i

function toIsoDate(dd: string, mm: string, yyyy: string): string | undefined {
  const d = Number(dd)
  const m = Number(mm)
  if (m < 1 || m > 12 || d < 1 || d > 31) return undefined
  return `${yyyy}-${mm}-${dd}`
}

export function extractDateFromLabText(normalized: string): string | undefined {
  const explicitPatterns = [
    /Date de l['’]examen\s*:?\s*(\d{2})[-/.](\d{2})[-/.](\d{4})/i,
    /Pr[ée]lev[ée]\s+le\s*:?\s*(\d{2})[-/.](\d{2})[-/.](\d{4})/i,
    /Pr[ée]l[èe]vement\s+(?:du|le)?\s*:?\s*(\d{2})[-/.](\d{2})[-/.](\d{4})/i,
    /Dossier\s+[A-Z0-9]+\s+du\s+(\d{2})[-/.](\d{2})[-/.](\d{4})/i,
  ]

  for (const regex of explicitPatterns) {
    const match = normalized.match(regex)
    if (match) {
      const iso = toIsoDate(match[1], match[2], match[3])
      if (iso) return iso
    }
  }

  // Repli : première date plausible qui n'est ni une date de naissance ni dans le futur
  const today = getTodayKey()
  for (const match of normalized.matchAll(/(\d{2})[-/.](\d{2})[-/.](20\d{2})/g)) {
    // Contexte juste avant la date, sans déborder sur une date précédente
    const before =
      normalized
        .slice(Math.max(0, (match.index ?? 0) - 30), match.index)
        .split(/\d{2}[-/.]\d{2}[-/.]\d{2,4}/)
        .pop() ?? ''
    if (BIRTH_CONTEXT_RE.test(before)) continue
    const iso = toIsoDate(match[1], match[2], match[3])
    if (iso && iso <= today) return iso
  }
  return undefined
}

interface MarkerMatch {
  value: number
  qualifier?: '<' | '>'
  unit?: string
}

/**
 * Searches all occurrences of a marker pattern in the cleaned text
 * and returns the first valid numeric value found.
 * Group 1 = qualifier (< or >), group 2 = value, group 3 = unit (optional).
 */
function extractFromAllMatches(text: string, globalRegex: RegExp): MarkerMatch | undefined {
  for (const match of text.matchAll(globalRegex)) {
    if (match[2]) {
      const val = parseFloat(match[2])
      if (Number.isFinite(val)) {
        const q = match[1]?.trim()
        return {
          value: val,
          qualifier: q === '<' || q === '>' ? q : undefined,
          unit: match[3],
        }
      }
    }
  }
  return undefined
}

export type ParsedLabDraft = Omit<LabResult, 'id' | 'createdAt'>

const FLAG = String.raw`(?:[*H↑!]\s*)?`
const QUAL = String.raw`([<>]\s*)?`
const NUM = String.raw`(\d+(?:\.\d+)?)`

function round(n: number, decimals = 2): number {
  const f = 10 ** decimals
  return Math.round(n * f) / f
}

export function parseLabText(rawText: string): ParsedLabDraft {
  const norm = normalizeLabText(rawText)
  const date = extractDateFromLabText(norm) ?? getTodayKey()
  const remarks: string[] = []

  // Clean out [AC], dates (dd-mm-yyyy / dd/mm/yy), and parenthetical method/reference blocks
  // so that "<Marker> [AC] (Method ...) 315.7 µg/g (< 50)" becomes "<Marker> 315.7 µg/g"
  const cleaned = norm
    .replace(/\[AC\]/gi, ' ')
    .replace(/\b\d{2}[-/]\d{2}[-/]\d{2,4}\b/g, ' ')
    .replace(/\b\d{2}:\d{2}\b/g, ' ')
    .replace(/\([^)]{1,120}\)/g, ' ')
    .replace(/\s+/g, ' ')

  function keep(label: string, m: MarkerMatch | undefined, unit: string): number | undefined {
    if (!m) return undefined
    if (m.qualifier) {
      remarks.push(`${label} ${m.qualifier} ${m.value} ${unit} (sous le seuil de détection)`)
    }
    return m.value
  }

  const crp = keep(
    'CRP',
    extractFromAllMatches(
      cleaned,
      new RegExp(
        String.raw`(?:CRP|Prot[ée]ine\s+C\s+R[ée]active)[^0-9<>]{0,80}?${QUAL}${NUM}\s*${FLAG}mg\s*\/\s*L`,
        'gi',
      ),
    ),
    'mg/L',
  )

  // Calprotectine : µg/g et mg/kg sont équivalents ; mg/g est converti (x1000)
  const calproWithUnit = extractFromAllMatches(
    cleaned,
    new RegExp(
      String.raw`Calprotectine(?:\s+f[ée]cale|\s+dans\s+les\s+selles)?[^0-9<>]{0,120}?${QUAL}${NUM}\s*${FLAG}((?:µg|ug|mcg|mg)\s*\/\s*(?:g|kg))`,
      'gi',
    ),
  )
  let calprotectin: number | undefined
  if (calproWithUnit) {
    const unit = (calproWithUnit.unit ?? '').replace(/\s+/g, '').toLowerCase()
    if (unit === 'mg/g') calproWithUnit.value = round(calproWithUnit.value * 1000, 1)
    calprotectin = keep('Calprotectine', calproWithUnit, 'µg/g')
  } else {
    const calproNoUnit = extractFromAllMatches(
      cleaned,
      new RegExp(
        String.raw`Calprotectine(?:\s+f[ée]cale|\s+dans\s+les\s+selles)?[^0-9<>]{0,100}?${QUAL}${NUM}`,
        'gi',
      ),
    )
    calprotectin = keep('Calprotectine', calproNoUnit, 'µg/g')
    if (calproNoUnit) {
      remarks.push('Calprotectine lue sans unité : vérifiez la valeur sur le compte rendu')
    }
  }

  const enzyme = (names: string) =>
    new RegExp(
      String.raw`\b(?:${names})\b[^0-9<>]{0,80}?${QUAL}${NUM}\s*${FLAG}(?:UI|U)\s*\/\s*L`,
      'gi',
    )

  const alat = keep('ALAT', extractFromAllMatches(cleaned, enzyme(String.raw`ALAT|Transaminases\s+TGP`)), 'U/L')
  const asat = keep('ASAT', extractFromAllMatches(cleaned, enzyme(String.raw`ASAT|Transaminases\s+TGO`)), 'U/L')
  const ggt = keep(
    'GGT',
    extractFromAllMatches(cleaned, enzyme(String.raw`GGT|Gamma[\s-]+Glutamyl[\s-]*Transpeptidase|Gamma[\s-]+GT`)),
    'U/L',
  )

  // Leucocytes : G/L, 10^9/L ou /mm3 (converti en G/L)
  const leukoMatch = extractFromAllMatches(
    cleaned,
    new RegExp(
      String.raw`Leucocytes[^0-9<>]{0,60}?()(\d+(?:\.\d+)?)\s*${FLAG}(G\s*\/\s*L|Giga\s*\/\s*L|10\s*[\^*]\s*9\s*\/\s*L|\/\s*mm\s*3|\/\s*mm³|\/\s*µL)`,
      'gi',
    ),
  )
  let leukocytes: number | undefined
  if (leukoMatch) {
    const unit = (leukoMatch.unit ?? '').replace(/\s+/g, '').toLowerCase()
    const perMm3 = unit.startsWith('/')
    leukocytes = perMm3 ? round(leukoMatch.value / 1000) : leukoMatch.value
  }

  const erythrocytes = extractFromAllMatches(
    cleaned,
    new RegExp(
      String.raw`H[ée]maties[^0-9<>]{0,60}?()(\d+(?:\.\d+)?)\s*${FLAG}(T\s*\/\s*L|Tera\s*\/\s*L|10\s*[\^*]\s*12\s*\/\s*L)`,
      'gi',
    ),
  )?.value

  const vgm = extractFromAllMatches(
    cleaned,
    new RegExp(String.raw`V\.?G\.?M\.?[^0-9<>]{0,60}?()(\d+(?:\.\d+)?)\s*${FLAG}(fL|µ3|µm3)`, 'gi'),
  )?.value

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
    notes: remarks.length > 0 ? remarks.join(' · ') : undefined,
  }
}
