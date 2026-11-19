import { CalendarClock, X } from 'lucide-react'
import { useState } from 'react'
import { shiftInjectionAndRecalculate } from '../../db/database'
import { describeSaveError, withSaveTimeout } from '../../db/dbHealth'
import { SaveError } from '../Common/SaveError'
import type { InjectionRecord } from '../../types'
import { addDays, diffDays, formatDateFr, getTodayKey } from '../../utils/dateUtils'

interface ShiftInjectionModalProps {
  injection: InjectionRecord
  cycleDays: number
  onClose: () => void
}

const DELAY_REASONS = [
  'Fièvre / Infection',
  'Traitement antibiotique',
  'Voyage / Déplacement',
  'Oubli',
  'Avis médical',
]

const ADVANCE_REASONS = ['Voyage / Déplacement', 'Avis médical', 'Organisation perso']

const DELAY_PRESETS = [1, 2, 3, 5, 7]
const ADVANCE_PRESETS = [1, 2, 3, 4, 5]

export function ShiftInjectionModal({
  injection,
  cycleDays,
  onClose,
}: ShiftInjectionModalProps) {
  const today = getTodayKey()
  // Nombre de jours dont on peut avancer au maximum (pas avant aujourd'hui)
  const maxAdvance = Math.max(0, diffDays(today, injection.scheduledDate))
  const canAdvance = maxAdvance > 0
  // Injection en retard : le report ne peut pas tomber avant aujourd'hui
  const overdueDays = Math.max(0, diffDays(injection.scheduledDate, today))
  const minDelay = Math.max(1, overdueDays)
  const delayPresets =
    overdueDays > 0 ? [0, 1, 2, 4, 6].map((o) => minDelay + o) : DELAY_PRESETS
  const defaultDelay = overdueDays > 0 ? minDelay : 3

  const [direction, setDirection] = useState<'later' | 'earlier'>('later')
  const [days, setDays] = useState<number>(defaultDelay)
  const [reason, setReason] = useState<string>('Fièvre / Infection')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const isEarlier = direction === 'earlier'
  const shiftDays = isEarlier ? -days : days
  const newDate = addDays(injection.scheduledDate, shiftDays)
  const nextCycleDate = addDays(newDate, cycleDays)
  const presets = isEarlier
    ? ADVANCE_PRESETS.filter((d) => d <= maxAdvance)
    : delayPresets
  const reasonPresets = isEarlier ? ADVANCE_REASONS : DELAY_REASONS
  const tooEarly = isEarlier ? days > maxAdvance : days < minDelay
  const invalid = days <= 0 || tooEarly

  function chooseDirection(next: 'later' | 'earlier') {
    setDirection(next)
    if (next === 'earlier') {
      setDays(Math.min(2, maxAdvance))
      setReason(ADVANCE_REASONS[0])
    } else {
      setDays(defaultDelay)
      setReason(DELAY_REASONS[0])
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!injection.id || invalid) return
    setSaving(true)
    setSaveError(null)
    try {
      await withSaveTimeout(() =>
        shiftInjectionAndRecalculate({
          injectionId: injection.id!,
          shiftDays,
          reason,
        }),
      )
      onClose()
    } catch (err) {
      setSaveError(describeSaveError(err))
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
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => chooseDirection('earlier')}
              disabled={!canAdvance}
              className={`py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 ${
                isEarlier
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Avancer
            </button>
            <button
              type="button"
              onClick={() => chooseDirection('later')}
              className={`py-2 rounded-lg text-sm font-semibold transition-colors ${
                !isEarlier
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Reporter
            </button>
          </div>
          {!canAdvance && (
            <p className="-mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              L'injection est prévue aujourd'hui ou est déjà passée : elle ne peut plus être avancée.
              Si vous l'avez faite, appuyez simplement sur « Valider ».
            </p>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              {isEarlier ? 'Avancer de combien de jours ?' : 'Reporter de combien de jours ?'}
            </label>
            <div className="flex items-center gap-2">
              {presets.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                    days === d
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {isEarlier ? '−' : '+'}
                  {d}j
                </button>
              ))}
            </div>
            <div className="mt-2.5 flex items-center gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400">Autre durée :</span>
              <input
                type="number"
                min={isEarlier ? 1 : minDelay}
                max={isEarlier ? maxAdvance : 30 + overdueDays}
                value={days}
                onChange={(e) => setDays(Math.abs(Number(e.target.value)))}
                className="w-24 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white"
              />
              <span className="text-xs text-slate-500 dark:text-slate-400">jours</span>
            </div>
            {tooEarly && (
              <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
                {isEarlier
                  ? `Impossible d'avancer avant aujourd'hui (maximum ${maxAdvance} j).`
                  : `Impossible de reporter à une date déjà passée (minimum ${minDelay} j).`}
              </p>
            )}
            {!isEarlier && overdueDays > 0 && !tooEarly && (
              <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                L'injection a {overdueDays} jour{overdueDays > 1 ? 's' : ''} de retard : +{minDelay}j
                correspond à aujourd'hui.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Motif
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {reasonPresets.map((preset) => (
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

          <SaveError message={saveError} />

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
              disabled={saving || invalid}
              className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
            >
              {saving ? 'Enregistrement...' : isEarlier ? 'Confirmer l’avance' : 'Confirmer le report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
