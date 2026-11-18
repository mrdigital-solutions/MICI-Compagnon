import { TREATMENT_PRESETS, type TreatmentPreset } from '../../config/support'

const CUSTOM_VALUE = '__custom__'
const NONE_VALUE = ''

export interface TreatmentSelection {
  /** Nom du traitement ('' si « Aucun ») */
  name: string
  /** Vrai si l'utilisateur saisit librement le nom */
  isCustom: boolean
  /** Traitement de la liste choisi (pour reprendre son cycle par défaut) */
  preset?: TreatmentPreset
}

interface TreatmentSelectProps {
  id?: string
  value: string
  isCustom: boolean
  onChange: (selection: TreatmentSelection) => void
  /** Ajoute l'option « Aucun » (2e traitement optionnel) */
  allowNone?: boolean
  customPlaceholder?: string
  /** Rend la saisie libre obligatoire quand elle est affichée */
  required?: boolean
}

/**
 * Choix du traitement : liste déroulante des traitements courants (avec leur cycle)
 * et option « Autre traitement » qui ouvre une saisie libre.
 * Partagé entre la première ouverture et les Paramètres pour rester identique.
 */
export function TreatmentSelect({
  id,
  value,
  isCustom,
  onChange,
  allowNone = false,
  customPlaceholder = 'Nom et dosage du traitement...',
  required = false,
}: TreatmentSelectProps) {
  const selectValue = isCustom ? CUSTOM_VALUE : value

  function handleSelect(val: string) {
    if (val === NONE_VALUE) {
      onChange({ name: '', isCustom: false })
    } else if (val === CUSTOM_VALUE) {
      // Garde le nom courant comme point de départ de la saisie libre
      onChange({ name: value, isCustom: true })
    } else {
      onChange({
        name: val,
        isCustom: false,
        preset: TREATMENT_PRESETS.find((p) => p.name === val),
      })
    }
  }

  return (
    <>
      <select
        id={id}
        value={selectValue}
        onChange={(e) => handleSelect(e.target.value)}
        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white"
      >
        {allowNone && <option value={NONE_VALUE}>Aucun</option>}
        {TREATMENT_PRESETS.map((p) => (
          <option key={p.name} value={p.name}>
            {p.name} ({p.cycleDays} j)
          </option>
        ))}
        <option value={CUSTOM_VALUE}>Autre traitement (saisie libre)...</option>
      </select>
      {isCustom && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange({ name: e.target.value, isCustom: true })}
          placeholder={customPlaceholder}
          aria-label="Nom du traitement"
          required={required}
          className="mt-2 w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white"
        />
      )}
    </>
  )
}
