'use client';

/**
 * The thread — the day drawn as one continuous machined bezier down the canvas.
 * Stops sit ON the thread and every one of them routes somewhere real. Geometry is
 * computed live from the container width, so the composition reflows per viewport.
 * Craft lifted from Concept B: draw-in, pulse ring, dashed spur to a mystery star,
 * energy flow when the boss unlocks, drifting plus-field ambience.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import type { Route } from '../../shell/router';
import { ChevronIcon } from '../../ui/icons';
import { fluidType } from '../../ui/kit';
import { sfx } from '../../ui/sound';
import type { StopKind, ThreadStop } from './stops';

const INK = 'var(--clss-ink)';
const INK_60 = 'color-mix(in srgb, var(--clss-ink) 58%, transparent)';
const INK_40 = 'color-mix(in srgb, var(--clss-ink) 36%, transparent)';
const HAIR = 'color-mix(in srgb, var(--clss-ink) 10%, transparent)';
const HAIR_SOFT = 'color-mix(in srgb, var(--clss-ink) 5.5%, transparent)';
const TONAL = 'color-mix(in srgb, var(--clss-ink) 2.6%, transparent)';
const ULTRA = 'var(--clss-ultramarine)';
const MAGENTA = '#CC1E7A';
const ACID = '#66B300';
const TEAL = '#0FA3B1';
const MOLTEN = '#FF5A1F';
const SPRING = { type: 'spring', stiffness: 260, damping: 26 } as const;

interface Pt {
  x: number;
  y: number;
}

/** One machined segment — vertical tangents at both stops, like a drawn wire. */
function seg(a: Pt, b: Pt): string {
  const dy = (b.y - a.y) / 2;
  return `C ${a.x} ${a.y + dy}, ${b.x} ${b.y - dy}, ${b.x} ${b.y}`;
}

/* ---------------------------------------------------------------- medallions */

function SunMedallion() {
  return (
    <svg
      width="42"
      height="42"
      viewBox="0 0 46 46"
      role="presentation"
      aria-hidden
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="th-sun" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#FF9040" />
          <stop offset="100%" stopColor="#FF5A1F" />
        </linearGradient>
      </defs>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <rect
          key={a}
          x="21.5"
          y="2"
          width="3"
          height="7"
          rx="1.5"
          fill="#FF5A1F"
          opacity="0.85"
          transform={`rotate(${a} 23 23)`}
        />
      ))}
      <circle cx="23" cy="23" r="10.5" fill="url(#th-sun)" />
    </svg>
  );
}

function TickMedallion() {
  return (
    <svg
      width="42"
      height="42"
      viewBox="0 0 46 46"
      role="presentation"
      aria-hidden
      style={{ display: 'block', flexShrink: 0 }}
    >
      <circle cx="23" cy="23" r="15" fill={ACID} />
      <path
        d="M16 23 L21 28 L30.5 17.5"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The continue medallion — a progress ring, endowed: it never renders empty. */
function RingMedallion({ fraction }: { fraction: number }) {
  const C = 2 * Math.PI * 15;
  const f = Math.max(0.08, Math.min(1, fraction));
  return (
    <svg
      width="42"
      height="42"
      viewBox="0 0 46 46"
      role="presentation"
      aria-hidden
      style={{ display: 'block', flexShrink: 0 }}
    >
      <circle cx="23" cy="23" r="15" fill="none" stroke={HAIR} strokeWidth="3" />
      <motion.circle
        cx="23"
        cy="23"
        r="15"
        fill="none"
        stroke={ULTRA}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${f * C} ${C}`}
        transform="rotate(-90 23 23)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      />
      <path d="M20 17.5 L29 23 L20 28.5 Z" fill={ULTRA} />
    </svg>
  );
}

function CompassMedallion() {
  return (
    <svg
      width="42"
      height="42"
      viewBox="0 0 46 46"
      role="presentation"
      aria-hidden
      style={{ display: 'block', flexShrink: 0 }}
    >
      <circle
        cx="23"
        cy="23"
        r="15"
        fill="none"
        stroke={INK}
        strokeOpacity="0.28"
        strokeWidth="2"
      />
      <path
        d="M17 29 L29 17 M29 17 h-7 M29 17 v7"
        fill="none"
        stroke={INK}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CycleMedallion() {
  return (
    <svg
      width="42"
      height="42"
      viewBox="0 0 46 46"
      role="presentation"
      aria-hidden
      style={{ display: 'block', flexShrink: 0 }}
    >
      <path
        d="M12 20 a 11 11 0 0 1 20 -2"
        fill="none"
        stroke={INK}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M32 12 v6.5 h-6.5"
        fill="none"
        stroke={INK}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M34 26 a 11 11 0 0 1 -20 2"
        fill="none"
        stroke={INK}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M14 34 v-6.5 h6.5"
        fill="none"
        stroke={INK}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShieldMedallion({ lit }: { lit: boolean }) {
  return (
    <svg
      width="42"
      height="42"
      viewBox="0 0 46 46"
      role="presentation"
      aria-hidden
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="th-shield" x1="0" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#E84D9E" />
          <stop offset="100%" stopColor={MAGENTA} />
        </linearGradient>
      </defs>
      <path
        d="M23 5 L38 11 V 23 C 38 32.5 31.5 38.5 23 42 C 14.5 38.5 8 32.5 8 23 V 11 Z"
        fill={lit ? 'url(#th-shield)' : 'color-mix(in srgb, var(--clss-ink) 8%, transparent)'}
      />
      <path
        d="M15.5 22.5 L21 28 L30.5 17.5"
        fill="none"
        stroke={lit ? '#FFFFFF' : INK_40}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarMedallion() {
  return (
    <svg
      width="52"
      height="52"
      viewBox="-26 -26 52 52"
      role="presentation"
      aria-hidden
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id="th-star" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#3EC7D4" />
          <stop offset="100%" stopColor={TEAL} />
        </linearGradient>
      </defs>
      <circle
        cx="0"
        cy="0"
        r="21"
        fill="none"
        stroke={TEAL}
        strokeOpacity="0.5"
        strokeWidth="1.4"
        strokeDasharray="3 6"
        strokeLinecap="round"
      />
      <path
        d="M 0 -13 C 2.2 -4.5, 4.5 -2.2, 13 0 C 4.5 2.2, 2.2 4.5, 0 13 C -2.2 4.5, -4.5 2.2, -13 0 C -4.5 -2.2, -2.2 -4.5, 0 -13 Z"
        fill="url(#th-star)"
      />
    </svg>
  );
}

/** The daily bonus quest — a chest that opens the moment the day is sealed. */
function ChestMedallion({ open }: { open: boolean }) {
  const body = open ? 'url(#th-chest)' : 'color-mix(in srgb, var(--clss-ink) 8%, transparent)';
  return (
    <svg
      width="42"
      height="42"
      viewBox="0 0 46 46"
      role="presentation"
      aria-hidden
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="th-chest" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFB86B" />
          <stop offset="100%" stopColor={MOLTEN} />
        </linearGradient>
      </defs>
      {open && <circle cx="23" cy="24" r="17" fill={MOLTEN} opacity="0.12" />}
      <path
        d="M10 22 C10 13 15.5 10 23 10 C30.5 10 36 13 36 22 Z"
        fill={body}
        stroke={open ? 'none' : INK_40}
        strokeWidth={open ? 0 : 1.4}
      />
      <rect
        x="9.5"
        y="21"
        width="27"
        height="16"
        rx="2.5"
        fill={body}
        stroke={open ? 'none' : INK_40}
        strokeWidth={open ? 0 : 1.4}
      />
      <rect
        x="9.5"
        y="24.5"
        width="27"
        height="3"
        fill={open ? '#FFFFFF' : INK_40}
        opacity="0.55"
      />
      <rect x="20.5" y="25" width="5" height="7" rx="1.4" fill={open ? '#FFFFFF' : INK_40} />
      {open && (
        <path
          d="M23 4 v4 M17 6 l2 3 M29 6 l-2 3"
          stroke={MOLTEN}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

function medallionFor(stop: ThreadStop): ReactNode {
  switch (stop.kind) {
    case 'landing':
      return <SunMedallion />;
    case 'done':
      return <TickMedallion />;
    case 'continue':
      return <RingMedallion fraction={stop.progress ?? 0} />;
    case 'next':
      return <CompassMedallion />;
    case 'review':
      return <CycleMedallion />;
    case 'boss':
      return <ShieldMedallion lit={!stop.locked} />;
    case 'bonus':
      return <ChestMedallion open={Boolean(stop.done)} />;
  }
}

const META_COLOR: Record<StopKind, string> = {
  landing: ACID,
  done: ACID,
  continue: ULTRA,
  next: INK_40,
  review: INK_60,
  boss: INK_40,
  bonus: MOLTEN,
};

/* ------------------------------------------------------------------ stop card */

/** The XP a quest pays — quiet ink while it is still a promise, subject-hue pigment once earned. */
function BountyChip({ amount, hue, earned }: { amount: number; hue?: string; earned?: boolean }) {
  const pigment = hue ?? ULTRA;
  return (
    <span
      style={{
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        height: 22,
        padding: '0 8px',
        borderRadius: 3,
        fontSize: 11.5,
        fontWeight: 700,
        letterSpacing: '0.01em',
        fontVariantNumeric: 'tabular-nums',
        color: earned ? pigment : INK_60,
        background: earned ? `color-mix(in srgb, ${pigment} 14%, transparent)` : 'transparent',
        border: earned ? '1px solid transparent' : `1px solid ${HAIR}`,
      }}
    >
      +{amount}
    </span>
  );
}

function StopCard({
  stop,
  current,
  x,
  y,
  width,
  delay,
  onGo,
  onArrive,
}: {
  stop: ThreadStop;
  current?: boolean;
  x: number;
  y: number;
  width: number;
  delay: number;
  onGo: (route: Route) => void;
  onArrive?: (stop: ThreadStop) => void;
}) {
  // The current stop wears the one hit of pigment on the thread — a hairline ultramarine edge that
  // says "you are here" without shouting. Every other card stays on the neutral hairline.
  const restBorder = current
    ? 'color-mix(in srgb, var(--clss-ultramarine) 42%, transparent)'
    : HAIR;
  return (
    <motion.button
      type="button"
      onClick={() => {
        onArrive?.(stop);
        onGo(stop.route);
      }}
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...SPRING, delay }}
      whileHover={{
        y: -3,
        backgroundColor: TONAL,
        borderColor: current
          ? 'color-mix(in srgb, var(--clss-ultramarine) 64%, transparent)'
          : INK_40,
      }}
      whileTap={{ scale: 0.98 }}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        minHeight: 44,
        display: 'flex',
        alignItems: 'center',
        gap: 13,
        border: `1px solid ${restBorder}`,
        borderRadius: 3,
        background: 'var(--clss-card)',
        padding: '13px 14px 13px 16px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        textAlign: 'left',
      }}
    >
      {medallionFor(stop)}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            fontSize: fluidType.body,
            fontWeight: 600,
            color: INK,
            lineHeight: 1.25,
          }}
        >
          {stop.title}
        </span>
        <span
          style={{
            display: 'block',
            fontSize: fluidType.small,
            color: META_COLOR[stop.kind],
            marginTop: 3,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {stop.meta}
        </span>
        {stop.progress !== undefined && (
          <span
            style={{
              display: 'block',
              marginTop: 8,
              height: 3,
              borderRadius: 2,
              background: HAIR_SOFT,
            }}
          >
            <motion.span
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(8, stop.progress * 100)}%` }}
              transition={{ ...SPRING, delay: delay + 0.35 }}
              style={{ display: 'block', height: 3, borderRadius: 2, background: ULTRA }}
            />
          </span>
        )}
      </span>
      {stop.bounty !== undefined && (
        <BountyChip amount={stop.bounty} hue={stop.hue} earned={stop.done} />
      )}
      <motion.span
        aria-hidden
        animate={current ? { x: [0, 3, 0] } : undefined}
        transition={
          current
            ? { duration: 1.8, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }
            : undefined
        }
        style={{ display: 'inline-flex', color: current ? ULTRA : INK_40, flexShrink: 0 }}
      >
        <ChevronIcon size={15} />
      </motion.span>
    </motion.button>
  );
}

/* ----------------------------------------------------------------- the nodes */

function Node({ stop, current, delay }: { stop: ThreadStop; current: boolean; delay: number }) {
  if (current)
    return (
      <>
        <motion.circle
          cx="0"
          cy="0"
          r="10"
          fill={ULTRA}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...SPRING, delay }}
        />
        <motion.circle
          cx="0"
          cy="0"
          r="10"
          fill="none"
          stroke={ULTRA}
          strokeWidth="1.6"
          animate={{ scale: [1, 2.2], opacity: [0.55, 0] }}
          transition={{
            duration: 2.1,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'easeOut',
            delay: delay + 0.4,
          }}
        />
      </>
    );
  if (stop.kind === 'landing' || stop.kind === 'done')
    return (
      <motion.g
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ ...SPRING, delay }}
      >
        <circle cx="0" cy="0" r="13" fill={ACID} />
        <path
          d="M -6 0 L -1.5 4.5 L 6.5 -4.5"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </motion.g>
    );
  if (stop.kind === 'boss')
    return (
      <motion.g
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ ...SPRING, delay }}
      >
        {stop.locked ? (
          <circle
            cx="0"
            cy="0"
            r="12"
            fill="#FFFFFF"
            stroke={INK_40}
            strokeWidth="1.8"
            strokeDasharray="3 4"
          />
        ) : (
          <motion.g
            initial={{ scale: 0.4 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 14, delay: delay + 0.2 }}
          >
            <circle cx="0" cy="0" r="13" fill={MAGENTA} />
            <path
              d="M -6 0 L -1.5 4.5 L 6.5 -4.5"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.g>
        )}
      </motion.g>
    );
  if (stop.kind === 'bonus')
    return (
      <motion.g
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ ...SPRING, delay }}
      >
        <rect
          x="-8"
          y="-6"
          width="16"
          height="12"
          rx="2.5"
          fill={stop.done ? MOLTEN : '#FFFFFF'}
          stroke={stop.done ? 'none' : INK_40}
          strokeWidth="1.8"
          strokeDasharray={stop.done ? undefined : '3 4'}
        />
        <line
          x1="-8"
          x2="8"
          y1="-1.5"
          y2="-1.5"
          stroke={stop.done ? '#FFFFFF' : INK_40}
          strokeWidth="1.4"
          strokeOpacity={stop.done ? 0.7 : 1}
        />
      </motion.g>
    );
  // next (not current) and review — quiet stops still ahead
  return (
    <motion.circle
      cx="0"
      cy="0"
      r="8"
      fill="#FFFFFF"
      stroke={INK}
      strokeOpacity="0.3"
      strokeWidth="1.8"
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...SPRING, delay }}
    />
  );
}

/* -------------------------------------------------------------- ambient drift */

const DRIFT = [
  { id: 'p1', fx: 0.09, fy: 0.13, glyph: '+', dur: 7 },
  { id: 'p2', fx: 0.88, fy: 0.09, glyph: '·', dur: 8.5 },
  { id: 'p3', fx: 0.06, fy: 0.4, glyph: '·', dur: 6 },
  { id: 'p4', fx: 0.93, fy: 0.47, glyph: '+', dur: 9 },
  { id: 'p5', fx: 0.11, fy: 0.66, glyph: '·', dur: 7.5 },
  { id: 'p6', fx: 0.9, fy: 0.78, glyph: '+', dur: 8 },
  { id: 'p7', fx: 0.15, fy: 0.93, glyph: '·', dur: 6.5 },
  { id: 'p8', fx: 0.78, fy: 0.03, glyph: '+', dur: 7.2 },
];

/* ------------------------------------------------------------------ the thread */

const SEEN_KEY = 'clss-thread-seen-v1';

export function Thread({
  stops,
  currentIndex,
  wobo,
  onGo,
  onArrive,
}: {
  stops: ThreadStop[];
  currentIndex: number;
  /** Wobo's body (with her own choreography) — seated beside the current stop. */
  wobo?: ReactNode;
  onGo: (route: Route) => void;
  /** Fired the instant a stop is tapped — lets the home claim the bonus quest before it routes. */
  onArrive?: (stop: ThreadStop) => void;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [w, setW] = useState(1200);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setW(width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Earned burst: a stop that is newly done since the learner last looked lights with a small
  // subject-hue pop and a tick — completion usually happens inside a course, so the reward lands
  // when they walk back onto the thread. The seen-set (real, persisted) is what makes it earned,
  // not a mount-time firework: a fresh install lights nothing until something is actually finished.
  const doneNow = useMemo(() => stops.filter((s) => s.done).map((s) => s.id), [stops]);
  const [burst, setBurst] = useState<string[]>([]);
  const [sealed, setSealed] = useState(false);
  useEffect(() => {
    let seen: string[] | null = null;
    try {
      const raw = localStorage.getItem(SEEN_KEY);
      seen = raw === null ? null : (JSON.parse(raw) as string[]);
    } catch {
      seen = null;
    }
    const persist = () => {
      try {
        localStorage.setItem(SEEN_KEY, JSON.stringify(doneNow));
      } catch {
        // storage unavailable — the burst just won't replay across reloads
      }
    };
    if (seen === null) {
      persist(); // first ever paint — adopt the current state without a firework
      return;
    }
    const fresh = doneNow.filter((id) => !(seen as string[]).includes(id));
    persist();
    if (fresh.length === 0) return;
    setBurst(fresh);
    sfx.tap(); // the tick that lands with the light (debounced, so a batch is still one tick)
    // Finishing today's topic (its boss lit) seals the day — the rarest beat gets the fanfare.
    const daySealed = fresh.some((id) => id.startsWith('boss'));
    if (daySealed) {
      setSealed(true);
      sfx.fanfare();
    }
    const t = window.setTimeout(() => {
      setBurst([]);
      setSealed(false);
    }, 3400);
    return () => window.clearTimeout(t);
  }, [doneNow]);

  // --- geometry, all from the measured width — the thread reflows per viewport
  const cx = w / 2;
  const A = Math.max(130, Math.min(250, w * 0.2)); // horizontal swing
  const GAP = Math.round(Math.max(190, Math.min(248, w * 0.18)));
  const TOP = 28;
  const FIRST = TOP + 118;
  const SWING = [-0.95, 0.98, -0.52, 0.85, -0.9, 0.62, -0.72, 0.88];
  const pts: Pt[] = stops.map((_, i) => ({
    x: Math.round(cx + A * (SWING[i % SWING.length] as number)),
    y: FIRST + i * GAP,
  }));
  const H = FIRST + (stops.length - 1) * GAP + 150;

  const chain: Pt[] = [{ x: cx, y: TOP }, ...pts, { x: cx, y: H - 6 }];
  const threadD = `M ${cx} ${TOP} ${chain
    .slice(1)
    .map((p, i) => seg(chain[i] as Pt, p))
    .join(' ')}`;

  // The mystery spur leaves from the rightmost stop that is not the current one.
  const spurCandidates = pts.map((_, i) => i).filter((i) => i !== currentIndex || pts.length === 1);
  const spurIdx = spurCandidates.reduce(
    (a, b) => ((pts[b] as Pt).x > (pts[a] as Pt).x ? b : a),
    spurCandidates[0] ?? 0,
  );
  const sp = pts[spurIdx] as Pt;
  const star = { x: Math.min(sp.x + Math.max(130, w * 0.15), w - 84), y: sp.y - 86 };
  const spurD = `M ${sp.x} ${sp.y} C ${sp.x + 60} ${sp.y - 16}, ${star.x - 56} ${star.y + 38}, ${star.x - 4} ${star.y + 10}`;

  // Energy travels current → boss once the gate is unlocked.
  const bossIdx = stops.findIndex((s) => s.kind === 'boss');
  const bossLit = bossIdx > 0 && !stops[bossIdx]?.locked;
  const energyD = bossLit
    ? `M ${(pts[currentIndex] as Pt).x} ${(pts[currentIndex] as Pt).y} ${pts
        .slice(currentIndex + 1, bossIdx + 1)
        .map((p, i) => seg(pts[currentIndex + i] as Pt, p))
        .join(' ')}`
    : undefined;

  // Cards sit opposite the thread's lean; Wobo sits on the other flank of the current stop.
  const CW = Math.round(Math.max(222, Math.min(300, w * 0.24)));
  const cardRight = (p: Pt) => p.x <= cx;
  const cardX = (p: Pt) =>
    cardRight(p) ? Math.min(p.x + 42, w - CW - 10) : Math.max(p.x - 42 - CW, 10);
  const cp = pts[Math.min(currentIndex, pts.length - 1)] as Pt;
  // Seating Wobo beside the current stop only works when there's breathing room next to its card.
  // On a phone the card eats nearly the full width, so the beside-clamp lands her block on the path's
  // own node and the caption becomes unreadable. Below ~560px she instead drops into the open
  // vertical gap under the current node (there's a full ~190px stride to the next stop), clear of
  // both the node and the card.
  const VB = 128; // her block's width
  const narrow = w < 560;
  const woboX = narrow
    ? Math.max(4, Math.min(cp.x - VB / 2, w - VB - 4))
    : cardRight(cp)
      ? Math.max(4, cp.x - 42 - VB)
      : Math.min(w - VB - 4, cp.x + 40);
  const woboY = narrow ? cp.y + 34 : cp.y - 114;

  // Node entrances ride the draw-in — each pops as the pen reaches it.
  const DRAW = Math.min(2.3, 0.9 + stops.length * 0.28);
  const nodeDelay = (i: number) => 0.35 + DRAW * ((i + 1) / (stops.length + 1));

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%', height: H }}>
      {/* ambient drift field */}
      {DRIFT.map((d) => (
        <motion.span
          key={d.id}
          aria-hidden
          animate={{ y: [0, -9, 0] }}
          transition={{ duration: d.dur, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            left: d.fx * w,
            top: d.fy * H,
            fontSize: d.glyph === '+' ? 15 : 22,
            fontWeight: 300,
            color: 'color-mix(in srgb, var(--clss-ink) 14%, transparent)',
            userSelect: 'none',
          }}
        >
          {d.glyph}
        </motion.span>
      ))}

      {/* the one thread */}
      <svg
        viewBox={`0 0 ${w} ${H}`}
        width={w}
        height={H}
        style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
        role="presentation"
        aria-hidden
      >
        <motion.path
          d={threadD}
          fill="none"
          stroke={INK}
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: DRAW, delay: 0.35, ease: [0.45, 0, 0.2, 1] }}
        />
        {/* dashed spur to the mystery */}
        <motion.path
          d={spurD}
          fill="none"
          stroke={TEAL}
          strokeOpacity="0.55"
          strokeWidth="1.6"
          strokeDasharray="2 7"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: 0.4 + DRAW * 0.6, ease: 'easeOut' }}
        />
        {/* energy flows down the thread once the boss unlocks */}
        {energyD && (
          <motion.path
            d={energyD}
            fill="none"
            stroke={ULTRA}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="12 16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, strokeDashoffset: [0, -112] }}
            transition={{
              opacity: { duration: 0.4 },
              strokeDashoffset: { duration: 1.3, repeat: Number.POSITIVE_INFINITY, ease: 'linear' },
            }}
          />
        )}
        {/* stops — each scaled group lives inside a translate so it pulses around its own node */}
        {stops.map((s, i) => (
          <g key={s.id} transform={`translate(${(pts[i] as Pt).x} ${(pts[i] as Pt).y})`}>
            <Node stop={s} current={i === currentIndex} delay={nodeDelay(i)} />
            {burst.includes(s.id) && (
              <motion.circle
                cx="0"
                cy="0"
                r="11"
                fill="none"
                stroke={s.hue ?? MOLTEN}
                strokeWidth="2.4"
                initial={{ scale: 0.4, opacity: 0.85 }}
                animate={{ scale: 3.2, opacity: 0 }}
                transition={{ duration: 1.1, ease: 'easeOut' }}
              />
            )}
          </g>
        ))}
      </svg>

      {/* trailhead marker */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ ...SPRING, delay: 0.4 }}
        style={{
          position: 'absolute',
          left: cx - 5,
          top: TOP - 5,
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: INK,
        }}
      />

      {/* the stop cards — every one a real door */}
      {stops.map((s, i) => (
        <StopCard
          key={s.id}
          stop={s}
          current={i === currentIndex}
          x={cardX(pts[i] as Pt)}
          y={(pts[i] as Pt).y - 42}
          width={CW}
          delay={nodeDelay(i) + 0.12}
          onGo={onGo}
          onArrive={onArrive}
        />
      ))}

      {/* the day, sealed — a quiet moment the instant today's topic is finished */}
      <AnimatePresence>
        {sealed && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={SPRING}
            style={{
              position: 'absolute',
              left: 0,
              top: H - 78,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                fontFamily: 'Caveat, cursive',
                fontSize: 26,
                fontWeight: 600,
                color: MOLTEN,
                lineHeight: 1,
              }}
            >
              The day, sealed
            </div>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 72 }}
              transition={{ ...SPRING, delay: 0.1 }}
              style={{ height: 2, borderRadius: 2, background: MOLTEN }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* the mystery — discovered, never assigned */}
      <motion.button
        type="button"
        aria-label="Something is hiding here — open the sandbox"
        onClick={() => onGo({ name: 'sandbox' })}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ ...SPRING, delay: 0.55 + DRAW * 0.6 }}
        whileHover={{ rotate: 90, scale: 1.12 }}
        whileTap={{ scale: 0.95 }}
        style={{
          position: 'absolute',
          left: star.x - 26,
          top: star.y - 26,
          width: 52,
          height: 52,
          padding: 0,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
        }}
      >
        <StarMedallion />
      </motion.button>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 + DRAW * 0.6, duration: 0.5 }}
        style={{
          position: 'absolute',
          left: star.x - 62,
          top: star.y + 32,
          fontFamily: 'Caveat, cursive',
          fontSize: 19,
          color: TEAL,
          width: 124,
          textAlign: 'center',
          lineHeight: 1.1,
          pointerEvents: 'none',
        }}
      >
        Something is hiding here
      </motion.div>

      {/* Wobo walks the thread — she sits beside the current stop */}
      {wobo && (
        <div style={{ position: 'absolute', left: woboX, top: woboY, width: 128, zIndex: 2 }}>
          {wobo}
        </div>
      )}
    </div>
  );
}
