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

/** Map a camelCase chrome role to its `--clss-*` custom-property name. */
function chromeVar(role: string): string {
  return `--clss-${role.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`;
}

/**
 * CSS custom properties derived from the token tree (single source of truth — no hand-kept CSS
 * file to drift). The web app injects this once at the root. Names follow `--clss-*`.
 */
export function cssVariables(): string {
  const lines: string[] = [];
  const push = (name: string, value: string | number) => lines.push(`  ${name}: ${value};`);

  for (const [step, hex] of Object.entries(ink)) push(`--clss-ink-${step}`, hex);
  push('--clss-paper', paper);
  push('--clss-canvas', canvas);
  for (const [step, hex] of Object.entries(surface)) push(`--clss-surface-${step}`, hex);
  push('--clss-hairline-on-paper', hairline.onPaper);
  push('--clss-hairline-on-paper-strong', hairline.onPaperStrong);
  push('--clss-hairline-on-dark', hairline.onDark);

  push('--clss-ultramarine', ultramarine);
  for (const [name, value] of Object.entries(ultramarineShades))
    push(`--clss-ultramarine-${name}`, value);
  for (const [name, hex] of Object.entries(accent)) push(`--clss-accent-${name}`, hex);
  for (const [name, value] of Object.entries(molten)) push(`--clss-molten-${name}`, value);
  for (const [name, value] of Object.entries(feedback)) push(`--clss-feedback-${name}`, value);
  push('--clss-wobo-molten', accent.molten);
  push('--clss-wobo-highlight-primary', woboHighlight.primary);
  push('--clss-wobo-highlight-secondary', woboHighlight.secondary);
  push('--clss-wobo-highlight-tertiary', woboHighlight.tertiary);

  for (const [name, px] of Object.entries(radius)) push(`--clss-radius-${name}`, `${px}px`);
  push('--clss-frost-blur', frost.blur);
  push('--clss-frost-on-paper', frost.onPaper);
  push('--clss-frost-on-dark', frost.onDark);

  for (const [name, px] of Object.entries(space)) push(`--clss-space-${name}`, `${px}px`);

  for (const [name, ms] of Object.entries(duration)) push(`--clss-duration-${name}`, `${ms}ms`);
  for (const [name, fn] of Object.entries(easing)) push(`--clss-ease-${name}`, fn);

  for (const [name, z] of Object.entries(zIndex)) push(`--clss-z-${name}`, String(z));

  // Chrome (second-cut neutrals) — light values; the dark block below overrides the theme-sensitive ones.
  for (const [role, hex] of Object.entries(chrome)) push(chromeVar(role), hex);

  const darkLines = Object.entries(dark).map(([name, value]) => `  ${name}: ${value};`);

  return `:root {\n${lines.join('\n')}\n}\n[data-theme="dark"] {\n${darkLines.join('\n')}\n}\n`;
}
