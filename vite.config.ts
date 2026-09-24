import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/segundo-cerebro-app/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // El service worker nunca contesta por el programa local.
      workbox: { navigateFallbackDenylist: [/\/api\//] },
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Segundo cerebro',
        short_name: 'Cerebro',
        description: 'Tareas, calendario y proyectos',
        lang: 'es',
        theme_color: '#6d28d9',
        background_color: '#111318',
        display: 'standalone',
        start_url: '/segundo-cerebro-app/',
        scope: '/segundo-cerebro-app/',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: { environment: 'node' },
});
