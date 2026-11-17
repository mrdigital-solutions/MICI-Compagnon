import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  server: {
    port: 5175,
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo-round.png', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'MICI Compagnon — Suivi & Biothérapie',
        short_name: 'MICI Compagnon',
        description:
          'Application mobile-first de suivi des MICI (Crohn, RCH), des injections de biothérapie et des bilans biologiques.',
        theme_color: '#f7f9f8',
        background_color: '#fbf8f4',
        display: 'standalone',
        orientation: 'portrait',
        scope: './',
        start_url: './',
        lang: 'fr',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,ico,woff2}'],
      },
    }),
  ],
})
