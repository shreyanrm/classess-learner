import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // The frame builder code-splits the real catalogs (content/catalogs/*.json) at the repo root —
  // allow Vite dev to serve from above the app root.
  server: { fs: { allow: ['../..'] } },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Icons are cropped from the wordmark's C-mark (public/classess-logo.png).
      // Regenerate with the snippet in DEPLOY.md §1.4 if the logo changes.
      includeAssets: ['classess-logo.png', 'apple-touch-icon.png', 'robots.txt'],
      manifest: {
        name: 'Classess Learner',
        short_name: 'Classess',
        description:
          'Learn with Vidya — mastery-first courses, practice, and a companion who knows you.',
        id: '/',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#0A0A0B',
        background_color: '#FFFFFF',
        lang: 'en',
        categories: ['education'],
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/pwa-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
});
