import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'PlayRecap',
        short_name: 'PlayRecap',
        description: 'Hörbuch-Zusammenfassungen und KI-Chat',
        theme_color: '#B0532A',
        background_color: '#F1E9D9',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: '/icons/192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
