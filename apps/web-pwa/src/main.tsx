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
/* One scrollbar: the page's own, thin and quiet. Inner scroll areas scroll invisibly. */
html { scrollbar-width: none; }
::-webkit-scrollbar { display: none; width: 0; height: 0; }
* { scrollbar-width: none; }
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
