interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface Window {
    goatcounter?: {
      count: (vars?: { path?: string; title?: string; event?: boolean }) => void
    }
  }
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

export function initPwaInstallListener(): void {
  if (typeof window === 'undefined') return
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
    listeners.forEach((cb) => cb())
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    listeners.forEach((cb) => cb())
    window.goatcounter?.count({
      path: '/app-installed',
      title: 'Application installée',
      event: true,
    })
  })
}

export function subscribePwaInstall(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function canPromptPwaInstall(): boolean {
  return deferredPrompt !== null
}

export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator &&
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true)
  )
}

/**
 * Comment installer l'app dans le navigateur actuel :
 * - 'prompt' : le navigateur propose l'installation (Chrome/Edge/Samsung sur Android, ordinateur)
 * - 'in-app' : navigateur intégré à Facebook, Instagram ou Messenger (installation impossible)
 * - 'ios' : iPhone/iPad (Partager → Sur l'écran d'accueil)
 * - 'android' : autre navigateur Android (menu → Ajouter à l'écran d'accueil)
 * - 'none' : déjà installée, ou ordinateur sans proposition d'installation
 */
export type InstallMethod = 'prompt' | 'in-app' | 'ios' | 'android' | 'none'

export function detectInstallMethod(
  userAgent: string = typeof navigator !== 'undefined' ? navigator.userAgent : '',
  options: { standalone?: boolean; canPrompt?: boolean; touchMac?: boolean } = {},
): InstallMethod {
  const standalone = options.standalone ?? isStandalonePwa()
  if (standalone) return 'none'
  if (/FBAN|FBAV|FB_IAB|FBIOS|Instagram|Messenger/i.test(userAgent)) return 'in-app'
  if (options.canPrompt ?? canPromptPwaInstall()) return 'prompt'
  const touchMac =
    options.touchMac ??
    (typeof navigator !== 'undefined' &&
      /Macintosh/.test(userAgent) &&
      navigator.maxTouchPoints > 1)
  if (/iPhone|iPad|iPod/i.test(userAgent) || touchMac) return 'ios'
  if (/Android/i.test(userAgent)) return 'android'
  return 'none'
}

export function isIosDevice(userAgent: string = navigator.userAgent): boolean {
  return /iPhone|iPad|iPod/i.test(userAgent)
}

export async function promptPwaInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable'
  await deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  deferredPrompt = null
  listeners.forEach((cb) => cb())
  return outcome
}
