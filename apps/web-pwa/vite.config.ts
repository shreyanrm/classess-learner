import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // ponytail: no icons array — Phase 0 ships no binary assets. Add icons when the app installs for real.
      manifest: {
        name: 'Classess Learner',
        short_name: 'Classess',
        theme_color: '#0A0A0B',
        background_color: '#FFFFFF',
        display: 'standalone',
      },
    }),
  ],
});
