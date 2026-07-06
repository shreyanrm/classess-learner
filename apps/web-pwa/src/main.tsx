import { cssVariables } from '@classess/config/css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

// Inject the design tokens once, plus a minimal token-driven base reset. No hardcoded hexes.
const STYLE_ID = 'clss-tokens';
if (!document.getElementById(STYLE_ID)) {
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `${cssVariables()}
* { box-sizing: border-box; }
html, body { margin: 0; }
body {
  font-family: 'Google Sans Flex', 'Plus Jakarta Sans', system-ui, sans-serif;
  color: var(--clss-ink-900);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  /* The signature surface: a faint dot-grid, like a mind's notebook. Content sits on clean paper on
     top; the grid only breathes through the open canvas. Charm without clutter. */
  background-color: var(--clss-canvas);
  background-image: radial-gradient(rgba(10, 10, 11, 0.06) 1.2px, transparent 1.2px);
  background-size: 24px 24px;
  background-position: -13px -13px;
  background-attachment: fixed;
}
/* Type as craft: confident, tightly-tracked display; balanced headings; tidy prose. */
h1, h2, h3, h4 { letter-spacing: -0.022em; text-wrap: balance; }
h1 { letter-spacing: -0.032em; }
p, li { text-wrap: pretty; }
/* Molten is the app's action + presence colour — even the text selection carries it. */
::selection { background: rgba(255,77,26,0.20); color: var(--clss-ink-900); }
/* A quiet, modern scrollbar — never the chunky default. */
* { scrollbar-width: thin; scrollbar-color: var(--clss-ink-300) transparent; }
::-webkit-scrollbar { width: 11px; height: 11px; }
::-webkit-scrollbar-thumb {
  background: var(--clss-ink-300);
  border-radius: 999px;
  border: 3px solid var(--clss-canvas);
}
::-webkit-scrollbar-thumb:hover { background: var(--clss-ink-500); }
@media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto; } }
`;
  document.head.appendChild(style);
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
