import type { AppSettings, InjectionRecord } from '../types'
import { diffDays, getTodayKey } from './dateUtils'
import { getSiteLabel } from '../db/database'

const NOTIF_STORAGE_KEY = 'crohn_suivi_last_notif_date'

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  return await Notification.requestPermission()
}

export async function triggerLocalReminderIfNeeded(
  nextInjection: InjectionRecord | undefined,
  settings: AppSettings,
): Promise<void> {
  if (!nextInjection || !isNotificationSupported() || Notification.permission !== 'granted') {
    return
  }

  const today = getTodayKey()
  const daysUntil = diffDays(today, nextInjection.scheduledDate)

  const shouldNotifyDayBefore = settings.reminderDayBefore && daysUntil === 1
  const shouldNotifySameDay = settings.reminderSameDay && daysUntil === 0

  if (!shouldNotifyDayBefore && !shouldNotifySameDay) return

  const marker = `${today}:${daysUntil}`
  if (localStorage.getItem(NOTIF_STORAGE_KEY) === marker) return

  const siteLabel = getSiteLabel(nextInjection.site)
  const title =
    daysUntil === 0
      ? `Jour J : Injection ${settings.treatmentName}`
      : `Rappel J-1 : Injection ${settings.treatmentName} demain`

  const body =
    daysUntil === 0
      ? `Votre injection est prévue aujourd'hui (${siteLabel}).`
      : `Pensez à sortir votre stylo demain. Zone recommandée : ${siteLabel}.`

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready
      await reg.showNotification(title, {
        body,
        icon: '/pwa-192x192.svg',
        badge: '/pwa-192x192.svg',
        tag: `yuflima-reminder-${today}`,
      })
    } else {
      new Notification(title, { body, icon: '/pwa-192x192.svg' })
    }
    localStorage.setItem(NOTIF_STORAGE_KEY, marker)
  } catch {
    // Ignore notification display errors in restricted webviews
  }
}
