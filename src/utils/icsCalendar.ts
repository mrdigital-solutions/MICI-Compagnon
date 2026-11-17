import { getSiteLabel } from '../db/database'
import type { InjectionRecord } from '../types'
import { isOralTreatment } from './treatment'

/** Échappe un texte selon la RFC 5545 (antislash, point-virgule, virgule, retour ligne). */
export function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/** Heure locale « flottante » : l'évènement reste à la même heure quel que soit le fuseau. */
function formatIcsLocal(dateKey: string, hhmm: string): string {
  return `${dateKey.replace(/-/g, '')}T${hhmm.replace(':', '')}00`
}

/** Horodatage UTC exigé pour DTSTAMP (ex. 20261118T081500Z). */
export function formatIcsUtcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map(Number)
  const total = Math.min(23 * 60 + 59, h * 60 + m + minutes)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export function buildInjectionIcs(
  injection: InjectionRecord,
  treatmentName: string,
  reminderHour = '09:00',
  now: Date = new Date(),
): string {
  const hour = /^\d{2}:\d{2}$/.test(reminderHour) ? reminderHour : '09:00'
  const oral = isOralTreatment(treatmentName)
  const intake = oral ? 'Prise' : 'Injection'
  const siteLabel = getSiteLabel(injection.site)
  const label = oral ? `${intake} ${treatmentName}` : `${intake} ${treatmentName} (${siteLabel})`
  const description = oral
    ? `${intake} de ${treatmentName} prévue aujourd'hui.`
    : `Zone recommandée : ${siteLabel}. Vérifier l'absence de fièvre ou d'infection avant l'injection.`
  const uid = `mici-compagnon-${injection.scheduledDate}-${injection.id ?? 'next'}@local`

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MICI Compagnon//FR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatIcsUtcStamp(now)}`,
    `DTSTART:${formatIcsLocal(injection.scheduledDate, hour)}`,
    `DTEND:${formatIcsLocal(injection.scheduledDate, addMinutes(hour, 15))}`,
    `SUMMARY:${escapeIcsText(label)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    // Rappel le jour J à l'heure choisie
    'BEGIN:VALARM',
    'TRIGGER:PT0M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcsText(`Jour J : ${label}`)}`,
    'END:VALARM',
    // Rappel la veille (J-1) à la même heure (-24h)
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcsText(`Demain : ${label}`)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  return icsLines.join('\r\n')
}

export function downloadInjectionIcs(
  injection: InjectionRecord,
  treatmentName: string,
  reminderHour?: string,
): void {
  const blob = new Blob([buildInjectionIcs(injection, treatmentName, reminderHour)], {
    type: 'text/calendar;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `rappel-${injection.scheduledDate}.ics`
  a.click()
  // Libération différée : Safari annule le téléchargement si l'URL est révoquée immédiatement
  window.setTimeout(() => URL.revokeObjectURL(url), 10000)
}
