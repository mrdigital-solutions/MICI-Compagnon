import { CalendarCheck2 } from 'lucide-react'
import { useState } from 'react'
import { db, initializeInjectionSchedule } from '../../db/database'
import type { InjectionSite } from '../../types'
import { getTodayKey } from '../../utils/dateUtils'
import { isOralTreatment, isPresetTreatment } from '../../utils/treatment'
import {
  SecondaryTreatmentFields,
  type SecondaryTreatmentValue,
} from '../Treatment/SecondaryTreatmentFields'
import { TreatmentSelect } from '../Treatment/TreatmentSelect'
import { InjectionSiteSelector } from './InjectionSiteSelector'

interface SetupScheduleModalProps {
  initialTreatmentName?: string
  initialCycleDays?: number
  onDone: () => void
  onCancel?: () => void
  /**
   * Affiche le 2e traitement (combothérapie). Activé à la première ouverture ;
   * désactivé pour « Replanifier », où les Paramètres le gèrent déjà.
   */
  includeSecondary?: boolean
}

export function SetupScheduleModal({
  initialTreatmentName = 'Yuflima 80 mg',
  initialCycleDays = 14,
  onDone,
  onCancel,
  includeSecondary = false,
}: SetupScheduleModalProps) {
  const [treatmentName, setTreatmentName] = useState<string>(initialTreatmentName)
  const [treatmentIsCustom, setTreatmentIsCustom] = useState(
    () => !isPresetTreatment(initialTreatmentName),
  )
  const [nextDate, setNextDate] = useState<string>(getTodayKey())
  const [cycleDays, setCycleDays] = useState<number>(initialCycleDays)
  const [lastSite, setLastSite] = useState<InjectionSite>('ventre_droite')
  const [saving, setSaving] = useState(false)
  const [secondary, setSecondary] = useState<SecondaryTreatmentValue>({
    name: '',
    isCustom: false,
    cycleDays: 7,
    nextDate: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      // Enregistré en premier : générer le calendrier ferme la fenêtre de première ouverture
      const secondaryName = secondary.name.trim()
      if (includeSecondary && secondaryName) {
        await db.settings.update('default', {
          secondaryTreatmentName: secondaryName,
          secondaryCycleDays: secondary.cycleDays,
          secondaryNextDate: secondary.nextDate || getTodayKey(),
        })
      }
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
          <label
            htmlFor="setup-treatment"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1"
          >
            Traitement principal
          </label>
          <TreatmentSelect
            id="setup-treatment"
            value={treatmentName}
            isCustom={treatmentIsCustom}
            onChange={({ name, isCustom, preset }) => {
              setTreatmentName(name)
              setTreatmentIsCustom(isCustom)
              if (preset) setCycleDays(preset.cycleDays)
            }}
            required
          />
        </div>

        {includeSecondary && (
          <SecondaryTreatmentFields
            id="setup-secondary-treatment"
            value={secondary}
            onChange={setSecondary}
          />
        )}
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
              Cycle principal (en jours)
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
