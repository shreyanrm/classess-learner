import {
  accent,
  canvas,
  chrome,
  dark,
  duration,
  easing,
  feedback,
  frost,
  hairline,
  ink,
  molten,
  paper,
  radius,
  space,
  surface,
  ultramarine,
  ultramarineShades,
  woboHighlight,
  zIndex,
} from './tokens';

/** Map a camelCase chrome role to its `--wobo-*` custom-property name. */
function chromeVar(role: string): string {
  return `--wobo-${role.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`;
}

/**
 * CSS custom properties derived from the token tree (single source of truth — no hand-kept CSS
 * file to drift). The web app injects this once at the root. Names follow `--wobo-*`.
 */
export function cssVariables(): string {
  const lines: string[] = [];
  const push = (name: string, value: string | number) => lines.push(`  ${name}: ${value};`);

  for (const [step, hex] of Object.entries(ink)) push(`--wobo-ink-${step}`, hex);
  push('--wobo-paper', paper);
  push('--wobo-canvas', canvas);
  for (const [step, hex] of Object.entries(surface)) push(`--wobo-surface-${step}`, hex);
  push('--wobo-hairline-on-paper', hairline.onPaper);
  push('--wobo-hairline-on-paper-strong', hairline.onPaperStrong);
  push('--wobo-hairline-on-dark', hairline.onDark);

  push('--wobo-ultramarine', ultramarine);
  for (const [name, value] of Object.entries(ultramarineShades))
    push(`--wobo-ultramarine-${name}`, value);
  for (const [name, hex] of Object.entries(accent)) push(`--wobo-accent-${name}`, hex);
  for (const [name, value] of Object.entries(molten)) push(`--wobo-molten-${name}`, value);
  for (const [name, value] of Object.entries(feedback)) push(`--wobo-feedback-${name}`, value);
  push('--wobo-molten', accent.molten);
  push('--wobo-highlight-ink', woboHighlight.ink);
  push('--wobo-highlight-frost', woboHighlight.frost);

  for (const [name, px] of Object.entries(radius)) push(`--wobo-radius-${name}`, `${px}px`);
  push('--wobo-frost-blur', frost.blur);
  push('--wobo-frost-on-paper', frost.onPaper);
  push('--wobo-frost-on-dark', frost.onDark);

  for (const [name, px] of Object.entries(space)) push(`--wobo-space-${name}`, `${px}px`);

  for (const [name, ms] of Object.entries(duration)) push(`--wobo-duration-${name}`, `${ms}ms`);
  for (const [name, fn] of Object.entries(easing)) push(`--wobo-ease-${name}`, fn);

  for (const [name, z] of Object.entries(zIndex)) push(`--wobo-z-${name}`, String(z));

  // Chrome (second-cut neutrals) — light values; the dark block below overrides the theme-sensitive ones.
  for (const [role, hex] of Object.entries(chrome)) push(chromeVar(role), hex);

  const darkLines = Object.entries(dark).map(([name, value]) => `  ${name}: ${value};`);

  return `:root {\n${lines.join('\n')}\n}\n[data-theme="dark"] {\n${darkLines.join('\n')}\n}\n`;
}
