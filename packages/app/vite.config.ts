import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const TABLE_BLUE = '#1B2D57';

export default defineConfig({
  // Relative Pfade, damit die App auch unter einem Unterpfad (z. B. GitHub Pages) läuft.
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Blanko',
        short_name: 'Blanko',
        description: 'Das Kartenspiel Blanko gegen Computergegner',
        lang: 'de',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        background_color: TABLE_BLUE,
        theme_color: TABLE_BLUE,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Alles, was die App braucht, liegt im Cache: Code, Schriften, Bilder und profiles.json.
        globPatterns: ['**/*.{js,css,html,woff2,png,json}'],
      },
    }),
  ],
});
