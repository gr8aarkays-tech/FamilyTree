import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/FamilyTree/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.svg'],
      manifest: {
        name: 'Family Tree',
        short_name: 'FamilyTree',
        description: 'Build and preserve your family history — offline first.',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/FamilyTree/',
        scope: '/FamilyTree/',
        icons: [
          { src: 'icons/icon-72.svg',   sizes: '72x72',   type: 'image/svg+xml' },
          { src: 'icons/icon-96.svg',   sizes: '96x96',   type: 'image/svg+xml' },
          { src: 'icons/icon-128.svg',  sizes: '128x128', type: 'image/svg+xml' },
          { src: 'icons/icon-144.svg',  sizes: '144x144', type: 'image/svg+xml' },
          { src: 'icons/icon-152.svg',  sizes: '152x152', type: 'image/svg+xml' },
          { src: 'icons/icon-192.svg',  sizes: '192x192', type: 'image/svg+xml', purpose: 'any maskable' },
          { src: 'icons/icon-384.svg',  sizes: '384x384', type: 'image/svg+xml' },
          { src: 'icons/icon-512.svg',  sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
        categories: ['lifestyle', 'utilities'],
        shortcuts: [
          {
            name: 'New Tree',
            short_name: 'New Tree',
            description: 'Create a new family tree',
            url: '/trees/new',
            icons: [{ src: 'icons/icon-96.png', sizes: '96x96' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache' },
          },
        ],
      },
    }),
  ],
})
