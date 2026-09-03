/**
 * The durable accessibility profile — larger text and high contrast, applied for real (no fake
 * behavior law). Mirrors the theme module's pattern: attributes on the document root drive a small
 * token-override stylesheet. The settings themselves live on the learner profile so they also ride
 * Wobo's dossier and reload with the learner.
 */

import { loadProfile } from '../screens/you/profile';

const STYLE_ID = 'wobo-access';

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  // Large text scales the rem-based type across the app; high contrast pulls the muted inks and
  // hairlines up to full strength — token overrides only, so light/dark both stay coherent.
  s.textContent = `
:root[data-large-text="on"] { font-size: 118%; }
:root[data-contrast="high"] {
  --wobo-ink-500: var(--wobo-ink-900);
  --wobo-ink-300: var(--wobo-ink-700);
  --wobo-ink-faint: var(--wobo-ink-700);
  --wobo-hairline-on-paper-strong: var(--wobo-ink-900);
}`;
  document.head.appendChild(s);
}

/** Paint the two display settings from the profile (or an explicit override). */
export function paintAccess(a?: { largeText?: boolean; highContrast?: boolean }): void {
  ensureStyle();
  const p = a ?? loadProfile();
  const root = document.documentElement;
  if (p.largeText) root.setAttribute('data-large-text', 'on');
  else root.removeAttribute('data-large-text');
  if (p.highContrast) root.setAttribute('data-contrast', 'high');
  else root.removeAttribute('data-contrast');
}

/** Call once at boot: paint the stored accessibility profile before first paint of the app. */
export const initAccess = (): void => paintAccess();
