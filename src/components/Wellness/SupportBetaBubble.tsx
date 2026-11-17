import { Coffee, ExternalLink, X } from 'lucide-react'
import { useState } from 'react'
import { DONATION_URL } from '../../config/support'

const DISMISS_KEY = 'mici_support_bubble_hidden_v2'

interface SupportBetaBubbleProps {
  visible: boolean
}

export function SupportBetaBubble({ visible }: SupportBetaBubbleProps) {
  const [closedForSession, setClosedForSession] = useState(false)
  const [permanentlyHidden, setPermanentlyHidden] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem(DISMISS_KEY) === '1',
  )

  if (!visible || !DONATION_URL || closedForSession || permanentlyHidden) {
    return null
  }

  function handleNeverShow() {
    localStorage.setItem(DISMISS_KEY, '1')
    setPermanentlyHidden(true)
  }

  return (
    <div className="fixed bottom-4 right-4 sm:right-5 w-[calc(100%-2rem)] sm:w-96 z-50">
      <div className="rounded-3xl bg-[#FFFCF8]/95 dark:bg-slate-900/95 backdrop-blur-xl border border-amber-200/80 dark:border-amber-800/50 p-4 shadow-[0_12px_36px_rgba(180,83,9,0.14)] space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-amber-950 dark:text-amber-200">
                Soutenir MICI Compagnon
              </p>
              <p className="text-[11px] font-semibold text-teal-700 dark:text-teal-300">
                Bêta gratuite · Accès à vie offert aux donateurs
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setClosedForSession(true)}
            aria-label="Fermer"
            className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
          Votre don aide à financer les frais et l'évolution de l'appli. En remerciement, chaque
          soutien sur Ko-fi recevra <strong>l'accès à vie offert par e-mail</strong> à la sortie !
        </p>

        <div className="flex items-center gap-2">
          <a
            href={DONATION_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleNeverShow}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold shadow-xs transition-all"
          >
            <Coffee className="w-3.5 h-3.5" />
            Soutenir sur Ko-fi
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            type="button"
            onClick={() => setClosedForSession(true)}
            className="px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200/70"
          >
            Plus tard
          </button>
        </div>

        <button
          type="button"
          onClick={handleNeverShow}
          className="w-full text-center text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          Ne plus afficher ce message
        </button>
      </div>
    </div>
  )
}
