import react from '@vitejs/plugin-react';
import { defineConfig, type HtmlTagDescriptor, loadEnv, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Brand-neutral config: the product name, tagline and canonical origin come from the
// environment, so renaming or swapping the domain is one env change and no code edit.
// Fallbacks keep a bare `bun run dev` (no .env) working.
const DEFAULT_APP_NAME = 'Wobo';
const DEFAULT_APP_DESCRIPTION =
  'Learn with Wobo — mastery-first courses, practice, and your AI wobot beside you.';

export default defineConfig(({ mode }) => {
  // loadEnv reads .env[.mode][.local] AND the VITE_-prefixed vars the host injects
  // (Vercel project env), so production values arrive without a code path of their own.
  const env = loadEnv(mode, process.cwd());
  const appName = env.VITE_APP_NAME || DEFAULT_APP_NAME;
  const appDescription = env.VITE_APP_DESCRIPTION || DEFAULT_APP_DESCRIPTION;
  // Optional: unset means no canonical/og:url tag at all rather than a wrong one.
  const appUrl = (env.VITE_APP_URL || '').replace(/\/+$/, '');

  const brandTags: HtmlTagDescriptor[] = [
    { tag: 'meta', attrs: { property: 'og:type', content: 'website' }, injectTo: 'head' },
    { tag: 'meta', attrs: { property: 'og:title', content: appName }, injectTo: 'head' },
    {
      tag: 'meta',
      attrs: { property: 'og:description', content: appDescription },
      injectTo: 'head',
    },
  ];
  if (appUrl) {
    brandTags.push(
      { tag: 'link', attrs: { rel: 'canonical', href: appUrl }, injectTo: 'head' },
      { tag: 'meta', attrs: { property: 'og:url', content: appUrl }, injectTo: 'head' },
    );
  }

  const brandHtml: Plugin = {
    name: 'brand-html',
    transformIndexHtml(html) {
      return {
        html: html
          .replaceAll('{{APP_NAME}}', appName)
          .replaceAll('{{APP_DESCRIPTION}}', appDescription),
        tags: brandTags,
      };
    },
  };

  return {
    // The frame builder code-splits the real catalogs (content/catalogs/*.json) at the repo root —
    // allow Vite dev to serve from above the app root.
    server: { fs: { allow: ['../..'] } },
    plugins: [
      react(),
      brandHtml,
      VitePWA({
        registerType: 'autoUpdate',
        // Icons are cropped from the wordmark's W-mark (public/wobo-logo.png).
        // Regenerate with the snippet in DEPLOY.md if the logo changes.
        includeAssets: ['wobo-logo.png', 'favicon.svg', 'apple-touch-icon.png', 'robots.txt'],
        workbox: {
          // A new deploy must take over IMMEDIATELY, not after every tab closes. Without these, the
          // old service worker keeps serving its cached (stale) bundle — so a shipped feature looks
          // "missing" until the user manually hard-refreshes. skipWaiting activates the new SW at once;
          // clientsClaim + autoUpdate's client-side reload then swap the page to the fresh build.
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          // The entry chunk is ~2.1 MB raw (~640 KB gzipped: react + framer + mafs + the non-lazy
          // engines). It loads on first visit regardless, so precaching it is the right PWA call —
          // raise the ceiling above workbox's 2 MiB default. Three.js/3Dmol/RDKit already lazy-split.
          // ponytail: if the entry ever needs to shrink, code-split mafs + the CS ramp behind React.lazy.
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
          // RDKit's 6.9 MB wasm is lazy-loaded only when a chem structure card renders —
          // never precache it on every visit; cache it on first real use instead.
          globIgnores: ['**/RDKit_minimal*.wasm'],
          runtimeCaching: [
            {
              urlPattern: /RDKit_minimal.*\.wasm$/,
              handler: 'CacheFirst',
              options: { cacheName: 'rdkit-wasm', expiration: { maxEntries: 2 } },
            },
          ],
        },
        manifest: {
          name: appName,
          short_name: appName,
          description: appDescription,
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
  };
});
