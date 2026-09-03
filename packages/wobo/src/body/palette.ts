/**
 * The ink visor wobot — Wobo's locked palette (owner call, 2026-09-02).
 *
 * Light: a near-black body carrying a white visor. Dark: the tones invert — a paper body carrying a
 * near-black visor. Wobo's eyes are ultramarine in both, and they are the ONLY pigment on the screen
 * (DESIGN.md §2, law 4). A half-pixel hairline in the opposite tone rims Wobo so Wobo stays legible
 * over any content: over dark content in light theme, over light content in dark theme.
 *
 * These are Wobo's identity, not choreography. Anything that renders Wobo reads them from here.
 */

export interface RigTones {
  /** Wobo's body — the near-black shell in light, the paper shell in dark. */
  body: string;
  /** The visor Wobo carries their eyes in — the opposite tone to the body. */
  visor: string;
  /** Wobo's eyes and Wobo's pen tip. The one hit of pigment. */
  eye: string;
  /** The half-pixel rim, in the opposite tone, that keeps Wobo legible over any content. */
  hairline: string;
}

export const RIG_LIGHT: Readonly<RigTones> = Object.freeze({
  body: '#1A1A1F',
  visor: '#FFFFFF',
  eye: '#1F35E0',
  hairline: 'rgba(255,255,255,0.55)',
});

export const RIG_DARK: Readonly<RigTones> = Object.freeze({
  body: '#EDEDF1',
  visor: '#0D0D10',
  eye: '#7B8CFF',
  hairline: 'rgba(13,13,16,0.40)',
});

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
