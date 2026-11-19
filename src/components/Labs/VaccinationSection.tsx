import { AlertTriangle, ChevronDown, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { db } from '../../db/database'
import { quickWrite } from '../../db/dbHealth'
import type { VaccinationRecord } from '../../types'
import { formatShortDateFr, getTodayKey } from '../../utils/dateUtils'
import { newId } from '../../utils/id'
import {
  LIVE_VACCINES,
  VACCINE_PRESETS,
  getVaccineStatus,
  type VaccineStatusTone,
} from '../../utils/vaccines'

const OTHER = '__autre__'

const TONE_STYLES: Record<VaccineStatusTone, string> = {
  ok: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  todo: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
  info: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
}

export function VaccinationSection() {
  const settings = useLiveQuery(() => db.settings.get('default'), [])
  const records = useMemo(() => settings?.vaccinations ?? [], [settings])
  const today = getTodayKey()

  const [showForm, setShowForm] = useState(false)
  const [showLive, setShowLive] = useState(false)
  const [choice, setChoice] = useState(VACCINE_PRESETS[0].name)
  const [customName, setCustomName] = useState('')
  const [date, setDate] = useState(today)
  const [notes, setNotes] = useState('')

  const vaccineName = choice === OTHER ? customName.trim() : choice
  const canSave = vaccineName.length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= today

  const history = useMemo(
    () => [...records].sort((a, b) => b.date.localeCompare(a.date)),
    [records],
  )

  async function saveRecords(next: VaccinationRecord[]) {
    return quickWrite(() => db.settings.update('default', { vaccinations: next }))
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!canSave) return
    const ok = await saveRecords([
      ...records,
      { id: newId(), vaccine: vaccineName, date, notes: notes.trim() || undefined },
    ])
    if (ok) {
      setShowForm(false)
      setNotes('')
      setCustomName('')
      setDate(today)
    }
  }

  async function handleDelete(id: string) {
    await saveRecords(records.filter((r) => r.id !== id))
  }

  return (
    <section className="rounded-3xl bg-white/85 dark:bg-slate-900/90 backdrop-blur-md border border-white/90 dark:border-slate-800 p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Carnet de vaccination</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Vaccins recommandés avec une MICI
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
        >
          <Plus className="w-4 h-4" />
          Ajouter
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 space-y-2.5"
        >
          <select
            value={choice}
            onChange={(e) => setChoice(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white"
          >
            {VACCINE_PRESETS.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
            <option value={OTHER}>Autre vaccin…</option>
          </select>
          {choice === OTHER && (
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Nom du vaccin (ex : Hépatite A)"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
            />
          )}
          <label className="flex items-center justify-between gap-3 text-sm text-slate-700 dark:text-slate-200">
            <span>Date</span>
            <input
              type="date"
              value={date}
              max={today}
              onChange={(e) => setDate(e.target.value)}
              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold"
            />
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Note (facultatif : n° de lot, lieu…)"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!canSave}
              className="flex-1 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-semibold"
            >
              Enregistrer
            </button>
          </div>
        </form>
      )}

      {/* État de chaque vaccin recommandé */}
      <ul className="space-y-2">
        {VACCINE_PRESETS.map((preset) => {
          const status = getVaccineStatus(preset, records, today)
          return (
            <li
              key={preset.id}
              className="p-3 rounded-2xl bg-slate-50/90 dark:bg-slate-800/50 space-y-1"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {preset.name}
                </span>
                <span
                  className={`shrink-0 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${TONE_STYLES[status.tone]}`}
                >
                  {status.text}
                </span>
              </div>
              <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                {status.lastDate ? `Dernier : ${formatShortDateFr(status.lastDate)} · ` : ''}
                {preset.advice}
              </p>
            </li>
          )
        })}
      </ul>

      {/* Vaccins vivants */}
      <div className="rounded-2xl border border-rose-300/60 dark:border-rose-800/50 bg-rose-50/70 dark:bg-rose-950/20">
        <button
          type="button"
          onClick={() => setShowLive((v) => !v)}
          className="w-full flex items-center justify-between gap-2 p-3 text-left"
        >
          <span className="flex items-center gap-2 text-xs font-semibold text-rose-800 dark:text-rose-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Vaccins vivants interdits sous immunosuppresseurs
          </span>
          <ChevronDown
            className={`w-4 h-4 shrink-0 text-rose-700 dark:text-rose-300 transition-transform ${showLive ? 'rotate-180' : ''}`}
          />
        </button>
        {showLive && (
          <div className="px-3 pb-3 space-y-1.5 text-[11px] leading-relaxed text-rose-900 dark:text-rose-200">
            <ul className="list-disc pl-4">
              {LIVE_VACCINES.map((v) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
            <p>
              Sous biothérapie, Imurel ou méthotrexate, ces vaccins sont contre-indiqués. Signalez
              toujours votre traitement avant un vaccin, surtout avant un voyage.
            </p>
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Historique
          </p>
          {history.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 text-xs"
            >
              <div className="min-w-0">
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {formatShortDateFr(r.date)}
                </span>
                <span className="text-slate-600 dark:text-slate-300"> · {r.vaccine}</span>
                {r.notes && (
                  <span className="block truncate text-slate-400">{r.notes}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(r.id)}
                aria-label={`Supprimer ${r.vaccine} du ${formatShortDateFr(r.date)}`}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] leading-relaxed text-slate-400">
        Informations générales : votre calendrier de vaccination se décide avec votre médecin ou
        votre gastro-entérologue.
      </p>
    </section>
  )
}
