/**
 * The ink visor wobot — Wobo's locked palette (owner call, 2026-09-02; palette v4, DESIGN.md §2/§4).
 *
 * The tones are NOT defined here. They are Wobo's identity, so they live in `src/identity.ts` with
 * the rest of the lock, and the rig reads them: light is a deep-navy ink body carrying a cream
 * visor, night swaps to a cream body carrying a night visor, and Wobo's eyes and pen tip are Wobo
 * blue in both — the only pigment on Wobo (DESIGN.md §2, law 4). A half-pixel hairline in the
 * opposite tone rims Wobo so Wobo stays legible over any content.
 */

import { WOBO_TONES, type WoboTones } from '../identity';

/** The four tones one theme renders Wobo in. Defined with the identity lock; re-exported here. */
export type RigTones = WoboTones;

/** Wobo on paper — read from the identity lock, never restated. */
export const RIG_LIGHT: Readonly<RigTones> = WOBO_TONES.light;

/** Wobo on night — read from the identity lock, never restated. */
export const RIG_DARK: Readonly<RigTones> = WOBO_TONES.dark;

/** Wobo's body is 92% ink, never a solid hole punched through the page. */
export const RIG_BODY_OPACITY = 0.92;

/** The class every rig root carries; the tokens below hang off it. */
export const RIG_CLASS = 'wobo-rig';

/**
 * The rig's own token layer. Theme is a CSS concern, never a JS observer: the app writes
 * `data-theme` on the document root (apps/web-pwa/src/ui/theme.ts) and the tones swap here. The
 * `prefers-color-scheme` block covers any host that has not written the attribute yet.
 */
export const RIG_CSS = `
.${RIG_CLASS}{--wr-body:${RIG_LIGHT.body};--wr-visor:${RIG_LIGHT.visor};--wr-eye:${RIG_LIGHT.eye};--wr-hair:${RIG_LIGHT.hairline}}
[data-theme="dark"] .${RIG_CLASS}{--wr-body:${RIG_DARK.body};--wr-visor:${RIG_DARK.visor};--wr-eye:${RIG_DARK.eye};--wr-hair:${RIG_DARK.hairline}}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .${RIG_CLASS}{--wr-body:${RIG_DARK.body};--wr-visor:${RIG_DARK.visor};--wr-eye:${RIG_DARK.eye};--wr-hair:${RIG_DARK.hairline}}}
`.trim();

const STYLE_ID = 'wobo-rig-styles';

/** Inject the rig token layer once per document. No-op on the server and on repeat calls. */
export function ensureRigStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = RIG_CSS;
  document.head.appendChild(el);
}
