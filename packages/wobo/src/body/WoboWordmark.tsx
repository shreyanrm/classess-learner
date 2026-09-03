'use client';

/**
 * WoboWordmark — the name, alive. The two o's blink and glance; the rest of the time it is simply
 * the word, set in our own rounded geometric letterforms (`wordmark.ts`), never an imported logo.
 *
 * One rAF for the whole mark, writing two ellipses. No React render per frame, no font load, no
 * layout pass — so this is safe in a header, a splash, a tab title bar, anywhere the name appears.
 */

import { useReducedMotion } from '@wobo/motion';
import { type CSSProperties, useEffect, useRef } from 'react';
import { ensureRigStyles, RIG_CLASS } from './palette';
import {
  bStemPath,
  nextWordmarkBlink,
  nextWordmarkGlance,
  pupilOffset,
  pupilShape,
  ringPath,
  WORDMARK_BLINK_MS,
  WORDMARK_METRICS,
  WORDMARK_TEXT,
  wordmarkBlinkAt,
  wordmarkGaze,
  wordmarkGeometry,
  wPath,
} from './wordmark';

export {
  nextWordmarkBlink,
  nextWordmarkGlance,
  PUPIL_TRAVEL,
  pupilOffset,
  pupilShape,
  WORDMARK_BLINK_MS,
  WORDMARK_METRICS,
  WORDMARK_TEXT,
  type WordmarkGlyph,
  wordmarkBlinkAt,
  wordmarkEyes,
  wordmarkGaze,
  wordmarkGeometry,
} from './wordmark';

export interface WoboWordmarkProps {
  /** Cap-to-baseline height in px. Everything scales off it. */
  height?: number;
  /** The letterforms. Defaults to the rig's body tone, so the mark matches Wobo. */
  color?: string;
  /** The pupils. Defaults to the rig's one pigment. */
  eyeColor?: string;
  /** Let the eyes follow the pointer. Off makes them glance about on their own. */
  follow?: boolean;
  className?: string;
  style?: CSSProperties;
}

const round = (v: number) => Math.round(v * 100) / 100;
/** How far the pointer has to be before the eyes are looking as hard as they can, in px. */
const FOLLOW_REACH = 320;

/**
 * The wordmark's geometry takes no arguments and never changes, so it is laid out once for the
 * module rather than per mount — which also keeps the frame loop free of any dependency on it.
 */
const GEOMETRY = wordmarkGeometry();
const EYES = GEOMETRY.glyphs.filter((g) => g.eye);
const EYE_CENTRES = EYES.map((e) => e.center as { x: number; y: number });
const VIEW_WIDTH = GEOMETRY.width + WORDMARK_METRICS.stroke;

export function WoboWordmark({
  height = 28,
  color = 'var(--wr-body)',
  eyeColor = 'var(--wr-eye)',
  follow = true,
  className,
  style,
}: WoboWordmarkProps) {
  const reduced = useReducedMotion();

  const rootRef = useRef<SVGSVGElement | null>(null);
  const pupilRefs = useRef<(SVGEllipseElement | null)[]>([]);
  const followRef = useRef(follow);
  followRef.current = follow;

  useEffect(() => {
    ensureRigStyles();
  }, []);

  useEffect(() => {
    const centres = EYE_CENTRES;
    const paint = (gaze: [number, number], blink: number) => {
      const [ox, oy] = pupilOffset(gaze[0], gaze[1]);
      for (let i = 0; i < centres.length; i++) {
        const el = pupilRefs.current[i];
        const c = centres[i];
        if (!el || !c) continue;
        const s = pupilShape(c.x + ox, c.y + oy, blink);
        el.setAttribute('cx', String(round(s.cx)));
        el.setAttribute('cy', String(round(s.cy)));
        el.setAttribute('rx', String(round(s.rx)));
        el.setAttribute('ry', String(round(s.ry)));
      }
    };

    if (reduced) {
      paint([0, 0], 0);
      return;
    }

    let raf = 0;
    let blinkStart = -1;
    let nextBlink = nextWordmarkBlink();
    let glance = nextWordmarkGlance();
    let nextGlance = glance.delay;
    let target: [number, number] = [0, 0];
    const eased: [number, number] = [0, 0];
    let pointer: { x: number; y: number } | null = null;
    let pointerAt = -Number.MAX_SAFE_INTEGER;
    let start = 0;

    const onMove = (e: PointerEvent) => {
      pointer = { x: e.clientX, y: e.clientY };
      pointerAt = performance.now();
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    const tick = (now: number) => {
      if (!start) start = now;
      const t = now - start;

      if (blinkStart < 0 && t >= nextBlink) blinkStart = t;
      let blink = 0;
      if (blinkStart >= 0) {
        blink = wordmarkBlinkAt(t - blinkStart);
        if (t - blinkStart >= WORDMARK_BLINK_MS) {
          blinkStart = -1;
          nextBlink = t + nextWordmarkBlink();
        }
      }

      // The pointer wins while it is live; otherwise the eyes wander on their own.
      const live = followRef.current && pointer && now - pointerAt < 3_000 ? pointer : null;
      const first = centres[0];
      if (live && first && rootRef.current) {
        // The viewBox is inset by half a stroke on the left, so a unit maps through that origin.
        const box = rootRef.current.getBoundingClientRect();
        const px = box.width / Math.max(1, VIEW_WIDTH);
        const py = box.height / Math.max(1, GEOMETRY.height);
        target = wordmarkGaze(
          { x: box.left + (first.x + WORDMARK_METRICS.stroke / 2) * px, y: box.top + first.y * py },
          live,
          FOLLOW_REACH,
        );
      } else if (t >= nextGlance) {
        glance = nextWordmarkGlance();
        nextGlance = t + glance.delay;
        target = glance.gaze;
      }
      eased[0] += (target[0] - eased[0]) * 0.12;
      eased[1] += (target[1] - eased[1]) * 0.12;

      paint([eased[0], eased[1]], blink);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
    };
  }, [reduced]);

  const scale = height / (WORDMARK_METRICS.baseline - WORDMARK_METRICS.capTop);

  return (
    <svg
      ref={rootRef}
      className={className ? `${RIG_CLASS} ${className}` : RIG_CLASS}
      viewBox={`${-WORDMARK_METRICS.stroke / 2} 0 ${VIEW_WIDTH} ${GEOMETRY.height}`}
      width={round(VIEW_WIDTH * scale)}
      height={round(GEOMETRY.height * scale)}
      role="img"
      aria-label={WORDMARK_TEXT}
      style={{ display: 'block', overflow: 'visible', ...style }}
    >
      <g
        fill="none"
        stroke={color}
        strokeWidth={WORDMARK_METRICS.stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {GEOMETRY.glyphs.map((glyph) => {
          // The glyph's own left edge is its identity: the layout is fixed, so no two share one.
          const id = `${glyph.kind}-${glyph.x}`;
          if (glyph.kind === 'W') return <path key={id} d={wPath(glyph.x)} />;
          const c = glyph.center as { x: number; y: number };
          if (glyph.kind === 'b') {
            return (
              <g key={id}>
                <path d={bStemPath(glyph.x)} />
                <path d={ringPath(c.x, c.y)} />
              </g>
            );
          }
          return <path key={id} d={ringPath(c.x, c.y)} />;
        })}
      </g>
      {EYES.map((eye, i) => {
        const c = eye.center as { x: number; y: number };
        const s = pupilShape(c.x, c.y, 0);
        return (
          <ellipse
            key={`pupil-${eye.x}`}
            ref={(el) => {
              pupilRefs.current[i] = el;
            }}
            cx={s.cx}
            cy={s.cy}
            rx={s.rx}
            ry={s.ry}
            fill={eyeColor}
          />
        );
      })}
    </svg>
  );
}
