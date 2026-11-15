import { CalendarClock, X } from 'lucide-react'
import { useState } from 'react'
import { shiftInjectionAndRecalculate } from '../../db/database'
import type { InjectionRecord } from '../../types'
import { addDays, formatDateFr } from '../../utils/dateUtils'

interface ShiftInjectionModalProps {
  injection: InjectionRecord
  cycleDays: number
  onClose: () => void
}

const REASON_PRESETS = [
  'Fièvre / Infection',
  'Traitement antibiotique',
  'Voyage / Déplacement',
  'Oubli',
  'Avis médical',
]

export function ShiftInjectionModal({
  injection,
  cycleDays,
  onClose,
}: ShiftInjectionModalProps) {
  const [shiftDays, setShiftDays] = useState<number>(3)
  const [reason, setReason] = useState<string>('Fièvre / Infection')
  const [saving, setSaving] = useState(false)

  const newDate = addDays(injection.scheduledDate, shiftDays)
  const nextCycleDate = addDays(newDate, cycleDays)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!injection.id || shiftDays === 0) return
    setSaving(true)
    try {
      await shiftInjectionAndRecalculate({
        injectionId: injection.id,
        shiftDays,
        reason,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Décaler l'injection
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Prévue initialement le {formatDateFr(injection.scheduledDate, { day: 'numeric', month: 'long' })}
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Nombre de jours de décalage
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 5, 7].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setShiftDays(d)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                    shiftDays === d
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  +{d}j
                </button>
              ))}
            </div>
            <div className="mt-2.5 flex items-center gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400">Autre durée :</span>
              <input
                type="number"
                min={-14}
                max={30}
                value={shiftDays}
                onChange={(e) => setShiftDays(Number(e.target.value))}
                className="w-24 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white"
              />
              <span className="text-xs text-slate-500 dark:text-slate-400">jours</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Motif du décalage
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {REASON_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setReason(preset)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    reason === preset
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Préciser le motif..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/25 p-3.5 text-xs space-y-1">
            <p className="font-semibold text-amber-800 dark:text-amber-300">
              Recalcul automatique du calendrier
            </p>
            <p className="text-slate-700 dark:text-slate-300">
              Nouvelle date : <strong className="capitalize">{formatDateFr(newDate)}</strong>
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              Injection suivante (+{cycleDays} j) :{' '}
              <span className="capitalize">{formatDateFr(nextCycleDate)}</span>
            </p>
          </div>

          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || shiftDays === 0}
              className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
            >
              {saving ? 'Enregistrement...' : 'Confirmer le décalage'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
