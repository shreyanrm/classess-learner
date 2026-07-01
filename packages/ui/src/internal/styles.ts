'use client';

import {
  canvas,
  duration,
  easing,
  fontFamily,
  hairline,
  ink,
  paper,
  radius,
  space,
  typeScale,
} from '@classess/config';
import { useEffect } from 'react';

/**
 * One generated stylesheet, derived from @classess/config (never hand-kept, never hardcoded). It
 * carries only what inline styles cannot express: the interactive pseudo-states (:hover / :focus-
 * visible / :active / :disabled / ::placeholder), the reduced-motion calm equivalents, and the two
 * keyframes (skeleton shimmer, loading spinner). Per-instance values (an earned accent, a width)
 * stay in inline `style`. Depth is hairline + tone only — there are no drop shadows in here.
 */

const micro = `${duration.micro}ms ${easing.standard}`;
const standard = `${duration.standard}ms ${easing.standard}`;

export const STYLE_ID = 'clss-ui-base';

/** Shared focus ring class — applied to every focusable control. */
export const FOCUSABLE = 'clss-focusable';

export const baseCss = `
.${FOCUSABLE}:focus-visible {
  outline: 2px solid ${ink[900]};
  outline-offset: 2px;
}

/* Button + IconButton ------------------------------------------------------ */
.clss-btn {
  font-family: ${fontFamily.system};
  font-weight: 500;
  font-size: 1rem;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${space.half}px;
  border: 1px solid transparent;
  border-radius: ${radius.sm}px;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: background ${micro}, color ${micro}, border-color ${micro};
}
.clss-btn:disabled,
.clss-btn[aria-disabled="true"] { cursor: not-allowed; opacity: 0.45; }
.clss-btn--sm { padding: ${space.half}px ${space[1]}px; font-size: ${typeScale.caption.size}; }
.clss-btn--md { padding: ${space[1]}px ${space[2]}px; }
.clss-btn--lg { padding: ${space[1]}px ${space[3]}px; font-size: ${typeScale.bodyLg.size}; }
.clss-btn--primary { background: ${ink[900]}; color: ${paper}; }
.clss-btn--primary:hover:not(:disabled):not([aria-disabled="true"]) { background: ${ink[800]}; }
.clss-btn--primary:active:not(:disabled):not([aria-disabled="true"]) { background: ${ink[700]}; }
.clss-btn--secondary { background: ${paper}; color: ${ink[900]}; border-color: ${ink[100]}; }
.clss-btn--secondary:hover:not(:disabled):not([aria-disabled="true"]) { background: ${canvas}; border-color: ${ink[300]}; }
.clss-btn--secondary:active:not(:disabled):not([aria-disabled="true"]) { background: ${ink[100]}; }
.clss-btn--ghost { background: transparent; color: ${ink[900]}; }
.clss-btn--ghost:hover:not(:disabled):not([aria-disabled="true"]) { background: ${ink[100]}; }
.clss-btn--ghost:active:not(:disabled):not([aria-disabled="true"]) { background: ${ink[300]}; }
.clss-iconbtn {
  width: 40px; height: 40px; padding: 0; flex: none;
}
.clss-iconbtn--sm { width: 32px; height: 32px; }

/* Fields: Input / TextArea / Select --------------------------------------- */
.clss-field {
  font-family: ${fontFamily.system};
  font-size: 1rem;
  line-height: ${typeScale.body.lineHeight};
  color: ${ink[900]};
  background: ${paper};
  border: 1px solid ${hairline.onPaper};
  border-radius: ${radius.sm}px;
  padding: ${space[1]}px ${space[1]}px;
  width: 100%;
  box-sizing: border-box;
  transition: border-color ${micro};
}
.clss-field::placeholder { color: ${ink[500]}; }
.clss-field:hover:not(:disabled):not([aria-invalid="true"]) { border-color: ${ink[300]}; }
.clss-field:focus { outline: none; border-color: ${ink[900]}; }
.clss-field[aria-invalid="true"] { border-color: ${ink[900]}; border-width: 2px; }
.clss-field:disabled { background: ${canvas}; color: ${ink[500]}; cursor: not-allowed; }
textarea.clss-field { resize: vertical; min-height: ${space[8]}px; }
select.clss-field {
  appearance: none;
  -webkit-appearance: none;
  padding-right: ${space[4]}px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%236B6B70' stroke-width='1.5'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right ${space[1]}px center;
}

/* Toggle ------------------------------------------------------------------- */
.clss-toggle {
  position: relative;
  width: 44px; height: 26px; padding: 0; flex: none;
  border: 0; border-radius: ${radius.jelly}px;
  background: ${ink[300]}; cursor: pointer;
  transition: background ${micro};
}
.clss-toggle[aria-checked="true"] { background: ${ink[900]}; }
.clss-toggle:disabled { opacity: 0.45; cursor: not-allowed; }
.clss-toggle__knob {
  position: absolute; top: 3px; left: 3px;
  width: 20px; height: 20px; border-radius: ${radius.jelly}px;
  background: ${paper};
  transition: transform ${micro};
}
.clss-toggle[aria-checked="true"] .clss-toggle__knob { transform: translateX(18px); }

/* Tabs --------------------------------------------------------------------- */
.clss-tabs__list {
  display: flex; gap: ${space[3]}px;
  border-bottom: 1px solid ${hairline.onPaper};
}
.clss-tab {
  position: relative;
  font-family: ${fontFamily.system}; font-size: 1rem; font-weight: 500;
  background: none; border: 0; cursor: pointer;
  color: ${ink[500]}; padding: ${space[1]}px 0;
  transition: color ${micro};
}
.clss-tab:hover { color: ${ink[900]}; }
.clss-tab[aria-selected="true"] { color: ${ink[900]}; }
.clss-tab__ink {
  position: absolute; left: 0; right: 0; bottom: -1px; height: 2px;
  background: ${ink[900]};
  transform: scaleX(0); transform-origin: left center;
  transition: transform ${standard};
}
.clss-tab[aria-selected="true"] .clss-tab__ink { transform: scaleX(1); }

/* Skeleton (tonal shimmer) ------------------------------------------------- */
@keyframes clss-shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
.clss-skeleton {
  background: linear-gradient(90deg, ${ink[100]} 25%, ${ink[300]} 37%, ${ink[100]} 63%);
  background-size: 200% 100%;
  animation: clss-shimmer 1.4s ${easing.standard} infinite;
  border-radius: ${radius.sm}px;
}

/* Loading spinner ---------------------------------------------------------- */
@keyframes clss-spin { to { transform: rotate(360deg); } }
.clss-spinner { animation: clss-spin 0.7s linear infinite; transform-origin: center; }

/* Calm equivalents for the CSS-driven micro-interactions ------------------- */
@media (prefers-reduced-motion: reduce) {
  .clss-btn, .clss-field, .clss-toggle, .clss-toggle__knob,
  .clss-tab, .clss-tab__ink { transition: none; }
  .clss-skeleton { animation: none; background: ${ink[100]}; }
  .clss-spinner { animation-duration: 1.6s; }
}
`;

/**
 * Inject the base stylesheet once into the document head (idempotent, SSR-safe). Every primitive
 * calls this on mount; the `STYLE_ID` guard means it only ever runs once. Apps that render on the
 * server can also inline `baseCss` at the root to avoid an unstyled first paint.
 */
export function useClssStyles(): void {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = baseCss;
    document.head.appendChild(el);
  }, []);
}
