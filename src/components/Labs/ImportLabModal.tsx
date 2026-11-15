import { CheckCircle2, ClipboardPaste, FileUp, Loader2, Sparkles, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { db } from '../../db/database'
import {
  LAB_MARKERS,
  extractTextFromPdf,
  parseLabText,
  type LabMarkerKey,
  type ParsedLabDraft,
} from '../../utils/labParser'

interface ImportLabModalProps {
  initialMode?: 'import' | 'manual'
  onClose: () => void
}

export function ImportLabModal({ initialMode = 'import', onClose }: ImportLabModalProps) {
  const [mode, setMode] = useState<'import' | 'manual'>(initialMode)
  const [rawText, setRawText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parseMessage, setParseMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [draft, setDraft] = useState<ParsedLabDraft>({
    date: new Date().toISOString().slice(0, 10),
    notes: '',
  })

  function applyParsedText(text: string, sourceLabel: string) {
    const parsed = parseLabText(text)
    const foundCount = LAB_MARKERS.filter((m) => parsed[m.key] !== undefined).length
    setDraft((prev) => ({
      ...prev,
      ...parsed,
      notes: prev.notes || sourceLabel,
    }))
    setParseMessage(
      foundCount > 0
        ? `${foundCount} marqueur${foundCount > 1 ? 's' : ''} extrait${foundCount > 1 ? 's' : ''} automatiquement (${sourceLabel}). Vérifiez ci-dessous puis enregistrez.`
        : 'Aucune valeur reconnue automatiquement. Vous pouvez compléter manuellement ci-dessous.',
    )
  }

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setParsing(true)
    setParseMessage(null)
    try {
      const text = await extractTextFromPdf(file)
      setRawText(text)
      applyParsedText(text, `Import PDF : ${file.name}`)
    } catch {
      setParseMessage("Impossible de lire ce PDF. Essayez de copier-coller le texte brut.")
    } finally {
      setParsing(false)
    }
  }

  function handleParseRawText() {
    if (!rawText.trim()) return
    applyParsedText(rawText, 'Import texte')
  }

  function updateField(key: LabMarkerKey, rawValue: string) {
    const normalized = rawValue.replace(',', '.')
    const num = normalized === '' ? undefined : parseFloat(normalized)
    setDraft((prev) => ({
      ...prev,
      [key]: num !== undefined && Number.isFinite(num) ? num : undefined,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await db.labResults.add({
        ...draft,
        createdAt: new Date().toISOString(),
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-xl max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-[#FFFCF8] dark:bg-slate-900 border border-amber-200/60 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-amber-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Ajouter un bilan biologique
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Import PDF automatique (Biogroup, etc.) ou saisie manuelle
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto">
          {/* Mode switcher */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setMode('import')}
              className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                mode === 'import'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Import intelligent (PDF / Texte)
            </button>
            <button
              type="button"
              onClick={() => setMode('manual')}
              className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                mode === 'manual'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Saisie manuelle directe
            </button>
          </div>

          {mode === 'import' && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={parsing}
                className="w-full flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border-2 border-dashed border-teal-300 dark:border-teal-700/60 bg-teal-50/50 dark:bg-teal-950/20 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors cursor-pointer"
              >
                {parsing ? (
                  <Loader2 className="w-7 h-7 text-teal-600 animate-spin" />
                ) : (
                  <FileUp className="w-7 h-7 text-teal-600 dark:text-teal-400" />
                )}
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {parsing ? 'Analyse du PDF en cours...' : 'Sélectionner un PDF de laboratoire'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Traitement 100% local sur votre appareil, aucune donnée envoyée en ligne
                  </p>
                </div>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                onChange={handlePdfUpload}
                className="hidden"
              />

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <ClipboardPaste className="w-3.5 h-3.5 text-teal-600" />
                  Ou collez le texte brut de vos résultats :
                </label>
                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="Ex: Date de l'examen : 05-10-2026 CRP 4.5 mg/L ALAT 54 U/L..."
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleParseRawText}
                    className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shrink-0"
                  >
                    Extraire
                  </button>
                </div>
              </div>

              {parseMessage && (
                <div className="flex items-start gap-2 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-xs text-emerald-800 dark:text-emerald-200">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  <span>{parseMessage}</span>
                </div>
              )}
            </div>
          )}

          {/* Extracted / Manual form fields */}
          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Date du bilan
              </label>
              <input
                type="date"
                value={draft.date}
                onChange={(e) => setDraft((p) => ({ ...p, date: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {LAB_MARKERS.map((marker) => (
                <div
                  key={marker.key}
                  className="p-2.5 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/70"
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                      {marker.shortLabel}
                    </label>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {marker.unit} ({marker.refText})
                    </span>
                  </div>
                  <input
                    type="number"
                    step="any"
                    value={draft[marker.key] ?? ''}
                    onChange={(e) => updateField(marker.key, e.target.value)}
                    placeholder="—"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Note (optionnel)
              </label>
              <input
                type="text"
                value={draft.notes ?? ''}
                onChange={(e) => setDraft((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Ex: Bilan mensuel avant gastro-entérologue"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-sm font-semibold shadow-sm"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer le bilan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
