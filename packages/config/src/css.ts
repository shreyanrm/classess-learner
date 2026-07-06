import {
  accent,
  canvas,
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
  vidyaHighlight,
  zIndex,
} from './tokens';

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
  push('--clss-vidya-molten', accent.molten);
  push('--clss-vidya-highlight-primary', vidyaHighlight.primary);
  push('--clss-vidya-highlight-secondary', vidyaHighlight.secondary);
  push('--clss-vidya-highlight-tertiary', vidyaHighlight.tertiary);

  for (const [name, px] of Object.entries(radius)) push(`--clss-radius-${name}`, `${px}px`);
  push('--clss-frost-blur', frost.blur);
  push('--clss-frost-on-paper', frost.onPaper);
  push('--clss-frost-on-dark', frost.onDark);

  for (const [name, px] of Object.entries(space)) push(`--clss-space-${name}`, `${px}px`);

  for (const [name, ms] of Object.entries(duration)) push(`--clss-duration-${name}`, `${ms}ms`);
  for (const [name, fn] of Object.entries(easing)) push(`--clss-ease-${name}`, fn);

  for (const [name, z] of Object.entries(zIndex)) push(`--clss-z-${name}`, String(z));

  return `:root {\n${lines.join('\n')}\n}\n`;
}
