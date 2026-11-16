import {
  AlertCircle,
  CheckCircle2,
  ClipboardPaste,
  FileUp,
  Loader2,
  Sparkles,
  X,
} from 'lucide-react'
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
  const [mode, setMode] = useState<'pdf' | 'text' | 'manual'>(
    initialMode === 'manual' ? 'manual' : 'pdf',
  )
  const [rawText, setRawText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parseMessage, setParseMessage] = useState<{
    type: 'success' | 'warning'
    text: string
  } | null>(null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [draft, setDraft] = useState<ParsedLabDraft>(() => ({
    date: new Date().toISOString().slice(0, 10),
    notes: '',
  }))

  function applyParsedText(text: string, sourceLabel: string, extra?: Partial<ParsedLabDraft>) {
    const parsed = parseLabText(text)
    const foundCount = LAB_MARKERS.filter((m) => parsed[m.key] !== undefined).length
    setDraft((prev) => ({
      ...prev,
      ...parsed,
      ...extra,
      notes: prev.notes || sourceLabel,
    }))
    if (foundCount > 0) {
      setParseMessage({
        type: 'success',
        text: `${foundCount} valeur${foundCount > 1 ? 's' : ''} extraite${foundCount > 1 ? 's' : ''} automatiquement. Cliquez sur « Enregistrer le bilan » en bas.`,
      })
    } else {
      setParseMessage({
        type: 'warning',
        text:
          text.trim().length < 20
            ? 'Ce PDF est une image scannée : le PDF est bien attaché, complétez vos chiffres ci-dessous puis cliquez sur « Enregistrer le bilan ».'
            : 'Le PDF est attaché. Vérifiez ou complétez vos valeurs ci-dessous puis cliquez sur « Enregistrer le bilan ».',
      })
    }
  }

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setParsing(true)
    setParseMessage(null)

    const pdfBlob = new Blob([await file.arrayBuffer()], {
      type: file.type || 'application/pdf',
    })

    try {
      const text = await extractTextFromPdf(file)
      applyParsedText(text, `Import PDF : ${file.name}`, {
        pdfFileName: file.name,
        pdfBlob,
      })
    } catch {
      setDraft((prev) => ({
        ...prev,
        pdfFileName: file.name,
        pdfBlob,
        notes: prev.notes || `Import PDF : ${file.name}`,
      }))
      setParseMessage({
        type: 'warning',
        text: `PDF « ${file.name} » attaché. Complétez les valeurs ci-dessous puis cliquez sur « Enregistrer le bilan ».`,
      })
    } finally {
      setParsing(false)
    }
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
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xl max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-[#FFFCF8] dark:bg-slate-900 border border-amber-200/60 dark:border-slate-800 shadow-2xl overflow-hidden"
      >
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
                Extraction automatique dès la sélection du PDF
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

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* 3-way mode switcher */}
          <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setMode('pdf')}
              className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                mode === 'pdf'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Importer PDF
            </button>
            <button
              type="button"
              onClick={() => setMode('text')}
              className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                mode === 'text'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Coller texte
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
              Saisie manuelle
            </button>
          </div>

          {mode === 'pdf' && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={parsing}
                className="w-full flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-teal-300 dark:border-teal-700/60 bg-teal-50/50 dark:bg-teal-950/20 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors cursor-pointer"
              >
                {parsing ? (
                  <Loader2 className="w-7 h-7 text-teal-600 animate-spin" />
                ) : (
                  <FileUp className="w-7 h-7 text-teal-600 dark:text-teal-400" />
                )}
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {parsing
                      ? 'Extraction automatique en cours...'
                      : draft.pdfFileName
                        ? `PDF chargé : ${draft.pdfFileName}`
                        : 'Toucher ici pour choisir votre PDF'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Les chiffres sont extraits tout de suite ci-dessous
                  </p>
                </div>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handlePdfUpload}
                className="hidden"
              />
            </div>
          )}

          {mode === 'text' && (
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <ClipboardPaste className="w-3.5 h-3.5 text-teal-600" />
                Collez le texte de vos résultats (extrait automatiquement) :
              </label>
              <textarea
                rows={3}
                value={rawText}
                onChange={(e) => {
                  const val = e.target.value
                  setRawText(val)
                  if (val.trim()) applyParsedText(val, 'Import texte')
                }}
                placeholder="Collez ici le texte copié depuis votre PDF ou laboratoire..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>
          )}

          {parseMessage && (
            <div
              className={`flex items-start gap-2 p-3 rounded-2xl border text-xs ${
                parseMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-200'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-200'
              }`}
            >
              {parseMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              )}
              <span>{parseMessage.text}</span>
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
              {LAB_MARKERS.map((marker) => {
                const hasVal = draft[marker.key] !== undefined
                return (
                  <div
                    key={marker.key}
                    className={`p-2.5 rounded-2xl border transition-colors ${
                      hasVal
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-700/60'
                        : 'bg-white dark:bg-slate-800/70 border-slate-200/80 dark:border-slate-700/70'
                    }`}
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
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white"
                    />
                  </div>
                )
              })}
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
        </div>

        {/* Sticky footer always visible on mobile */}
        <div className="px-5 py-3.5 border-t border-amber-100 dark:border-slate-800 bg-[#FFFCF8] dark:bg-slate-900 flex gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving || parsing}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 disabled:opacity-50 text-white text-sm font-semibold shadow-sm"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer le bilan'}
          </button>
        </div>
      </form>
    </div>
  )
}
