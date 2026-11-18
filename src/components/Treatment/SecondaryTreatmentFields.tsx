import { getTodayKey } from '../../utils/dateUtils'
import { TreatmentSelect } from './TreatmentSelect'

export interface SecondaryTreatmentValue {
  name: string
  isCustom: boolean
  cycleDays: number
  nextDate: string
}

interface SecondaryTreatmentFieldsProps {
  id: string
  value: SecondaryTreatmentValue
  onChange: (value: SecondaryTreatmentValue) => void
}

/** Vrai si un 2e traitement est choisi (ou en cours de saisie libre). */
function hasSecondaryTreatment(value: SecondaryTreatmentValue): boolean {
  return Boolean(value.name.trim()) || value.isCustom
}

/**
 * 2e traitement optionnel (combothérapie, ex. biothérapie + Méthotrexate / Imurel) :
 * choix du traitement, puis son cycle et sa prochaine prise.
 * Partagé entre la première ouverture et les Paramètres.
 */
export function SecondaryTreatmentFields({ id, value, onChange }: SecondaryTreatmentFieldsProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1"
      >
        2e traitement (Combothérapie · optionnel)
      </label>
      <TreatmentSelect
        id={id}
        value={value.name}
        isCustom={value.isCustom}
        allowNone
        customPlaceholder="Nom du 2e traitement (ex: Méthotrexate 15 mg)..."
        onChange={({ name, isCustom, preset }) => {
          onChange({
            ...value,
            name,
            isCustom,
            cycleDays: preset ? preset.cycleDays : value.cycleDays,
            nextDate: (name || isCustom) && !value.nextDate ? getTodayKey() : value.nextDate,
          })
        }}
      />
      {hasSecondaryTreatment(value) && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div>
            <label
              htmlFor={`${id}-cycle`}
              className="block text-[11px] font-semibold text-slate-500 mb-1"
            >
              Cycle 2e (jours)
            </label>
            <input
              id={`${id}-cycle`}
              type="number"
              min={1}
              max={120}
              value={value.cycleDays}
              onChange={(e) => onChange({ ...value, cycleDays: Number(e.target.value) })}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
            />
          </div>
          <div>
            <label
              htmlFor={`${id}-next`}
              className="block text-[11px] font-semibold text-slate-500 mb-1"
            >
              Prochaine prise
            </label>
            <input
              id={`${id}-next`}
              type="date"
              value={value.nextDate}
              onChange={(e) => onChange({ ...value, nextDate: e.target.value })}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
            />
          </div>
        </div>
      )}
    </div>
  )
}
