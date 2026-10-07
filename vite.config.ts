import { VitePWA } from 'vite-plugin-pwa'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['icons/fitness.svg'],
    manifest: {
      name: 'Personal Fitness Planner',
      short_name: 'Fitness Planner',
      description: 'A personal fitness planner for your daily movement.',
      theme_color: '#f6f7f4',
      background_color: '#f6f7f4',
      display: 'standalone',
      start_url: '/',
      icons: [{
        src: '/icons/fitness.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any maskable',
      }],
    },
  })],
  test: {
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    css: true,
  },
})
