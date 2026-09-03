'use client';

/**
 * The ink for the state family — one drawing per thing that can go wrong, ported from the
 * owner-directed prototype (`design/prototypes/states-v2.html`): 3.5px ink with round caps, the
 * pen in Wobo blue, the washes at the prototype's own opacities.
 *
 * Two rules hold all six together. First, every drawing is a line being drawn: the stroke arrives
 * with the same dash-offset motion Wobo's own hand uses, so a page that failed still looks like
 * this product and not like an error template. Second, the character in the picture is the REAL
 * rig (`WoboBody`), never a lookalike head — the learner meets the same Wobo here that teaches
 * them, which is the whole reason these pages feel like somebody is with them.
 *
 * The prototype's own placeholder head is therefore not ported; its POSITION is (each scene keeps
 * the composition it was designed with, in the same 360 x 220 frame).
 *
 * Under reduced motion nothing moves: `styles.ts` rests every path at its finished state, and each
 * scene was composed to read as a still picture first.
 */

import { WoboBody, type WoboExpression } from '@wobo/wobo';
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react';

/** The frame every scene is drawn in. */
export const ART_VIEW = { width: 360, height: 220 } as const;

/** Where Wobo stands in a scene, in the frame's own coordinates. */
export interface WoboMark {
  /** Centre of Wobo's head, in view units. */
  x: number;
  y: number;
  /** Head diameter, in view units. */
  size: number;
  mood: WoboExpression;
}

/** The live pixel width of an element — the scenes scale with the column, and so must Wobo. */
function useBoxWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setWidth(el.getBoundingClientRect().width);
    read();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/**
 * A scene: the drawn part as SVG, and Wobo standing in it as the real rig.
 *
 * `label` is what a screen reader is told the picture shows — these are the only images in the
 * product a learner meets while something is wrong, so they are described, never decorative.
 */
export function InkScene({
  label,
  wobo,
  children,
}: {
  label: string;
  wobo?: WoboMark;
  children: ReactNode;
}) {
  const [ref, width] = useBoxWidth<HTMLDivElement>();
  const scale = width > 0 ? width / ART_VIEW.width : 0;
  return (
    <div
      ref={ref}
      className="ws-art"
      style={{ position: 'relative', aspectRatio: `${ART_VIEW.width} / ${ART_VIEW.height}` }}
    >
      <svg
        viewBox={`0 0 ${ART_VIEW.width} ${ART_VIEW.height}`}
        width="100%"
        height="100%"
        role="img"
        aria-label={label}
        style={{ display: 'block', overflow: 'visible' }}
      >
        {children}
      </svg>
      {wobo && scale > 0 ? (
        <div
          aria-hidden
          style={{
            left: `${(wobo.x / ART_VIEW.width) * 100}%`,
            pointerEvents: 'none',
            position: 'absolute',
            top: `${(wobo.y / ART_VIEW.height) * 100}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <WoboBody size={wobo.size * scale} mood={wobo.mood} />
        </div>
      ) : null}
    </div>
  );
}

/** A path that draws itself on. `len` is the path length the dash animation runs over. */
export function Draw({
  d,
  len,
  dur = 1.6,
  delay = 0,
  stroke = 'var(--ink)',
  width = 3.5,
  dashed,
  fill = 'none',
  className,
}: {
  d: string;
  len: number;
  dur?: number;
  delay?: number;
  stroke?: string;
  width?: number;
  dashed?: string;
  fill?: string;
  className?: string;
}) {
  // A drawing filled with a wash keeps the prototype's own tint: the envelope at .14.
  const washed = className === 'ws-wash';
  // A dashed line cannot also carry the draw-on dash pattern, so a dashed path skips the animation
  // and simply arrives — the alternative is a stroke that visibly fights itself.
  const style = {
    '--ws-len': len,
    '--ws-dur': `${dur}s`,
    '--ws-delay': `${delay}s`,
  } as CSSProperties;
  return (
    <path
      d={d}
      className={[dashed ? 'ws-fade' : 'ws-draw', className].filter(Boolean).join(' ')}
      style={style}
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...(dashed ? { strokeDasharray: dashed } : {})}
      {...(washed ? { fillOpacity: 0.14 } : {})}
      fill={fill}
    />
  );
}

/** Anything that arrives after the ink, on a beat. */
export function Fade({ delay = 0, children }: { delay?: number; children: ReactNode }) {
  return (
    <g className="ws-fade" style={{ '--ws-delay': `${delay}s` } as CSSProperties}>
      {children}
    </g>
  );
}

const INK = 'var(--ink)';
const PIG = 'var(--pig)';
const FAINT = 'var(--ink-3)';
/** The one stroke every drawing here is made with (DESIGN.md §2: 3px on screens, 4px for hero ink). */
const STROKE = 3.5;

// --- 404: a dotted path across a map that ends at a question mark ---------------------------------

export const NOT_FOUND_WOBO: WoboMark = { x: 90, y: 130, size: 88, mood: 'curious' };

export function NotFoundArt() {
  return (
    <>
      {/* the path draws itself on and settles solid, as the prototype's does (its `.draw` rule
          overrides the dash pattern on the path, so the dashes never show) */}
      <Draw d="M150 150 c30 -60 70 -60 100 -20 s60 40 80 -10" len={280} dur={1.8} delay={0.3} />
      <Fade delay={2}>
        <text
          x="322"
          y="102"
          fontFamily="var(--hand)"
          fontSize="64"
          fontWeight="700"
          fill={PIG}
          textAnchor="middle"
        >
          ?
        </text>
      </Fade>
      <path d="M160 190 l10 -16 l10 16 z" fill="var(--marigold)" fillOpacity={0.35} />
      <Draw d="M160 190 l10 -16 l10 16 z" len={60} dur={0.8} delay={1} stroke={INK} />
      <Draw d="M230 60 v14 h12 v-14 z M236 60 v-8" len={60} dur={0.8} delay={1.3} stroke={INK} />
      <Draw
        d="M280 170 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0"
        len={60}
        dur={0.8}
        delay={1.6}
        stroke={INK}
      />
    </>
  );
}

// --- 500: the line Wobo was drawing wobbles and breaks --------------------------------------------

export const SERVER_ERROR_WOBO: WoboMark = { x: 290, y: 100, size: 88, mood: 'supportive' };

export function ServerErrorArt() {
  return (
    <>
      <Draw
        d="M30 150 c40 0 60 -6 90 -4 s40 12 60 -6 s10 -30 30 -24"
        len={260}
        dur={1.1}
        stroke={PIG}
      />
      <Draw d="M214 116 l8 -18 l-14 6 l10 -16" len={70} dur={0.5} delay={1} stroke={PIG} />
    </>
  );
}

// --- offline: a paper plane that drifts and drops, and will fly again ------------------------------

export const OFFLINE_WOBO: WoboMark = { x: 80, y: 120, size: 88, mood: 'encouraging' };

export function OfflineArt() {
  return (
    <>
      <Draw
        d="M140 110 c40 -30 80 -30 120 -20"
        len={140}
        dur={1.2}
        delay={0.6}
        stroke={FAINT}
        dashed="3 6"
      />
      <g className="ws-plane">
        <path
          d="M150 112 l40 -14 l-10 26 l-8 -8 z"
          fill={PIG}
          fillOpacity={0.18}
          stroke={PIG}
          strokeWidth={STROKE}
          strokeLinejoin="round"
        />
        <path d="M180 116 l-8 8" stroke={PIG} strokeWidth={STROKE} strokeLinecap="round" />
      </g>
    </>
  );
}

// --- daily limit: an hourglass Wobo turns over -----------------------------------------------------

export const DAILY_LIMIT_WOBO: WoboMark = { x: 100, y: 120, size: 88, mood: 'proud' };

export function DailyLimitArt() {
  return (
    <g className="ws-turn">
      <Draw
        d="M222 70 h56 M222 170 h56 M226 72 c0 26 22 38 22 48 s-22 22 -22 48 M274 72 c0 26 -22 38 -22 48 s22 22 22 48"
        len={360}
        dur={1.2}
      />
      <Fade delay={1.1}>
        <path d="M232 164 h36 l-18 -22 z" fill={PIG} />
      </Fade>
      <circle className="ws-sand" cx="250" cy="122" r="1.6" fill={PIG} />
      <circle
        className="ws-sand"
        cx="250"
        cy="130"
        r="1.6"
        fill={PIG}
        style={{ animationDelay: '1.9s' }}
      />
    </g>
  );
}

// --- expired link: an envelope whose seal fades ----------------------------------------------------

export const EXPIRED_WOBO: WoboMark = { x: 90, y: 120, size: 88, mood: 'supportive' };

export function ExpiredLinkArt() {
  return (
    <>
      <Draw
        d="M170 80 h140 v90 h-140 z"
        len={460}
        dur={1.2}
        fill="var(--rose)"
        className="ws-wash"
      />
      <Draw d="M170 80 l70 56 l70 -56" len={180} dur={0.8} delay={1} />
      <circle className="ws-seal" cx="240" cy="136" r="11" fill={PIG} />
      <Draw d="M236 136 l3 3 l6 -7" len={20} dur={0.4} delay={1.6} stroke="var(--paper)" />
    </>
  );
}

// --- maintenance: Wobo tightens a bolt --------------------------------------------------------------

export const MAINTENANCE_WOBO: WoboMark = { x: 100, y: 120, size: 88, mood: 'focused' };

export function MaintenanceArt() {
  return (
    <g transform="translate(212 84)">
      <Draw
        d="M38 38 m-16 0 a16 16 0 1 0 32 0 a16 16 0 1 0 -32 0 m8 0 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0"
        len={160}
        dur={1}
        stroke={INK}
      />
      <g className="ws-spanner">
        <Draw
          d="M38 38 l52 -52 m-6 -6 a10 10 0 1 1 12 12 l-6 -6"
          len={120}
          dur={0.8}
          delay={0.8}
          stroke={PIG}
        />
      </g>
    </g>
  );
}
