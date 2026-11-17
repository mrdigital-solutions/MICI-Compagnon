import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initPwaInstallListener } from './utils/pwaInstall'

initPwaInstallListener()

if ('serviceWorker' in navigator) {
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })

  const checkForSwUpdate = () => {
    navigator.serviceWorker.getRegistration().then((reg) => {
      reg?.update().catch(() => {})
    })
  }

  window.addEventListener('load', checkForSwUpdate)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkForSwUpdate()
    }
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
