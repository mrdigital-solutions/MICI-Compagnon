import { AlertTriangle } from 'lucide-react'
import { dismissSaveToast, useDbHealth, useSaveToast } from '../../db/dbHealth'

export function DbHealthBanner() {
  const health = useDbHealth()
  const toast = useSaveToast()
  if (health === 'ok') {
    return toast ? (
      <div
        role="alert"
        onClick={dismissSaveToast}
        className="fixed bottom-4 inset-x-4 z-[60] mx-auto max-w-md rounded-2xl bg-rose-600 text-white px-4 py-3 shadow-lg text-xs font-semibold leading-snug"
      >
        {toast}
      </div>
    ) : null
  }

  const message =
    health === 'blocked'
      ? "Une autre fenêtre ou une ancienne version de l'application bloque l'accès à vos données. Fermez complètement l'application et les autres onglets du site, puis rouvrez-la."
      : health === 'outdated'
        ? "Une nouvelle version de l'application est ouverte ailleurs. Rechargez cette page pour continuer à enregistrer."
        : "L'accès aux données locales a été interrompu. Rechargez l'application pour continuer à enregistrer."

  return (
    <div
      role="alert"
      className="fixed top-0 inset-x-0 z-[60] bg-rose-600 text-white px-4 py-3 shadow-lg flex items-start gap-3"
    >
      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
      <p className="flex-1 text-xs font-semibold leading-snug">{message}</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="shrink-0 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-bold"
      >
        Recharger
      </button>
    </div>
  )
}
