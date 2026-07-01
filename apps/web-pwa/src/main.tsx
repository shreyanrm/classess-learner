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
  background: var(--clss-canvas);
  color: var(--clss-ink-900);
  -webkit-font-smoothing: antialiased;
}
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
