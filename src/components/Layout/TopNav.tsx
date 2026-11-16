import { CalendarDays, ClipboardList, FileText, FlaskConical } from 'lucide-react'
import type { AppTab } from '../../types'

interface TopNavProps {
  activeTab: AppTab
  onChange: (tab: AppTab) => void
}

const TABS: { id: AppTab; label: string; icon: typeof CalendarDays }[] = [
  { id: 'calendar', label: 'Calendrier', icon: CalendarDays },
  { id: 'journal', label: 'Journal', icon: ClipboardList },
  { id: 'labs', label: 'Analyses', icon: FlaskConical },
  { id: 'report', label: 'Rapport', icon: FileText },
]

export function TopNav({ activeTab, onChange }: TopNavProps) {
  return (
    <nav aria-label="Navigation principale" className="w-full sm:w-auto">
      <div className="grid grid-cols-4 sm:flex sm:items-center gap-1 p-1 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-1.5 sm:py-2 px-1 sm:px-3 rounded-xl text-[10.5px] sm:text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
              <span className="truncate">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
