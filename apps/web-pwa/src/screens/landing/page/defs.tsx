'use client';

/**
 * The page's shared SVG: the owner's wordmark, Wobo's head, and the two gradients that shade it.
 *
 * One hidden `<svg>` holds them and everything else on the page reaches them with `<use>`, so the
 * wordmark's four glyphs and Wobo's ten shapes exist once in the document instead of eleven times.
 *
 * Every id is prefixed `lv6-` because this page is one screen inside an app, and `#pen` or `#wm`
 * loose in a document is a collision waiting to happen with a board, a chart or another screen.
 *
 * WHY Wobo is drawn here at all, when `@wobo/wobo` has the real rig: most of the Wobos on this page
 * live INSIDE a drawing — on the phone in the night room, stamped on the letter, in the corner of a
 * tile, on the three screens of the devices row. Those are SVG scenes, and the rig is an HTML
 * element, so it cannot go in one. The four Wobos that stand on their own — the hero, the one
 * watching the demo board, the one asking to be asked, and the one in the closing panel — are the
 * real rig (`WoboBody`), and they are the ones the reader actually meets.
 */

import { WORDMARK_GLYPHS, WORDMARK_VIEWBOX } from './wordmark';

/** Wobo's head, drawn flat, for use inside a scene that is itself a drawing. */
export function WoboHead({ groupRef }: { groupRef?: React.Ref<SVGGElement> }) {
  return (
    <g className="wobo" ref={groupRef}>
      <circle cx="60" cy="60" r="52" fill="url(#lv6-hg)" />
      <rect x="18" y="41" width="84" height="38" rx="19" fill="url(#lv6-vg)" />
      <rect x="22" y="45" width="76" height="12" rx="6" fill="var(--paper)" opacity=".35" />
      <g className="eyes">
        <g className="blink">
          <circle cx="43" cy="61" r="9" fill="var(--eye)" />
          <circle cx="77" cy="61" r="9" fill="var(--eye)" />
          <circle cx="40" cy="58" r="3" fill="var(--paper)" opacity=".85" />
          <circle cx="74" cy="58" r="3" fill="var(--paper)" opacity=".85" />
        </g>
      </g>
      <path className="nib" d="M96 96 l10 10 l-4 4 l-10 -10 z" fill="var(--pig)" />
    </g>
  );
}

/** The same head at 120×120, wrapped in its own svg — the size every corner and stamp uses. */
export function WoboMark({
  className,
  bob = false,
  groupRef,
  ...rest
}: {
  className?: string;
  bob?: boolean;
  /** The head's own group — what the lesson engine moves the eyes inside. */
  groupRef?: React.Ref<SVGGElement>;
} & React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true" focusable="false" {...rest}>
      {bob ? (
        <g className="bob">
          <WoboHead groupRef={groupRef} />
        </g>
      ) : (
        <WoboHead groupRef={groupRef} />
      )}
    </svg>
  );
}

/** The wordmark, at whatever height its container gives it. */
export function Wordmark() {
  return (
    <svg viewBox="0 0 1160 340" aria-hidden="true">
      <use href="#lv6-wm" />
    </svg>
  );
}

export function Defs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        <symbol id="lv6-wm" viewBox={WORDMARK_VIEWBOX}>
          {WORDMARK_GLYPHS.map((glyph) => (
            <path key={glyph.transform} transform={glyph.transform} d={glyph.d} />
          ))}
        </symbol>
        {/* Wobo's shading: light falls from the upper left, so the head is lit off-centre. */}
        <radialGradient id="lv6-hg" cx="36%" cy="30%" r="80%">
          <stop offset="0" style={{ stopColor: 'var(--body-hi)' }} />
          <stop offset="1" style={{ stopColor: 'var(--body)' }} />
        </radialGradient>
        <linearGradient id="lv6-vg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--visor)' }} />
          <stop offset="1" style={{ stopColor: 'var(--visor-lo)' }} />
        </linearGradient>
      </defs>
    </svg>
  );
}
