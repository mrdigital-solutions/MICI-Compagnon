import { CheckCircle2, Sparkles } from 'lucide-react'
import { INJECTION_SITES, type InjectionSite } from '../../types'

interface InjectionSiteSelectorProps {
  value: InjectionSite
  recommendedSite?: InjectionSite
  onChange: (site: InjectionSite) => void
}

export function InjectionSiteSelector({
  value,
  recommendedSite,
  onChange,
}: InjectionSiteSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {INJECTION_SITES.map((site) => {
        const isSelected = value === site.id
        const isRecommended = recommendedSite === site.id
        return (
          <button
            key={site.id}
            type="button"
            onClick={() => onChange(site.id)}
            className={`relative flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
              isSelected
                ? 'border-teal-500 bg-teal-500/10 dark:bg-teal-500/15 ring-1 ring-teal-500'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {site.zone}
              </span>
              {isSelected && <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />}
            </div>
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {site.label}
            </span>
            {isRecommended && (
              <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300">
                <Sparkles className="w-3 h-3" />
                Recommandé
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
