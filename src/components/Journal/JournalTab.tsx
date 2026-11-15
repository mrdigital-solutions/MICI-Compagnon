import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { addDays, formatDateFr, getTodayKey } from '../../utils/dateUtils'
import { DailyJournalForm } from './DailyJournalSheet'

export function JournalTab() {
  const [dateKey, setDateKey] = useState<string>(getTodayKey())
  const today = getTodayKey()

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-[#FFFCF8]/90 dark:bg-slate-900 border border-amber-200/60 dark:border-slate-800 p-4 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setDateKey((d) => addDays(d, -1))}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Jour précédent"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              {dateKey === today ? "Aujourd'hui" : 'Journal quotidien'}
            </p>
            <h2 className="text-sm font-bold capitalize text-slate-900 dark:text-white">
              {formatDateFr(dateKey)}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setDateKey((d) => addDays(d, 1))}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Jour suivant"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <DailyJournalForm dateKey={dateKey} />
      </div>
    </div>
  )
}
