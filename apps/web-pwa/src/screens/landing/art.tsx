'use client';

/**
 * The drawn pieces the page shares: the defs every SVG on it reaches into, Wobo's head as a group
 * that can be nested inside another drawing, and the lesson Wobo draws.
 *
 * All three are ports. The geometry, the gradients and the timing windows are the approved
 * prototype's (`scratchpad/design/landing-v7.html`), unchanged.
 *
 * On the two Wobos: where a Wobo stands on its own — the hero, the ask panel, the close panel, a
 * tile's corner — the page mounts the REAL rig (`WoboBody` from `@wobo/wobo`), because that Wobo is
 * alive: it blinks, it gets bored, its gaze follows the pointer. Where a Wobo is a few dozen pixels
 * inside another drawing (the phone on the night desk, the three screens in the devices tile, the
 * promise icon, the letter's stamp) or where the scroll engine drives its gaze from the pen's own
 * position on the board (`#demoWobo`, `#boardWobo`), it is `WoboHeadGroup` — the same head, drawn
 * as a plain `<g>` so it can live inside a parent SVG and be written to by the engine.
 *
 * Wobo is the HEAD ONLY on this page (DESIGN.md §4, and the owner's standing call): a round head, a
 * pill visor, two eyes with catchlights, and the pen's nib. Never a body.
 */

import type { Ref } from 'react';
import { LESSON } from './lesson';
import { WORDMARK_PATHS, WORDMARK_VIEWBOX } from './wordmark';

/**
 * The document-level defs: the owner's wordmark as a symbol, and the four gradients Wobo's head is
 * shaded with. Rendered once, at the top of the page, in a zero-sized SVG.
 */
export function LandingDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <title>Wobo drawing definitions</title>
      <defs>
        <symbol id="wm" viewBox={WORDMARK_VIEWBOX}>
          {/* Keyed by position, not by outline: the mark has two o's, and their outlines are the
              same path — a content key would collide and React would drop one of them. */}
          {WORDMARK_PATHS.map((glyph, i) => (
            <path
              // biome-ignore lint/suspicious/noArrayIndexKey: four fixed glyphs, in a fixed order
              key={i}
              transform={glyph.transform}
              d={glyph.d}
            />
          ))}
        </symbol>
        {/* Wobo's head is shaded, never flat: a radial highlight up and to the left, and a visor
            that darkens toward its lower edge. */}
        <radialGradient id="hg" cx="36%" cy="30%" r="80%">
          <stop offset="0" style={{ stopColor: 'var(--body-hi)' }} />
          <stop offset="1" style={{ stopColor: 'var(--body)' }} />
        </radialGradient>
        <linearGradient id="vg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--visor)' }} />
          <stop offset="1" style={{ stopColor: 'var(--visor-lo)' }} />
        </linearGradient>
        {/* The close panel is ink-black in both themes, so its Wobo is cream in both. */}
        <radialGradient id="hg-cream" cx="36%" cy="30%" r="80%">
          <stop offset="0" style={{ stopColor: '#FFFFFF' }} />
          <stop offset="1" style={{ stopColor: '#F3F0E8' }} />
        </radialGradient>
        <linearGradient id="vg-night" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: '#0F1226' }} />
          <stop offset="1" style={{ stopColor: '#1E2650' }} />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** The owner's wordmark, stamped. `fill: currentColor` in the stylesheet gives it the ink tone. */
export function Wordmark() {
  return (
    <svg viewBox="0 0 1160 340" aria-hidden="true">
      <use href="#wm" />
    </svg>
  );
}

/**
 * Wobo's head as a bare `<g>`, in the prototype's 120×120 space. Drop it inside any SVG.
 *
 * `id` names it for the engine (`#demoWobo`, `#boardWobo`), which writes a transform onto the
 * `.eyes` group so Wobo watches its own pen move across the board.
 */
export function WoboHeadGroup({
  id,
  transform,
  cream = false,
  headRef,
}: {
  id?: string;
  transform?: string;
  /** The close panel's tone: a cream head on a night visor, whatever the theme is doing. */
  cream?: boolean;
  /** Handed to the engine, which writes the gaze straight onto the `.eyes` group inside. */
  headRef?: Ref<SVGGElement>;
}) {
  const head = cream ? 'url(#hg-cream)' : 'url(#hg)';
  const visor = cream ? 'url(#vg-night)' : 'url(#vg)';
  const glint = cream ? '#FFFFFF' : 'var(--paper)';
  return (
    <g ref={headRef} {...(id ? { id } : {})} {...(transform ? { transform } : {})}>
      <g className="wobo">
        <circle cx="60" cy="60" r="52" fill={head} />
        <rect x="18" y="41" width="84" height="38" rx="19" fill={visor} />
        <rect x="22" y="45" width="76" height="12" rx="6" fill={glint} opacity=".35" />
        <g className="eyes">
          <g className="blink">
            <circle cx="43" cy="61" r="9" fill="var(--eye)" />
            <circle cx="77" cy="61" r="9" fill="var(--eye)" />
            <circle cx="40" cy="58" r="3" fill={glint} opacity=".85" />
            <circle cx="74" cy="58" r="3" fill={glint} opacity=".85" />
          </g>
        </g>
        <path className="nib" d="M96 96 l10 10 l-4 4 l-10 -10 z" fill="var(--pig)" />
      </g>
    </g>
  );
}

/** Wobo's head in its own 120×120 SVG, for the places the composition wants a picture, not a rig. */
export function WoboHeadSvg({
  className,
  bob = false,
  cream = false,
  id,
}: {
  className?: string;
  /** The slow 4.5s float. Off under reduced motion, by the stylesheet. */
  bob?: boolean;
  cream?: boolean;
  id?: string;
}) {
  const head = <WoboHeadGroup {...(id ? { id } : {})} cream={cream} />;
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      {bob ? <g className="bob">{head}</g> : head}
    </svg>
  );
}

/**
 * The proof, drawn. `strokeGroupId` names the group the engine dash-animates; `penId` names the pen
 * that rides the stroke being drawn. Both are the prototype's own ids so the ported engine finds
 * them unchanged.
 */
export function LessonDrawing({
  strokeGroupId,
  penId,
  groupRef,
  penRef,
}: {
  strokeGroupId: 'lessonA' | 'lessonB';
  penId: 'pen' | 'pen2';
  /** The group of marks the engine dash-animates. */
  groupRef?: Ref<SVGGElement>;
  /** The pen that rides whichever mark is being drawn. */
  penRef?: Ref<SVGGElement>;
}) {
  return (
    <>
      <g ref={groupRef} id={strokeGroupId}>
        {LESSON.map((mark) =>
          mark.kind === 'path' ? (
            <path
              key={`${strokeGroupId}-${mark.s}`}
              className={mark.tone === 'ink' ? 'ink' : `ink ${mark.tone}`}
              data-s={mark.s}
              data-e={mark.e}
              d={mark.d}
            />
          ) : (
            <text
              key={`${strokeGroupId}-${mark.s}`}
              className={mark.tone === 'ink' ? 'hw' : `hw ${mark.tone}`}
              x={mark.x}
              y={mark.y}
              fontSize={mark.size}
              data-s={mark.s}
              data-e={mark.e}
            >
              {mark.text}
            </text>
          ),
        )}
      </g>
      {/* The pen itself: a blue nib and the barrel above it, held at a nine-degree lean. */}
      <g ref={penRef} id={penId} opacity="0">
        <path className="penTip" d="M0 0 l-5 -22 l4 -2 l5 22 z" />
        <rect
          x="-4"
          y="-84"
          width="7"
          height="62"
          rx="2"
          fill="var(--ink)"
          transform="rotate(-9)"
        />
      </g>
    </>
  );
}
