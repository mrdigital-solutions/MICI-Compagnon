import type { AppSettings, InjectionRecord } from '../types'
import { diffDays, getTodayKey } from './dateUtils'
import { getSiteLabel } from '../db/database'
import { isOralTreatment } from './treatment'

const NOTIF_STORAGE_KEY = 'crohn_suivi_last_notif_date'
// Chemin relatif : l'application est servie dans un sous-dossier sur GitHub Pages
const NOTIF_ICON = './pwa-192x192.png'

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  return await Notification.requestPermission()
}

/** "09:30" → nombre de minutes depuis minuit (9 h par défaut si invalide). */
export function parseReminderHour(value?: string): number {
  const match = value?.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return 9 * 60
  const h = Math.min(23, Number(match[1]))
  const m = Math.min(59, Number(match[2]))
  return h * 60 + m
}

function readMarker(): string | null {
  try {
    return localStorage.getItem(NOTIF_STORAGE_KEY)
  } catch {
    return null
  }
}

function writeMarker(marker: string): void {
  try {
    localStorage.setItem(NOTIF_STORAGE_KEY, marker)
  } catch {
    // Stockage indisponible (navigation privée) : on ignore
  }
}

/**
 * Affiche le rappel J-1 / Jour J si l'heure de rappel choisie est passée.
 * Limite : sans serveur de notifications push, le rappel ne s'affiche
 * que lorsque l'application est ouverte (ou rouverte) ce jour-là.
 */
export async function triggerLocalReminderIfNeeded(
  nextInjection: InjectionRecord | undefined,
  settings: AppSettings,
  now: Date = new Date(),
): Promise<void> {
  if (!nextInjection || !isNotificationSupported() || Notification.permission !== 'granted') {
    return
  }

  const minutesNow = now.getHours() * 60 + now.getMinutes()
  if (minutesNow < parseReminderHour(settings.reminderHour)) return

  const today = getTodayKey()
  const daysUntil = diffDays(today, nextInjection.scheduledDate)

  const shouldNotifyDayBefore = settings.reminderDayBefore && daysUntil === 1
  const shouldNotifySameDay = settings.reminderSameDay && daysUntil === 0

  if (!shouldNotifyDayBefore && !shouldNotifySameDay) return

  const marker = `${today}:${daysUntil}`
  if (readMarker() === marker) return

  const oral = isOralTreatment(settings.treatmentName)
  const intake = oral ? 'Prise' : 'Injection'
  const siteLabel = getSiteLabel(nextInjection.site)
  const title =
    daysUntil === 0
      ? `Jour J : ${intake} ${settings.treatmentName}`
      : `Rappel J-1 : ${intake} ${settings.treatmentName} demain`

  const body = oral
    ? daysUntil === 0
      ? `Votre prise est prévue aujourd'hui.`
      : `Votre prise est prévue demain.`
    : daysUntil === 0
      ? `Votre injection est prévue aujourd'hui (${siteLabel}).`
      : `Pensez à sortir votre stylo demain. Zone recommandée : ${siteLabel}.`

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready
      await reg.showNotification(title, {
        body,
        icon: NOTIF_ICON,
        badge: NOTIF_ICON,
        tag: `mici-reminder-${today}`,
      })
    } else {
      new Notification(title, { body, icon: NOTIF_ICON })
    }
    writeMarker(marker)
  } catch {
    // Ignore notification display errors in restricted webviews
  }
}
