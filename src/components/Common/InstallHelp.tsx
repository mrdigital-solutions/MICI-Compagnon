import { HelpCircle, X } from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { detectInstallMethod } from '../../utils/pwaInstall'

function Section({
  title,
  highlight,
  children,
}: {
  title: string
  highlight: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={`rounded-2xl p-3.5 border ${
        highlight
          ? 'border-teal-300 bg-teal-50/70 dark:border-teal-700 dark:bg-teal-950/30'
          : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/60'
      }`}
    >
      <p className="text-sm font-bold text-slate-900 dark:text-white">
        {title}
        {highlight && (
          <span className="ml-2 align-middle text-[10px] font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
            Votre téléphone
          </span>
        )}
      </p>
      <div className="mt-1.5 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
        {children}
      </div>
    </div>
  )
}

/**
 * Bouton « Comment installer l'application ? » qui ouvre une bulle avec toute la marche
 * à suivre (Facebook / Instagram, Android, iPhone). La partie qui correspond au téléphone
 * utilisé est mise en avant.
 */
export function InstallHelp() {
  const [open, setOpen] = useState(false)
  const method = detectInstallMethod()

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-50/70 dark:bg-teal-950/30 hover:bg-teal-100/70 transition-colors"
      >
        <HelpCircle className="w-4 h-4" />
        Comment installer l'application ?
      </button>

      {open &&
        // Rendu au niveau de la page pour passer au-dessus des Paramètres et des bulles
        createPortal(
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-help-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[88vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-[#FFFCF8] dark:bg-slate-900 shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
              <h2 id="install-help-title" className="text-base font-bold text-slate-900 dark:text-white">
                Installer MICI Compagnon
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 pb-5 space-y-3 overflow-y-auto">
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Une fois installée, l'application a son icône sur l'écran d'accueil, comme une
                vraie application, et fonctionne même sans connexion.
              </p>

              <Section title="⚠️ Lien ouvert depuis Facebook ou Instagram" highlight={method === 'in-app'}>
                Le navigateur de Facebook / Instagram ne permet pas d'installer l'application.
                Touchez d'abord <strong>⋯</strong> en haut à droite, puis{' '}
                <strong>Ouvrir dans le navigateur</strong> (ou <strong>Ouvrir dans Safari</strong>{' '}
                sur iPhone). Suivez ensuite les étapes ci-dessous.
              </Section>

              <Section title="🤖 Android (Chrome)" highlight={method === 'prompt' || method === 'android'}>
                <ol className="list-decimal pl-4 space-y-0.5">
                  <li>Ouvrez l'application dans <strong>Chrome</strong>.</li>
                  <li>
                    Touchez <strong>Installer</strong> dans le bandeau en haut de l'écran.
                  </li>
                  <li>
                    Sinon : menu <strong>⋮</strong> en haut à droite →{' '}
                    <strong>Installer l'application</strong> ou{' '}
                    <strong>Ajouter à l'écran d'accueil</strong>.
                  </li>
                </ol>
              </Section>

              <Section title="🍏 iPhone (Safari)" highlight={method === 'ios'}>
                <ol className="list-decimal pl-4 space-y-0.5">
                  <li>Ouvrez l'application dans <strong>Safari</strong>.</li>
                  <li>
                    Touchez <strong>Partager</strong> (le carré avec une flèche vers le haut).
                  </li>
                  <li>
                    Choisissez <strong>Sur l'écran d'accueil</strong>, puis{' '}
                    <strong>Ajouter</strong>.
                  </li>
                </ol>
              </Section>

              <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                🔒 Vos données restent sur votre téléphone. Faites une sauvegarde (Paramètres →
                Sauvegarde) avant de changer de téléphone ou de désinstaller l'application.
              </p>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
