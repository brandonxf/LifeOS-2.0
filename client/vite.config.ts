import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      devOptions: { enabled: true }, // service worker activo también en `npm run dev`
      workbox: {
        navigateFallbackDenylist: [/^\/api/], // no cachear el API ni el streaming de IA
      },
      manifest: {
        name: 'Life OS',
        short_name: 'Life OS',
        description: 'Tu sistema operativo personal de vida',
        lang: 'es',
        theme_color: '#080a08',
        background_color: '#080a08',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    host: true, // escucha en 0.0.0.0 para acceder desde el celular en la misma red
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
