import {
  AlertCircle,
  BellPlus,
  BellRing,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  MapPin,
  Package,
  Stethoscope,
  Syringe,
  Thermometer,
} from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { db, getNextRecommendedSite, getSiteLabel } from '../../db/database'
import { INJECTION_SITES, type AppSettings, type DailyEntry, type InjectionRecord } from '../../types'
import {
  diffDays,
  formatDateFr,
  formatMonthYearFr,
  formatShortDateFr,
  getMonthGrid,
  getTodayKey,
} from '../../utils/dateUtils'
import { downloadInjectionIcs } from '../../utils/icsCalendar'
import { WellnessTipTicker } from '../Wellness/WellnessTipTicker'
import { ConfirmInjectionModal } from './ConfirmInjectionModal'
import { ShiftInjectionModal } from './ShiftInjectionModal'

interface CalendarTabProps {
  settings: AppSettings
  onSelectDay: (dateKey: string) => void
}

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

function getSymptomDotClass(entry: DailyEntry): string {
  const maxScore = Math.max(
    entry.digestivePain,
    entry.jointPain,
    entry.fatigue,
    entry.migraine ?? 0,
  )
  if (entry.feverOrInfection || maxScore >= 4) return 'bg-rose-500'
  if (maxScore === 3) return 'bg-orange-500'
  if (maxScore >= 1) return 'bg-amber-400'
  return 'bg-emerald-500'
}

export function CalendarTab({ settings, onSelectDay }: CalendarTabProps) {
  const today = getTodayKey()
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth())

  const [confirmTarget, setConfirmTarget] = useState<InjectionRecord | null>(null)
  const [shiftTarget, setShiftTarget] = useState<InjectionRecord | null>(null)

  const injections = useLiveQuery(() => db.injections.orderBy('scheduledDate').toArray(), [])
  const dailyEntries = useLiveQuery(() => db.dailyEntries.toArray(), [])

  const entriesByDate = useMemo(() => {
    const map = new Map<string, DailyEntry>()
    for (const e of dailyEntries ?? []) {
      map.set(e.date, e)
    }
    return map
  }, [dailyEntries])

  const injectionsByDate = useMemo(() => {
    const map = new Map<string, InjectionRecord[]>()
    for (const inj of injections ?? []) {
      const key = inj.status === 'done' && inj.actualDate ? inj.actualDate : inj.scheduledDate
      const list = map.get(key) ?? []
      list.push(inj)
      map.set(key, list)
    }
    return map
  }, [injections])

  const nextPlanned = useMemo(
    () => (injections ?? []).find((inj) => inj.status === 'planned'),
    [injections],
  )

  const recentHistory = useMemo(
    () =>
      (injections ?? [])
        .filter((inj) => inj.status === 'done' || inj.status === 'shifted')
        .slice(-5)
        .reverse(),
    [injections],
  )

  const calmDaysCount = useMemo(() => {
    const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`
    return (dailyEntries ?? []).filter((e) => {
      if (!e.date.startsWith(monthPrefix)) return false
      const maxScore = Math.max(
        e.digestivePain,
        e.jointPain,
        e.fatigue,
        e.migraine ?? 0,
      )
      return maxScore <= 1 && !e.feverOrInfection
    }).length
  }, [dailyEntries, viewYear, viewMonth])

  const grid = useMemo(() => getMonthGrid(viewYear, viewMonth), [viewYear, viewMonth])

  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1)
      setViewMonth(11)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1)
      setViewMonth(0)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  function goToToday() {
    const d = new Date()
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
  }

  const daysUntilNext = nextPlanned ? diffDays(today, nextPlanned.scheduledDate) : null
  const recommendedSite =
    nextPlanned?.site ?? getNextRecommendedSite(settings.lastInjectionSite)

  async function adjustStock(delta: number) {
    const current = settings.penStock ?? 0
    const next = Math.max(0, current + delta)
    await db.settings.update('default', { penStock: next })
  }

  return (
    <div className="space-y-4">
      {/* Reminder Banner (J-1 or J-0 or overdue) */}
      {nextPlanned && daysUntilNext !== null && daysUntilNext <= 1 && (
        <div
          className={`rounded-2xl p-3.5 border backdrop-blur-md flex items-center gap-3 shadow-xs ${
            daysUntilNext < 0
              ? 'bg-rose-50/90 border-rose-200 text-rose-900 dark:bg-rose-950/50 dark:border-rose-800/60 dark:text-rose-200'
              : daysUntilNext === 0
                ? 'bg-white/85 border-teal-200 text-slate-800 dark:bg-teal-950/50 dark:border-teal-800/60 dark:text-teal-100'
                : 'bg-amber-50/90 border-amber-200 text-amber-950 dark:bg-amber-950/40 dark:border-amber-800/60 dark:text-amber-100'
          }`}
        >
          <div
            className={`p-2 rounded-xl shrink-0 ${
              daysUntilNext < 0
                ? 'bg-rose-500/15 text-rose-600'
                : daysUntilNext === 0
                  ? 'bg-teal-500/15 text-teal-600'
                  : 'bg-amber-500/15 text-amber-600'
            }`}
          >
            {daysUntilNext < 0 ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <BellRing className="w-5 h-5" />
            )}
          </div>
          <div className="text-xs leading-relaxed">
            <p className="font-bold">
              {daysUntilNext < 0
                ? `Injection en retard de ${Math.abs(daysUntilNext)} jour${Math.abs(daysUntilNext) > 1 ? 's' : ''}`
                : daysUntilNext === 0
                  ? `Jour J : Injection ${settings.treatmentName} prévue aujourd'hui`
                  : `Rappel J-1 : Injection ${settings.treatmentName} prévue demain`}
            </p>
            <p className="text-slate-600 dark:text-slate-300 mt-0.5">
              Zone recommandée : <strong>{getSiteLabel(recommendedSite)}</strong>. Pensez à vérifier
              l'absence de fièvre ou d'infection avant l'injection.
            </p>
          </div>
        </div>
      )}

      {/* Responsive 2-column grid on desktop, single column on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left column: Next injection + Rotation + History */}
        <div className="lg:col-span-5 space-y-4">
          {nextPlanned && (
            <section className="rounded-3xl bg-white/85 dark:bg-slate-900/90 backdrop-blur-md p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/90 dark:border-slate-800">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                    <Syringe className="w-3.5 h-3.5" />
                    Prochaine injection · {settings.treatmentName}
                  </span>
                  <h2 className="text-xl font-extrabold capitalize mt-1 text-slate-900 dark:text-white">
                    {formatDateFr(nextPlanned.scheduledDate)}
                  </h2>
                </div>
                <span className="shrink-0 px-3 py-1 rounded-full text-xs font-bold bg-teal-50 dark:bg-teal-900/50 text-teal-700 dark:text-teal-200 border border-teal-200/60 dark:border-teal-700/40">
                  {daysUntilNext === 0
                    ? "Aujourd'hui"
                    : daysUntilNext === 1
                      ? 'Demain'
                      : daysUntilNext !== null && daysUntilNext < 0
                        ? `J+${Math.abs(daysUntilNext)}`
                        : `Dans ${daysUntilNext} j`}
                </span>
              </div>

              {/* Rotation sites mini-strip */}
              <div className="mt-4 p-3 rounded-2xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    Rotation recommandée
                  </span>
                  <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-300">
                    Cycle {settings.cycleDays} j
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {INJECTION_SITES.map((s) => {
                    const isRec = s.id === recommendedSite
                    return (
                      <div
                        key={s.id}
                        className={`text-center py-1.5 px-1 rounded-xl text-[11px] font-semibold transition-all ${
                          isRec
                            ? 'bg-teal-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-900/70 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/50'
                        }`}
                      >
                        {s.shortLabel}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmTarget(nextPlanned)}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-sm shadow-teal-600/20 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Valider
                </button>
                <button
                  type="button"
                  onClick={() => setShiftTarget(nextPlanned)}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl bg-amber-50 hover:bg-amber-100/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-amber-900 dark:text-slate-200 border border-amber-200/70 dark:border-slate-700 font-semibold text-xs sm:text-sm transition-colors"
                >
                  <CalendarClock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Décaler
                </button>
              </div>

              <button
                type="button"
                onClick={() => downloadInjectionIcs(nextPlanned, settings.treatmentName)}
                className="mt-2.5 w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-100/80 hover:bg-slate-200/70 dark:bg-slate-800/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
              >
                <BellPlus className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                Ajouter le rappel à mon Agenda (.ics)
              </button>

              {/* Pen Stock tracker */}
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600 dark:text-slate-300">
                    Stock :{' '}
                    <strong
                      className={
                        (settings.penStock ?? 0) <= 1
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-slate-900 dark:text-white'
                      }
                    >
                      {settings.penStock ?? 0} stylo{(settings.penStock ?? 0) > 1 ? 's' : ''}
                    </strong>
                  </span>
                  {settings.penStock !== undefined && settings.penStock <= 1 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                      Pharmacie !
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => adjustStock(-1)}
                    className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200"
                  >
                    -1
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustStock(2)}
                    className="px-2 py-1 rounded-lg bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 font-bold hover:bg-teal-100"
                  >
                    +1 boîte (+2)
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Rotating Wellness & Lifestyle Tip */}
          <WellnessTipTicker />

          {/* Upcoming Medical Appointments */}
          {(settings.nextDoctorAppointment || settings.nextLabDate) && (
            <section className="rounded-3xl bg-white/80 dark:bg-slate-900/90 backdrop-blur-md border border-white/90 dark:border-slate-800 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Prochains rendez-vous
              </h3>
              {settings.nextDoctorAppointment && (
                <div className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 text-xs">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-100">
                        Gastro-entérologue
                      </p>
                      <p className="text-[11px] text-slate-500 capitalize">
                        {formatDateFr(settings.nextDoctorAppointment, {
                          day: 'numeric',
                          month: 'long',
                        })}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 font-bold text-[11px]">
                    {(() => {
                      const d = diffDays(today, settings.nextDoctorAppointment)
                      return d === 0 ? "Aujourd'hui" : d > 0 ? `J-${d}` : `Passé`
                    })()}
                  </span>
                </div>
              )}
              {settings.nextLabDate && (
                <div className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 text-xs">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-100">
                        Prise de sang / Bilan
                      </p>
                      <p className="text-[11px] text-slate-500 capitalize">
                        {formatDateFr(settings.nextLabDate, {
                          day: 'numeric',
                          month: 'long',
                        })}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-bold text-[11px]">
                    {(() => {
                      const d = diffDays(today, settings.nextLabDate)
                      return d === 0 ? "Aujourd'hui" : d > 0 ? `J-${d}` : `Passé`
                    })()}
                  </span>
                </div>
              )}
            </section>
          )}

          {/* Recent Injection History */}
          {recentHistory.length > 0 && (
            <section className="rounded-3xl bg-white/80 dark:bg-slate-900/90 backdrop-blur-md border border-white/90 dark:border-slate-800 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                Historique récent
              </h3>
              <div className="space-y-2">
                {recentHistory.map((inj) => (
                  <div
                    key={inj.id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          inj.status === 'done' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {inj.status === 'done'
                            ? `Réalisée le ${formatShortDateFr(inj.actualDate ?? inj.scheduledDate)}`
                            : `Décalée le ${formatShortDateFr(inj.scheduledDate)} (${
                                inj.shiftDays && inj.shiftDays > 0 ? `+${inj.shiftDays}` : inj.shiftDays
                              } j)`}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {inj.status === 'done'
                            ? getSiteLabel(inj.site)
                            : inj.shiftReason || 'Report'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-slate-400 shrink-0">
                      {inj.doseMg} mg
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right column: Monthly Calendar */}
        <section className="lg:col-span-7 rounded-3xl bg-white/85 dark:bg-slate-900/90 backdrop-blur-md border border-white/90 dark:border-slate-800 p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {formatMonthYearFr(viewYear, viewMonth)}
                </h3>
                {calmDaysCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                    ✨ {calmDaysCount} jour{calmDaysCount > 1 ? 's' : ''} calme{calmDaysCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Touchez un jour pour saisir vos symptômes
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={goToToday}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/40 hover:bg-teal-100/80 transition-colors"
              >
                Aujourd'hui
              </button>
              <button
                type="button"
                onClick={prevMonth}
                aria-label="Mois précédent"
                className="p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                aria-label="Mois suivant"
                className="p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 mb-2">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 py-1"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {grid.map((cell) => {
              const dayInjections = injectionsByDate.get(cell.dateKey) ?? []
              const entry = entriesByDate.get(cell.dateKey)
              const hasDone = dayInjections.some((i) => i.status === 'done')
              const hasPlanned = dayInjections.some((i) => i.status === 'planned')
              const hasShifted = dayInjections.some((i) => i.status === 'shifted')

              return (
                <button
                  key={cell.dateKey}
                  type="button"
                  onClick={() => onSelectDay(cell.dateKey)}
                  className={`relative h-14 sm:h-16 rounded-2xl flex flex-col items-center justify-between py-2 transition-all border ${
                    cell.isToday
                      ? 'border-teal-500 bg-teal-50/90 dark:bg-teal-900/30 font-bold shadow-2xs'
                      : hasPlanned
                        ? 'border-teal-300/80 bg-teal-50/50 dark:bg-teal-900/15'
                        : 'border-slate-100/80 dark:border-slate-800/60 bg-white/60 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800/70'
                  } ${
                    cell.isCurrentMonth
                      ? 'text-slate-800 dark:text-slate-100'
                      : 'text-slate-400 dark:text-slate-600 opacity-45'
                  }`}
                >
                  <span className="text-xs leading-none">{cell.dayNumber}</span>

                  <div className="flex items-center justify-center gap-1 min-h-[12px]">
                    {hasDone && (
                      <span
                        title="Injection réalisée"
                        className="w-2.5 h-2.5 rounded-full bg-emerald-500"
                      />
                    )}
                    {hasPlanned && (
                      <span
                        title="Injection prévue"
                        className="w-2.5 h-2.5 rounded-full bg-teal-500 ring-2 ring-teal-500/25"
                      />
                    )}
                    {hasShifted && (
                      <span
                        title="Injection décalée"
                        className="w-2.5 h-2.5 rounded-full bg-amber-500"
                      />
                    )}
                    {entry && (
                      <span
                        title="Journal saisi"
                        className={`w-2.5 h-2.5 rounded-full ${getSymptomDotClass(entry)}`}
                      />
                    )}
                    {entry?.feverOrInfection && (
                      <Thermometer className="w-3 h-3 text-rose-500" />
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500" /> Injection prévue
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Faite / Sans douleur
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Décalée / Légers
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Poussée / Fièvre
            </span>
          </div>
        </section>
      </div>

      {confirmTarget && (
        <ConfirmInjectionModal
          injection={confirmTarget}
          lastSite={settings.lastInjectionSite}
          onClose={() => setConfirmTarget(null)}
        />
      )}

      {shiftTarget && (
        <ShiftInjectionModal
          injection={shiftTarget}
          cycleDays={settings.cycleDays}
          onClose={() => setShiftTarget(null)}
        />
      )}
    </div>
  )
}
