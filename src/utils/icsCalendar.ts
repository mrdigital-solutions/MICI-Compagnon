import { getSiteLabel } from '../db/database'
import type { InjectionRecord } from '../types'

function formatIcsDate(dateKey: string, hour = '090000'): string {
  return `${dateKey.replace(/-/g, '')}T${hour}`
}

export function downloadInjectionIcs(
  injection: InjectionRecord,
  treatmentName: string,
): void {
  const dtStart = formatIcsDate(injection.scheduledDate, '090000')
  const dtEnd = formatIcsDate(injection.scheduledDate, '091500')
  const siteLabel = getSiteLabel(injection.site)
  const uid = `mici-compagnon-${injection.scheduledDate}-${injection.id ?? 'next'}@local`

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MICI Compagnon//FR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatIcsDate(new Date().toISOString().slice(0, 10), '080000')}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:Injection ${treatmentName} (${siteLabel})`,
    `DESCRIPTION:Zone recommandee : ${siteLabel}. Verifier l'absence de fievre ou d'infection avant l'injection.`,
    // Rappel le jour J à 9h00
    'BEGIN:VALARM',
    'TRIGGER:PT0M',
    'ACTION:DISPLAY',
    `DESCRIPTION:Jour J : Injection ${treatmentName} (${siteLabel})`,
    'END:VALARM',
    // Rappel la veille (J-1) à 9h00 (-24h)
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:Demain : Injection ${treatmentName} (${siteLabel})`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  const blob = new Blob([icsLines.join('\r\n')], {
    type: 'text/calendar;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `rappel-injection-${injection.scheduledDate}.ics`
  a.click()
  URL.revokeObjectURL(url)
}
