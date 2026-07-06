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
html { scroll-behavior: smooth; interpolate-size: allow-keywords; }
body {
  font-family: 'Google Sans Flex', 'Google Sans Text', 'Plus Jakarta Sans', system-ui, sans-serif;
  color: var(--clss-ink-900);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  /* Paper. Emptiness is the premium signal (DESIGN.md §2). */
  background: var(--clss-paper);
}
/* Type as craft: confident, tightly-tracked display; balanced headings; tidy prose. */
h1, h2, h3, h4 { letter-spacing: -0.022em; text-wrap: balance; margin: 0; }
h1 { letter-spacing: -0.032em; }
p, li { text-wrap: pretty; }
/* Ultramarine is the signature pigment — selection and focus carry it, nothing else in chrome does. */
::selection { background: var(--clss-ultramarine-wash); color: var(--clss-ink-900); }
:focus-visible { outline: 2px solid var(--clss-ultramarine-ring); outline-offset: 2px; }
/* A quiet, modern scrollbar — never the chunky default. */
* { scrollbar-width: thin; scrollbar-color: var(--clss-ink-300) transparent; }
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-thumb { background: var(--clss-ink-100); border-radius: 999px; border: 3px solid var(--clss-paper); }
::-webkit-scrollbar-thumb:hover { background: var(--clss-ink-300); }
.clss-scroll-quiet { scrollbar-width: none; }
.clss-scroll-quiet::-webkit-scrollbar { display: none; }
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
