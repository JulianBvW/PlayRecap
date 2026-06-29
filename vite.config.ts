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
          // TODO: add proper 192×192 and 512×512 PNG icons to public/icons/
          { src: '/favicon.ico', sizes: '48x48', type: 'image/x-icon' },
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
