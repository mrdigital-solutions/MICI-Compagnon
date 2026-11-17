import { CalendarCheck2 } from 'lucide-react'
import { useState } from 'react'
import { TREATMENT_PRESETS } from '../../config/support'
import { initializeInjectionSchedule } from '../../db/database'
import type { InjectionSite } from '../../types'
import { getTodayKey } from '../../utils/dateUtils'
import { isOralTreatment } from '../../utils/treatment'
import { InjectionSiteSelector } from './InjectionSiteSelector'

interface SetupScheduleModalProps {
  initialTreatmentName?: string
  initialCycleDays?: number
  onDone: () => void
  onCancel?: () => void
}

export function SetupScheduleModal({
  initialTreatmentName = 'Yuflima 80 mg',
  initialCycleDays = 14,
  onDone,
  onCancel,
}: SetupScheduleModalProps) {
  const [treatmentName, setTreatmentName] = useState<string>(initialTreatmentName)
  const [nextDate, setNextDate] = useState<string>(getTodayKey())
  const [cycleDays, setCycleDays] = useState<number>(initialCycleDays)
  const [lastSite, setLastSite] = useState<InjectionSite>('ventre_droite')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await initializeInjectionSchedule({
        treatmentName,
        nextInjectionDate: nextDate,
        cycleDays,
        lastSite: isOralTreatment(treatmentName) ? undefined : lastSite,
      })
      onDone()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-3xl bg-[#FFFCF8]/90 dark:bg-slate-900 border border-amber-200/60 dark:border-slate-800 p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-400">
          <CalendarCheck2 className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Planifier votre traitement
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configurez votre traitement et votre prochaine prise pour générer le calendrier.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            Traitement & dosage
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {TREATMENT_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => {
                  setTreatmentName(preset.name)
                  setCycleDays(preset.cycleDays)
                }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                  treatmentName === preset.name
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {preset.name}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={treatmentName}
            onChange={(e) => setTreatmentName(e.target.value)}
            placeholder="Ex: Yuflima 80 mg, Humira 40 mg..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white"
            required
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              {isOralTreatment(treatmentName) ? 'Prochaine prise' : 'Prochaine injection'}
            </label>
            <input
              type="date"
              value={nextDate}
              onChange={(e) => setNextDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Fréquence (jours)
            </label>
            <input
              type="number"
              min={1}
              max={120}
              value={cycleDays}
              onChange={(e) => setCycleDays(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white"
              required
            />
          </div>
        </div>

        {!isOralTreatment(treatmentName) && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Dernière zone utilisée (pour calculer la rotation)
            </label>
            <InjectionSiteSelector value={lastSite} onChange={setLastSite} />
          </div>
        )}

        <div className="flex gap-2.5 pt-1">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300"
            >
              Annuler
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors"
          >
            {saving ? 'Génération...' : 'Générer le calendrier'}
          </button>
        </div>
      </form>
    </div>
  )
}
