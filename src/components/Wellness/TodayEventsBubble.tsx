import { CalendarCheck, FlaskConical, Stethoscope, Syringe, X } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { getSiteLabel } from '../../db/database'
import type { AppSettings, InjectionRecord } from '../../types'
import { getTodayKey } from '../../utils/dateUtils'
import { isOralTreatment } from '../../utils/treatment'

const SEEN_KEY = 'mici_today_events_seen'

interface TodayEvent {
  id: string
  icon: ReactNode
  title: string
  detail?: string
}

interface TodayEventsBubbleProps {
  settings?: AppSettings
  nextPlanned?: InjectionRecord
}

function wasSeenToday(today: string): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === today
  } catch {
    return false
  }
}

function markSeen(today: string): void {
  try {
    localStorage.setItem(SEEN_KEY, today)
  } catch {
    // Stockage indisponible : la bulle réapparaîtra à la prochaine ouverture
  }
}

export function buildTodayEvents(
  settings: AppSettings,
  nextPlanned: InjectionRecord | undefined,
  today: string,
): TodayEvent[] {
  const events: TodayEvent[] = []

  if (nextPlanned && nextPlanned.scheduledDate === today) {
    const oral = isOralTreatment(settings.treatmentName)
    events.push({
      id: 'injection',
      icon: <Syringe className="w-5 h-5" />,
      title: `${oral ? 'Prise' : 'Injection'} ${settings.treatmentName} aujourd'hui`,
      detail: oral ? undefined : `Zone recommandée : ${getSiteLabel(nextPlanned.site)}`,
    })
  }

  if (settings.secondaryTreatmentName && settings.secondaryNextDate === today) {
    events.push({
      id: 'secondary',
      icon: <Syringe className="w-5 h-5" />,
      title: `${settings.secondaryTreatmentName} aujourd'hui`,
    })
  }

  if (settings.nextDoctorAppointment === today) {
    events.push({
      id: 'doctor',
      icon: <Stethoscope className="w-5 h-5" />,
      title: 'Rendez-vous médecin aujourd\'hui',
      detail: settings.doctorName || undefined,
    })
  }

  if (settings.nextLabDate === today) {
    events.push({
      id: 'lab',
      icon: <FlaskConical className="w-5 h-5" />,
      title: 'Prise de sang / examens aujourd\'hui',
    })
  }

  return events
}

export function TodayEventsBubble({ settings, nextPlanned }: TodayEventsBubbleProps) {
  const today = getTodayKey()
  const [dismissed, setDismissed] = useState(() => wasSeenToday(today))

  if (dismissed || !settings || !settings.onboardingCompleted) return null

  const events = buildTodayEvents(settings, nextPlanned, today)
  if (events.length === 0) return null

  function close() {
    markSeen(today)
    setDismissed(true)
  }

  return (
    <div
      role="dialog"
      aria-label="Au programme aujourd'hui"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-teal-200/80 dark:border-teal-800/60 p-5 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-400 shrink-0">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <p className="text-sm font-extrabold text-slate-900 dark:text-white">
              Au programme aujourd'hui
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Fermer"
            className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <ul className="space-y-2.5">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex items-start gap-3 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 p-3"
            >
              <span className="text-teal-600 dark:text-teal-400 mt-0.5">{event.icon}</span>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {event.title}
                </p>
                {event.detail && (
                  <p className="text-xs text-slate-600 dark:text-slate-400">{event.detail}</p>
                )}
              </div>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={close}
          className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors"
        >
          Compris
        </button>
      </div>
    </div>
  )
}
