import { CalendarDays, ClipboardList, FileText, FlaskConical } from 'lucide-react'
import type { AppTab } from '../../types'

interface BottomNavProps {
  activeTab: AppTab
  onChange: (tab: AppTab) => void
}

const TABS: { id: AppTab; label: string; icon: typeof CalendarDays }[] = [
  { id: 'calendar', label: 'Calendrier', icon: CalendarDays },
  { id: 'journal', label: 'Journal', icon: ClipboardList },
  { id: 'labs', label: 'Analyses', icon: FlaskConical },
  { id: 'report', label: 'Rapport', icon: FileText },
]

export function BottomNav({ activeTab, onChange }: BottomNavProps) {
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed bottom-0 inset-x-0 z-30 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/90 backdrop-blur-lg pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto max-w-lg grid grid-cols-4 h-16">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                isActive
                  ? 'text-teal-600 dark:text-teal-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <div
                className={`flex items-center justify-center w-10 h-7 rounded-full transition-colors ${
                  isActive ? 'bg-teal-500/15 dark:bg-teal-400/15' : ''
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.25 : 1.8} />
              </div>
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
