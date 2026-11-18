import { useSyncExternalStore } from 'react'

/**
 * État de la connexion IndexedDB, partagé avec l'interface.
 * - ok : connexion normale
 * - blocked : une autre fenêtre/ancienne version de l'app empêche l'ouverture
 * - outdated : une version plus récente demande la main, cette connexion a été fermée
 * - closed : le navigateur a fermé la connexion (mémoire, nettoyage…)
 */
export type DbHealth = 'ok' | 'blocked' | 'outdated' | 'closed'

let current: DbHealth = 'ok'
const listeners = new Set<() => void>()

export function getDbHealth(): DbHealth {
  return current
}

export function setDbHealth(next: DbHealth): void {
  if (current === next) return
  current = next
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useDbHealth(): DbHealth {
  return useSyncExternalStore(subscribe, getDbHealth, getDbHealth)
}

export const SAVE_TIMEOUT_MS = 10_000

export class SaveTimeoutError extends Error {
  constructor() {
    super('save-timeout')
    this.name = 'SaveTimeoutError'
  }
}

/**
 * Exécute une écriture avec un délai maximum. Sans cela, une base bloquée par une
 * autre fenêtre laisse la promesse en attente indéfiniment (bouton figé).
 * L'écriture n'est pas annulée au timeout : si elle aboutit plus tard, c'est sans danger
 * (toutes les écritures de l'app sont idempotentes ou revérifiées).
 */
export function withSaveTimeout<T>(op: () => Promise<T>, ms = SAVE_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new SaveTimeoutError()), ms)
    op().then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      },
    )
  })
}

/** Message lisible pour l'utilisateur à partir d'une erreur d'enregistrement. */
export function describeSaveError(err: unknown): string {
  const health = getDbHealth()
  const name = err instanceof Error ? err.name : ''
  if (err instanceof SaveTimeoutError || health === 'blocked' || health === 'outdated') {
    return "L'enregistrement n'a pas abouti : l'application est probablement ouverte dans une autre fenêtre ou en arrière-plan. Fermez complètement l'application (et les autres onglets du site), rouvrez-la puis réessayez. Vos données existantes sont conservées."
  }
  if (name === 'QuotaExceededError') {
    return "L'enregistrement a échoué : l'espace de stockage de l'appareil est plein. Libérez de la place puis réessayez."
  }
  if (name === 'DatabaseClosedError' || health === 'closed') {
    return "La base de données locale a été fermée. Rechargez l'application puis réessayez. Vos données existantes sont conservées."
  }
  return "L'enregistrement a échoué. Réessayez ; si le problème persiste, fermez puis rouvrez l'application. Vos données existantes sont conservées."
}

// ---------------------------------------------------------------------------
// Toast global pour les actions « un clic » (stock, thème, suppression…) qui
// n'ont pas de formulaire où afficher une erreur.
// ---------------------------------------------------------------------------

let toastMessage: string | null = null
let toastTimer: ReturnType<typeof setTimeout> | undefined
const toastListeners = new Set<() => void>()

function emitToast(message: string | null) {
  toastMessage = message
  toastListeners.forEach((l) => l())
}

export function dismissSaveToast(): void {
  clearTimeout(toastTimer)
  emitToast(null)
}

export function useSaveToast(): string | null {
  return useSyncExternalStore(
    (listener) => {
      toastListeners.add(listener)
      return () => toastListeners.delete(listener)
    },
    () => toastMessage,
    () => toastMessage,
  )
}

/** Exécute une écriture rapide ; en cas d'échec, affiche un message au lieu d'échouer en silence. */
export async function quickWrite(op: () => Promise<unknown>): Promise<boolean> {
  try {
    await withSaveTimeout(op)
    return true
  } catch (err) {
    clearTimeout(toastTimer)
    emitToast(describeSaveError(err))
    toastTimer = setTimeout(() => emitToast(null), 12_000)
    return false
  }
}
