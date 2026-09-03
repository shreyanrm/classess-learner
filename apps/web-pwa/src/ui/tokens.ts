/**
 * Palette v4 in code — the few values the app needs outside a stylesheet, and the bridge that
 * carries the older `--wobo-*` token layer onto the new paper.
 *
 * The palette itself is `tokens.css`; this file never restates a colour the stylesheet does not
 * also declare (tokens.test.ts checks both against design/prototypes/app-v1.html).
 */

/** The page colour of each theme — what index.html paints before any JS, and the browser chrome. */
export const PAGE = Object.freeze({
  light: '#FAF7F0',
  dark: '#0F1226',
} as const);

/**
 * The bridge: every colour the older `--wobo-*` layer (packages/config) still hands out is
 * re-pointed at a palette v4 token, so a screen that has not been rebuilt yet sits on the same
 * paper as one that has. The values are `var()` references, so both themes come for free from the
 * stamps in tokens.css. Injected AFTER the config layer's own variables (src/main.tsx), so order —
 * not specificity — decides.
 *
 * What stays as it was: the frost glasses (a blur over whatever is beneath), the spotlight, the
 * beam gradients, and the highlight frost — none of them is a surface or an ink, and each already
 * reads correctly on cream and on navy.
 */
export const LEGACY_TOKEN_BRIDGE = `:root {
  --wobo-page: var(--paper);
  --wobo-paper: var(--paper);
  --wobo-canvas: var(--paper);
  --wobo-card: var(--paper-2);
  --wobo-card-border: var(--paper-3);
  --wobo-card-hover: var(--paper-3);
  --wobo-tonal: var(--paper-2);
  --wobo-tonal-hover: var(--paper-3);
  --wobo-surface-1: var(--paper-2);
  --wobo-surface-2: var(--paper-3);
  --wobo-surface-3: var(--paper-3);
  --wobo-surface-4: var(--paper-3);
  --wobo-ink: var(--ink);
  --wobo-ink-900: var(--ink);
  --wobo-ink-800: var(--ink);
  --wobo-ink-700: var(--ink);
  --wobo-ink-500: var(--ink-2);
  --wobo-ink-300: var(--ink-3);
  --wobo-ink-100: var(--paper-3);
  --wobo-ink-hover: var(--ink-2);
  --wobo-ink-soft: var(--ink-2);
  --wobo-ink-faint: var(--ink-3);
  --wobo-faint: var(--ink-3);
  --wobo-on-ink: var(--paper);
  --wobo-hairline-on-paper: var(--paper-3);
  --wobo-hairline-on-paper-strong: var(--paper-3);
  --wobo-hairline-on-dark: var(--paper-3);
  --wobo-ultramarine: var(--pig);
  --wobo-ultramarine-base: var(--pig);
  --wobo-ultramarine-hover: var(--pig);
  --wobo-ultramarine-active: var(--pig);
  --wobo-ultramarine-soft: var(--pig-w);
  --wobo-ultramarine-wash: var(--pig-w);
  --wobo-ultramarine-ring: var(--pig);
  --wobo-highlight-ink: var(--pig);
  --wobo-accent-molten: var(--rose);
  --wobo-accent-magenta: var(--violet);
  --wobo-accent-acid: var(--mint);
  --wobo-molten: var(--rose);
  --wobo-molten-base: var(--rose);
  --wobo-molten-hover: var(--rose);
  --wobo-molten-active: var(--rose);
  --wobo-molten-soft: var(--rose-w);
  --wobo-molten-ring: var(--rose);
  --wobo-feedback-correct: var(--mint);
  --wobo-feedback-correctSoft: var(--mint-w);
  --wobo-feedback-retry: var(--marigold);
  --wobo-feedback-retrySoft: var(--marigold-w);
}`;

/** The older tokens the bridge leaves alone, by name — see the note above. */
export const LEGACY_TOKENS_KEPT: readonly string[] = [
  '--wobo-frost-on-paper',
  '--wobo-frost-on-dark',
  '--wobo-highlight-frost',
  '--wobo-spotlight',
  '--wobo-wobo-beam',
  '--wobo-wobo-beam-pool',
];
