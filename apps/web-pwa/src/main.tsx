// The two faces, bundled and served from this origin — no Google Fonts round-trip on first paint
// (the stack law: everything ships locally). Variable files: one request each, every weight.
import '@fontsource-variable/caveat';
import '@fontsource-variable/plus-jakarta-sans';
import { fontFamily } from '@wobo/config';
import { cssVariables } from '@wobo/config/css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { migrateLegacyKeys } from './store/legacy-keys';
import { initAccess } from './ui/access';
import { ensureDefaultAvatar } from './ui/avatars';
import { initTheme } from './ui/theme';

// FIRST, before any store reads: an already-installed device still has its world under the
// pre-rename key names. Move it forward, once, or the rename would read as a wipe.
migrateLegacyKeys();

// Inject the design tokens once, plus a minimal token-driven base reset. No hardcoded hexes.
const STYLE_ID = 'wobo-tokens';
if (!document.getElementById(STYLE_ID)) {
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `${cssVariables()}
* { box-sizing: border-box; }
html, body { margin: 0; }
/* No interpolate-size: Chrome implements it, Safari ignores it — any effect it ever has is a
   Chrome-only divergence (auto-size transitions animating in Chrome, snapping in Safari).
   All auto-height choreography is framer-motion, which never needs it. */
html { scroll-behavior: smooth; }
body {
  font-family: ${fontFamily.system};
  color: var(--wobo-ink-900);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  /* Paper in light, soft graphite in dark — never pure black (DESIGN.md §2). */
  background: var(--wobo-page);
  transition: background 0.3s ease, color 0.3s ease;
}
/* Type as craft: confident, tightly-tracked display; balanced headings; tidy prose. */
h1, h2, h3, h4 { letter-spacing: -0.022em; text-wrap: balance; margin: 0; }
h1 { letter-spacing: -0.032em; }
p, li { text-wrap: pretty; }
/* Ultramarine is the signature pigment — selection and focus carry it, nothing else in chrome does. */
::selection { background: var(--wobo-ultramarine-wash); color: var(--wobo-ink-900); }
:focus-visible { outline: 2px solid var(--wobo-ultramarine-ring); outline-offset: 2px; }
/* One scrollbar: the page's own, thin and quiet. Inner scroll areas scroll invisibly. */
html { scrollbar-width: none; }
::-webkit-scrollbar { display: none; width: 0; height: 0; }
* { scrollbar-width: none; }
@media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto; } }
`;
  document.head.appendChild(style);
}

initTheme();
initAccess();
ensureDefaultAvatar();

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
