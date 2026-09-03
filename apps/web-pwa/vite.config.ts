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
        includeAssets: [
          'wobo-logo.png',
          'favicon.svg',
          'apple-touch-icon.png',
          'robots.txt',
          'sitemap.xml',
        ],
        workbox: {
          // A new deploy must take over IMMEDIATELY, not after every tab closes. Without these, the
          // old service worker keeps serving its cached (stale) bundle — so a shipped feature looks
          // "missing" until the user manually hard-refreshes. skipWaiting activates the new SW at once;
          // clientsClaim + autoUpdate's client-side reload then swap the page to the fresh build.
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          // Every screen but the two that can be a FIRST paint (onboarding, home) is behind
          // React.lazy at App.tsx's single mount point, so each route is its own chunk and a
          // learner downloads a screen when they walk to it. Three.js/3Dmol/RDKit were already
          // lazy. The entry that remains is react + framer + the shell + Wobo's hand, which does
          // load on first visit regardless — so precaching it is the right PWA call. The ceiling
          // is a little above workbox's 2 MiB default, with room for the largest lazy chunk.
          maximumFileSizeToCacheInBytes: 2.5 * 1024 * 1024,
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
          // Origin-relative on purpose: the manifest is served from the app's own origin
          // (https://heywobo.com), so `/` IS the installed app's identity and launch URL. An
          // absolute URL here would pin an installed app to one host and break every preview.
          id: '/',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          // The manifest cannot carry a media query, so it names the default (light) page colour —
          // matching background_color and the light `theme-color` tag. A dark value here painted
          // the installed PWA's title bar black above a white app.
          theme_color: '#FFFFFF',
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
