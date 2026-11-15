export function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d, 12, 0, 0, 0)
}

export function addDays(key: string, days: number): string {
  const date = parseDateKey(key)
  date.setDate(date.getDate() + days)
  return toDateKey(date)
}

export function diffDays(fromKey: string, toKey: string): number {
  const a = parseDateKey(fromKey)
  const b = parseDateKey(toKey)
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.round((b.getTime() - a.getTime()) / msPerDay)
}

export function getTodayKey(): string {
  return toDateKey(new Date())
}

export function formatDateFr(
  key: string,
  options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  },
): string {
  const date = parseDateKey(key)
  return new Intl.DateTimeFormat('fr-FR', options).format(date)
}

export function formatShortDateFr(key: string): string {
  return formatDateFr(key, { day: 'numeric', month: 'short' })
}

export function formatMonthYearFr(year: number, month: number): string {
  const date = new Date(year, month, 1, 12, 0, 0)
  const formatted = new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
  }).format(date)
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

export interface CalendarCell {
  dateKey: string
  dayNumber: number
  isCurrentMonth: boolean
  isToday: boolean
}

/**
 * Generates a Monday-first calendar grid for a given year & 0-indexed month.
 */
export function getMonthGrid(year: number, month: number): CalendarCell[] {
  const firstDay = new Date(year, month, 1, 12, 0, 0)
  const lastDay = new Date(year, month + 1, 0, 12, 0, 0)

  // Convert Sunday=0..Saturday=6 into Monday=0..Sunday=6
  const startOffset = (firstDay.getDay() + 6) % 7
  const totalDays = lastDay.getDate()
  const totalCells = Math.ceil((startOffset + totalDays) / 7) * 7

  const todayKey = getTodayKey()
  const grid: CalendarCell[] = []

  const gridStart = new Date(year, month, 1 - startOffset, 12, 0, 0)
  for (let i = 0; i < totalCells; i++) {
    const cellDate = new Date(gridStart)
    cellDate.setDate(gridStart.getDate() + i)
    const dateKey = toDateKey(cellDate)
    grid.push({
      dateKey,
      dayNumber: cellDate.getDate(),
      isCurrentMonth: cellDate.getMonth() === month,
      isToday: dateKey === todayKey,
    })
  }

  return grid
}
