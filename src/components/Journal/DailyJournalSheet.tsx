import { Check, Droplets, Flame, Minus, Plus, Thermometer, Utensils, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { db, upsertDailyEntry } from '../../db/database'
import {
  QUICK_TAGS,
  SUSPECTED_FOOD_PRESETS,
  type DailyEntry,
  type MoodLevel,
  type SleepQuality,
  type StoolConsistency,
} from '../../types'
import { formatDateFr } from '../../utils/dateUtils'

interface DailyJournalFormProps {
  dateKey: string
  onSaved?: () => void
  onClose?: () => void
  isModal?: boolean
}

const SLIDER_LEVELS = ['Aucune', 'Très légère', 'Légère', 'Modérée', 'Forte', 'Sévère']

function getSliderColor(value: number): string {
  if (value === 0) return 'bg-emerald-500/30'
  if (value <= 2) return 'bg-amber-400/50'
  if (value === 3) return 'bg-orange-500/60'
  return 'bg-rose-500/70'
}

function getBadgeColor(value: number): string {
  if (value === 0) return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
  if (value <= 2) return 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
  if (value === 3) return 'bg-orange-500/15 text-orange-700 dark:text-orange-300'
  return 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
}

const STOOL_CONSISTENCIES: { id: StoolConsistency; label: string }[] = [
  { id: 'normale', label: 'Normale' },
  { id: 'molle', label: 'Molle' },
  { id: 'liquide', label: 'Liquide' },
  { id: 'dure', label: 'Dure' },
]

const MOOD_OPTIONS: { id: MoodLevel; label: string }[] = [
  { id: 'serein', label: '😊 Serein' },
  { id: 'moyen', label: '😐 Moyen' },
  { id: 'anxieux', label: '😟 Anxieux' },
  { id: 'difficile', label: '😣 Difficile' },
]

const SLEEP_OPTIONS: { id: SleepQuality; label: string }[] = [
  { id: 'bon', label: 'Bon' },
  { id: 'moyen', label: 'Moyen' },
  { id: 'mauvais', label: 'Mauvais' },
]

export function DailyJournalForm({
  dateKey,
  onSaved,
  onClose,
  isModal = false,
}: DailyJournalFormProps) {
  const [digestivePain, setDigestivePain] = useState(0)
  const [jointPain, setJointPain] = useState(0)
  const [fatigue, setFatigue] = useState(0)
  const [migraine, setMigraine] = useState(0)
  const [feverOrInfection, setFeverOrInfection] = useState(false)
  const [stoolCount, setStoolCount] = useState<number>(1)
  const [stoolConsistency, setStoolConsistency] = useState<StoolConsistency>('normale')
  const [nocturnalStools, setNocturnalStools] = useState(false)
  const [bloodInStools, setBloodInStools] = useState(false)
  const [mood, setMood] = useState<MoodLevel | undefined>(undefined)
  const [sleepQuality, setSleepQuality] = useState<SleepQuality | undefined>(undefined)
  const [waterGlasses, setWaterGlasses] = useState<number>(4)
  const [suspectedFoods, setSuspectedFoods] = useState<string[]>([])
  const [customFood, setCustomFood] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [customTag, setCustomTag] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedToast, setSavedToast] = useState(false)

  useEffect(() => {
    let active = true
    db.dailyEntries.get(dateKey).then((entry: DailyEntry | undefined) => {
      if (!active) return
      if (entry) {
        setDigestivePain(entry.digestivePain)
        setJointPain(entry.jointPain)
        setFatigue(entry.fatigue)
        setMigraine(entry.migraine ?? 0)
        setFeverOrInfection(entry.feverOrInfection)
        setStoolCount(entry.stoolCount ?? 1)
        setStoolConsistency(entry.stoolConsistency ?? 'normale')
        setNocturnalStools(entry.nocturnalStools ?? false)
        setBloodInStools(entry.bloodInStools ?? false)
        setMood(entry.mood)
        setSleepQuality(entry.sleepQuality)
        setWaterGlasses(entry.waterGlasses ?? 4)
        setSuspectedFoods(entry.suspectedFoods ?? [])
        setTags(entry.tags ?? [])
        setNotes(entry.notes ?? '')
      } else {
        setDigestivePain(0)
        setJointPain(0)
        setFatigue(0)
        setMigraine(0)
        setFeverOrInfection(false)
        setStoolCount(1)
        setStoolConsistency('normale')
        setNocturnalStools(false)
        setBloodInStools(false)
        setMood(undefined)
        setSleepQuality(undefined)
        setWaterGlasses(4)
        setSuspectedFoods([])
        setTags([])
        setNotes('')
      }
    })
    return () => {
      active = false
    }
  }, [dateKey])

  function toggleTag(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  function handleAddCustomTag() {
    const trimmed = customTag.trim()
    if (!trimmed) return
    if (!tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed])
    }
    setCustomTag('')
  }

  function toggleFood(food: string) {
    setSuspectedFoods((prev) =>
      prev.includes(food) ? prev.filter((f) => f !== food) : [...prev, food],
    )
  }

  function handleAddCustomFood() {
    const trimmed = customFood.trim()
    if (!trimmed) return
    if (!suspectedFoods.includes(trimmed)) {
      setSuspectedFoods((prev) => [...prev, trimmed])
    }
    setCustomFood('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await upsertDailyEntry({
        date: dateKey,
        digestivePain,
        jointPain,
        fatigue,
        migraine,
        feverOrInfection,
        stoolCount,
        stoolConsistency,
        nocturnalStools,
        bloodInStools,
        mood,
        sleepQuality,
        waterGlasses,
        suspectedFoods,
        tags,
        notes: notes.trim(),
      })
      setSavedToast(true)
      setTimeout(() => setSavedToast(false), 1800)
      onSaved?.()
      if (isModal) onClose?.()
    } finally {
      setSaving(false)
    }
  }

  const allDisplayTags = Array.from(new Set([...QUICK_TAGS, ...tags]))
  const allDisplayFoods = Array.from(new Set([...SUSPECTED_FOOD_PRESETS, ...suspectedFoods]))

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Sliders */}
      <div className="space-y-4">
        {[
          {
            label: 'Douleurs digestives / transit',
            value: digestivePain,
            setter: setDigestivePain,
          },
          {
            label: 'Douleurs articulaires / lombaires',
            value: jointPain,
            setter: setJointPain,
          },
          {
            label: 'Fatigue / état général',
            value: fatigue,
            setter: setFatigue,
          },
          {
            label: 'Migraines / maux de tête',
            value: migraine,
            setter: setMigraine,
          },
        ].map((item) => (
          <div key={item.label} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {item.label}
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${getBadgeColor(
                  item.value,
                )}`}
              >
                {item.value}/5 · {SLIDER_LEVELS[item.value]}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={5}
              step={1}
              value={item.value}
              onChange={(e) => item.setter(Number(e.target.value))}
              className={`w-full symptom-slider ${getSliderColor(item.value)}`}
            />
            <div className="flex justify-between text-[10px] text-slate-400 px-1">
              <span>0</span>
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
              <span>5</span>
            </div>
          </div>
        ))}
      </div>

      {/* Transit & Selles */}
      <div className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Transit & Selles
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStoolCount((c) => Math.max(0, c - 1))}
              className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200"
              aria-label="Diminuer le nombre de selles"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center text-sm font-extrabold text-slate-900 dark:text-white">
              {stoolCount}
            </span>
            <button
              type="button"
              onClick={() => setStoolCount((c) => c + 1)}
              className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200"
              aria-label="Augmenter le nombre de selles"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {STOOL_CONSISTENCIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setStoolConsistency(c.id)}
              className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-colors ${
                stoolConsistency === c.id
                  ? c.id === 'liquide'
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setNocturnalStools((v) => !v)}
            className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-colors ${
              nocturnalStools
                ? 'bg-amber-500/15 border-amber-400 text-amber-800 dark:text-amber-300'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            Selles nocturnes
          </button>
          <button
            type="button"
            onClick={() => setBloodInStools((v) => !v)}
            className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-colors ${
              bloodInStools
                ? 'bg-rose-500/15 border-rose-400 text-rose-700 dark:text-rose-300'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            Présence de sang
          </button>
        </div>
      </div>

      {/* Fever / Infection toggle */}
      <button
        type="button"
        onClick={() => setFeverOrInfection((v) => !v)}
        className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
          feverOrInfection
            ? 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300'
            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-xl ${
              feverOrInfection
                ? 'bg-rose-500 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
            }`}
          >
            <Thermometer className="w-4 h-4" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold">Fièvre / Infection</p>
            <p className="text-[11px] opacity-80">
              À signaler avant une injection de biothérapie
            </p>
          </div>
        </div>
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center border ${
            feverOrInfection
              ? 'bg-rose-500 border-rose-500 text-white'
              : 'border-slate-300 dark:border-slate-600'
          }`}
        >
          {feverOrInfection && <Check className="w-4 h-4" />}
        </div>
      </button>

      {/* Bien-être : Moral, Sommeil & Hydratation */}
      <div className="p-3.5 rounded-2xl bg-sky-50/70 dark:bg-slate-800/50 border border-sky-200/60 dark:border-slate-700/60 space-y-3">
        <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
          Bien-être du jour
        </span>

        <div>
          <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">
            Moral / État d'esprit
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {MOOD_OPTIONS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMood((prev) => (prev === m.id ? undefined : m.id))}
                className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-colors ${
                  mood === m.id
                    ? 'bg-sky-600 text-white border-sky-600'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              Qualité du sommeil
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {SLEEP_OPTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSleepQuality((prev) => (prev === s.id ? undefined : s.id))}
                  className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-colors ${
                    sleepQuality === s.id
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              Hydratation (verres d'eau)
            </span>
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1">
              <button
                type="button"
                onClick={() => setWaterGlasses((w) => Math.max(0, w - 1))}
                className="p-1 text-slate-500 hover:text-slate-800"
                aria-label="Diminuer l'eau"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 dark:text-sky-300">
                <Droplets className="w-3.5 h-3.5" />
                {waterGlasses}
              </span>
              <button
                type="button"
                onClick={() => setWaterGlasses((w) => w + 1)}
                className="p-1 text-slate-500 hover:text-slate-800"
                aria-label="Augmenter l'eau"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Aliments suspectés */}
      <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-slate-800/50 border border-amber-200/60 dark:border-slate-700/60 space-y-2.5">
        <div className="flex items-center gap-1.5">
          <Utensils className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            Aliments suspectés (si douleur)
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {allDisplayFoods.map((food) => {
            const active = suspectedFoods.includes(food)
            return (
              <button
                key={food}
                type="button"
                onClick={() => toggleFood(food)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  active
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {food}
              </button>
            )
          })}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={customFood}
            onChange={(e) => setCustomFood(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddCustomFood()
              }
            }}
            placeholder="Autre aliment suspecté (ex: Oignon, Chocolat)..."
            className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
          />
          <button
            type="button"
            onClick={handleAddCustomFood}
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-800 dark:text-amber-300 hover:bg-amber-500/30"
            aria-label="Ajouter l'aliment"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick tags */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Flame className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Facteurs & Tags rapides
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {allDisplayTags.map((tag) => {
            const active = tags.includes(tag)
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  active
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {tag}
              </button>
            )
          })}
        </div>
        <div className="mt-2.5 flex gap-2">
          <input
            type="text"
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddCustomTag()
              }
            }}
            placeholder="Ajouter un tag personnalisé..."
            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
          />
          <button
            type="button"
            onClick={handleAddCustomTag}
            className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700"
            aria-label="Ajouter le tag"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Free text note */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
          Note libre
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Précisez vos symptômes, repas, transit, ressenti..."
          className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold text-sm shadow-sm transition-colors flex items-center justify-center gap-2"
      >
        {savedToast ? (
          <>
            <Check className="w-4 h-4" />
            Enregistré !
          </>
        ) : saving ? (
          'Enregistrement...'
        ) : (
          'Enregistrer la journée'
        )}
      </button>
    </form>
  )
}

interface DailyJournalSheetProps {
  dateKey: string | null
  onClose: () => void
}

export function DailyJournalSheet({ dateKey, onClose }: DailyJournalSheetProps) {
  if (!dateKey) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Journal quotidien
            </p>
            <h2 className="text-base font-bold capitalize text-slate-900 dark:text-white">
              {formatDateFr(dateKey)}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          <DailyJournalForm dateKey={dateKey} onClose={onClose} isModal />
        </div>
      </div>
    </div>
  )
}
