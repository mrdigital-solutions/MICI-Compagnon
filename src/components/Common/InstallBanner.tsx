import { Copy, Smartphone, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  detectInstallMethod,
  isIosDevice,
  promptPwaInstall,
  subscribePwaInstall,
  type InstallMethod,
} from '../../utils/pwaInstall'

const DISMISS_KEY = 'mici-install-banner-dismissed-until'
const DISMISS_DAYS = 7

function isDismissed(): boolean {
  try {
    const until = Number(localStorage.getItem(DISMISS_KEY))
    return Number.isFinite(until) && until > Date.now()
  } catch {
    return false
  }
}

function rememberDismiss(): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000))
  } catch {
    // Stockage indisponible (navigation privée…) : le bandeau reviendra à la prochaine ouverture
  }
}

/** Consignes d'installation selon le téléphone et le navigateur. */
export function InstallInstructions({ method }: { method: InstallMethod }) {
  if (method === 'in-app') {
    return (
      <>
        Vous êtes dans le navigateur de Facebook / Instagram, qui ne permet pas d'installer
        l'appli. Touchez <strong>⋯</strong> (en haut à droite) puis{' '}
        <strong>{isIosDevice() ? 'Ouvrir dans Safari' : 'Ouvrir dans le navigateur'}</strong>,
        puis installez-la depuis {isIosDevice() ? 'Safari' : 'Chrome'}.
      </>
    )
  }
  if (method === 'ios') {
    return (
      <>
        Touchez <strong>Partager</strong> (le carré avec une flèche vers le haut), puis{' '}
        <strong>Sur l'écran d'accueil</strong>.
      </>
    )
  }
  if (method === 'android') {
    return (
      <>
        Touchez le menu <strong>⋮</strong> (en haut à droite), puis{' '}
        <strong>Ajouter à l'écran d'accueil</strong> ou <strong>Installer l'application</strong>.
      </>
    )
  }
  return null
}

/**
 * Bandeau d'installation affiché à tous ceux qui n'ont pas encore installé l'appli,
 * avec un bouton quand le navigateur le permet, sinon les consignes adaptées.
 */
export function InstallBanner() {
  const [method, setMethod] = useState<InstallMethod>(() => detectInstallMethod())
  const [dismissed, setDismissed] = useState(isDismissed)
  const [copied, setCopied] = useState(false)

  useEffect(() => subscribePwaInstall(() => setMethod(detectInstallMethod())), [])

  if (method === 'none' || dismissed) return null

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href.split('#')[0])
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setCopied(false)
    }
  }

  function handleDismiss() {
    rememberDismiss()
    setDismissed(true)
  }

  return (
    <div className="mb-4 rounded-2xl bg-white/85 dark:bg-slate-900/90 backdrop-blur-md border border-teal-200/80 dark:border-teal-800/60 p-3 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
              Installer MICI Compagnon sur votre écran d'accueil
            </p>
            {method !== 'prompt' && (
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                <InstallInstructions method={method} />
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {method === 'prompt' && (
            <button
              type="button"
              onClick={() => promptPwaInstall()}
              className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors"
            >
              Installer
            </button>
          )}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Fermer"
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      {method === 'in-app' && (
        <button
          type="button"
          onClick={handleCopyLink}
          className="mt-2 ml-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 text-xs font-semibold"
        >
          <Copy className="w-3.5 h-3.5" />
          {copied ? 'Lien copié : collez-le dans votre navigateur' : 'Copier le lien'}
        </button>
      )}
    </div>
  )
}
