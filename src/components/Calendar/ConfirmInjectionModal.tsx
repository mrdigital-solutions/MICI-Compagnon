import { Syringe, X } from 'lucide-react'
import { useState } from 'react'
import { getAllowedSites, getNextRecommendedSite, markInjectionDone } from '../../db/database'
import { describeSaveError, withSaveTimeout } from '../../db/dbHealth'
import { SaveError } from '../Common/SaveError'
import type { InjectionRecord, InjectionSite, InjectionZonePreference } from '../../types'
import { getTodayKey } from '../../utils/dateUtils'
import { isOralTreatment } from '../../utils/treatment'
import { InjectionSiteSelector } from './InjectionSiteSelector'

interface ConfirmInjectionModalProps {
  injection: InjectionRecord
  treatmentName: string
  lastSite?: InjectionSite
  zonePreference?: InjectionZonePreference
  onClose: () => void
}

export function ConfirmInjectionModal({
  injection,
  treatmentName,
  lastSite,
  zonePreference,
  onClose,
}: ConfirmInjectionModalProps) {
  const oral = isOralTreatment(treatmentName)
  // Le site prévu est gardé seulement s'il fait partie des zones choisies
  const plannedSiteAllowed =
    injection.site !== undefined &&
    getAllowedSites(zonePreference).some((s) => s.id === injection.site)
  const recommendedSite =
    plannedSiteAllowed && injection.site
      ? injection.site
      : getNextRecommendedSite(lastSite, zonePreference)
  const [site, setSite] = useState<InjectionSite>(recommendedSite)
  const [actualDate, setActualDate] = useState<string>(getTodayKey())
  const [notes, setNotes] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!injection.id) return
    setSaving(true)
    setSaveError(null)
    try {
      await withSaveTimeout(() =>
        markInjectionDone({
          injectionId: injection.id!,
          site: oral ? undefined : site,
          actualDate,
          notes,
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
            <div className="p-2 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400">
              <Syringe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {oral ? 'Valider la prise' : "Valider l'injection"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{treatmentName}</p>
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
              {oral ? 'Date réelle de la prise' : "Date réelle d'injection"}
            </label>
            <input
              type="date"
              value={actualDate}
              onChange={(e) => setActualDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white"
              required
            />
          </div>

          {!oral && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Point d'injection (rotation)
              </label>
              <InjectionSiteSelector
                value={site}
                recommendedSite={recommendedSite}
                onChange={setSite}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Remarque (optionnel)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Légère rougeur au point d'injection..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
            />
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
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
            >
              {saving ? 'Validation...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
