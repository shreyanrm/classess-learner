'use client';

/**
 * The adventure world — a subject's journey drawn as a real place (owner directive).
 *
 * The hierarchy on screen: a CHAPTER is an atmosphere — a biome region of terrain with its own
 * palette and props; a TOPIC is a checkpoint — a chunky medallion seated on the road; the CONTENT
 * of a topic is the steps — the cobbles of the road between checkpoints, lit as far as the learner
 * has walked. The road is physical (casing between two edges), winds in tangent-continuous curves
 * between the terrain, and tucks behind foreground features for depth. Completed checkpoints fill
 * with the subject hue and a star; the current one glows and carries the learner's cast avatar;
 * those ahead wait as quiet stone.
 *
 * Entering, clouds part to reveal the world with a soft entrance sound, and a quiet nature + play
 * bed plays only while this view is mounted (respecting the app mute). Pure seeded SVG, both themes,
 * reduced-motion aware. The data contract (chapters → topics, progress, routing) is unchanged.
 */

import { motion, useReducedMotion } from 'framer-motion';
import { type ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Chapter, Topic } from '../data/model';
import { useRouter } from '../shell/router';
import { useProgress } from '../store/progress';
import { blobPath, hash, mixHex, rng } from '../ui/art';
import { type BandGeom, type BiomePalette, biomeFor, resolveBiome } from '../ui/biomes';
import { CAST, type CastId } from '../ui/cast';
import type { SubjectTone } from '../ui/hues';
import { ambience, sfx } from '../ui/sound';

type Intent = 'learn' | 'practice';

const TOP = 96; // first checkpoint's y
const STEP = 132; // vertical stride between checkpoints
const CHECK = 58; // medallion diameter
const CUR = 72; // current medallion, larger
const CAST_IDS = Object.keys(CAST) as CastId[];

interface Pt {
  x: number;
  y: number;
}

interface Checkpoint {
  topic: Topic;
  tone: SubjectTone;
  chapterId: string;
  index: number; // 1-based across the whole journey
  y: number;
  x: number;
  steps: number; // content units → cobbles on the road into this checkpoint
  frac: number; // 0..1 fine progress inside this topic
  state: 'done' | 'current' | 'locked';
}

interface Region {
  chapterId: string;
  pal: BiomePalette;
  biomeId: string;
  seed: number;
  from: number; // first checkpoint index in region
  to: number; // last checkpoint index in region
  yTop: number;
  yBot: number;
}

// --- small hooks ---------------------------------------------------------------------------------

function useMeasuredWidth(ref: React.RefObject<HTMLElement | null>): number {
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

function useDark(): boolean {
  const [dark, setDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark',
  );
  useEffect(() => {
    const el = document.documentElement;
    const update = () => setDark(el.dataset.theme === 'dark');
    update();
    const mo = new MutationObserver(update);
    mo.observe(el, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);
  return dark;
}

// --- geometry ------------------------------------------------------------------------------------

/** A cubic bezier point and unit tangent angle (deg) at t. */
function bezier(p0: Pt, c1: Pt, c2: Pt, p1: Pt, t: number): { x: number; y: number; a: number } {
  const u = 1 - t;
  const x = u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p1.x;
  const y = u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p1.y;
  const dx = 3 * u * u * (c1.x - p0.x) + 6 * u * t * (c2.x - c1.x) + 3 * t * t * (p1.x - c2.x);
  const dy = 3 * u * u * (c1.y - p0.y) + 6 * u * t * (c2.y - c1.y) + 3 * t * t * (p1.y - c2.y);
  return { x, y, a: (Math.atan2(dy, dx) * 180) / Math.PI };
}

// --- the world (pure SVG, computed once width is known) ------------------------------------------

function World({
  cps,
  regions,
  W,
  H,
  start,
  segments,
  cxAt,
  roadFill,
  roadEdge,
  reduced,
}: {
  cps: Checkpoint[];
  regions: Region[];
  W: number;
  H: number;
  start: Pt;
  segments: { p0: Pt; c1: Pt; c2: Pt; p1: Pt; cp: Checkpoint }[];
  cxAt: (y: number) => number;
  roadFill: string;
  roadEdge: string;
  reduced: boolean;
}) {
  // atmosphere: one gradient down the canvas, a wash per region → biomes blend at the borders
  const atmoStops: { off: number; color: string }[] = [
    { off: 0, color: regions[0]?.pal.washTop ?? '#fff' },
  ];
  for (const r of regions) {
    atmoStops.push({ off: Math.min(1, r.yTop / H), color: r.pal.washTop });
    atmoStops.push({ off: Math.min(1, r.yBot / H), color: r.pal.washBot });
  }
  atmoStops.push({ off: 1, color: regions[regions.length - 1]?.pal.washBot ?? '#fff' });
  atmoStops.sort((a, b) => a.off - b.off);

  const roadD = `M ${start.x.toFixed(1)} ${start.y.toFixed(1)}${segments
    .map(
      (s) =>
        ` C ${s.c1.x.toFixed(1)} ${s.c1.y.toFixed(1)}, ${s.c2.x.toFixed(1)} ${s.c2.y.toFixed(1)}, ${s.p1.x.toFixed(1)} ${s.p1.y.toFixed(1)}`,
    )
    .join('')}`;

  const islandInset = Math.max(14, W * 0.045);

  const terrain: ReactNode[] = [];
  const backProps: ReactNode[] = [];
  const frontProps: ReactNode[] = [];
  for (const r of regions) {
    const cx = W / 2;
    const cy = (r.yTop + r.yBot) / 2;
    const rx = (W - islandInset * 2) / 2;
    const ry = (r.yBot - r.yTop) / 2;
    const shape = blobPath(cx, cy, rx, ry, r.seed, 12, 0.12);
    const cliff = blobPath(cx, cy + 26, rx, ry, r.seed, 12, 0.12);
    const far = blobPath(cx, r.yTop + 16, rx * 0.82, 26, r.seed + 11, 9, 0.14);
    const sun = blobPath(cx - rx * 0.24, cy - ry * 0.34, rx * 0.5, ry * 0.42, r.seed + 5, 8, 0.22);
    terrain.push(
      <g key={`terr-${r.chapterId}`}>
        <path d={far} fill={r.pal.far} opacity={0.7} />
        <path d={cliff} fill={r.pal.side} />
        <path d={shape} fill={r.pal.top} />
        {/* a soft sunlit patch on the top face + a defining rim, so pale lands still read as land */}
        <path d={sun} fill={mixHex(r.pal.top, '#ffffff', 0.2)} opacity={0.55} />
        <path
          d={shape}
          fill="none"
          stroke={mixHex(r.pal.top, r.pal.side, 0.45)}
          strokeWidth={1.6}
          opacity={0.7}
        />
      </g>,
    );
    const g: BandGeom = { W, yTop: r.yTop, yBot: r.yBot, cxAt, rand: rng(r.seed + 3) };
    const biome = biomeFor(r.chapterId);
    const { back, front } = biome.scene(g, r.pal);
    backProps.push(<g key={`back-${r.chapterId}`}>{back}</g>);
    frontProps.push(<g key={`front-${r.chapterId}`}>{front}</g>);
  }

  // cobbles — the content steps of each topic, laid as ties across the road, lit as far as walked
  const cobbles: ReactNode[] = [];
  for (const s of segments) {
    const { steps, state, frac, tone } = s.cp;
    const lit = state === 'done' ? steps : state === 'current' ? Math.round(frac * steps) : 0;
    for (let j = 0; j < steps; j++) {
      const t = (j + 0.5) / steps;
      const { x, y, a } = bezier(s.p0, s.c1, s.c2, s.p1, t);
      const on = j < lit;
      cobbles.push(
        <rect
          key={`cob-${s.cp.topic.id}-${j}`}
          x={-8}
          y={-2.6}
          width={16}
          height={5.2}
          rx={2.4}
          fill={on ? tone.hue : mixHex(s.cp.tone.hue, '#8d8d95', 0.7)}
          opacity={on ? 1 : 0.5}
          transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(a + 90).toFixed(1)})`}
        />,
      );
    }
  }

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      role="presentation"
      aria-hidden
      style={{ position: 'absolute', inset: 0, display: 'block' }}
    >
      <defs>
        <linearGradient id="clss-atmo" x1="0" y1="0" x2="0" y2={H} gradientUnits="userSpaceOnUse">
          {atmoStops.map((s) => (
            <stop key={`atmo-${s.off.toFixed(4)}-${s.color}`} offset={s.off} stopColor={s.color} />
          ))}
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={W} height={H} fill="url(#clss-atmo)" />
      {terrain}
      {backProps}
      {/* the road — one warm path across every land: a casing edge, then the fill it carries */}
      <path
        d={roadD}
        fill="none"
        stroke={roadEdge}
        strokeWidth={27}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={roadD}
        fill="none"
        stroke={roadFill}
        strokeWidth={19}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {cobbles}
      {frontProps}
      {/* each medallion sits on the road with a soft ground-shadow */}
      {cps.map((c) => (
        <ellipse
          key={`sh-${c.topic.id}`}
          cx={c.x}
          cy={c.y + (c.state === 'current' ? CUR : CHECK) * 0.42}
          rx={(c.state === 'current' ? CUR : CHECK) * 0.5}
          ry={(c.state === 'current' ? CUR : CHECK) * 0.17}
          fill="rgba(18,20,26,0.16)"
        />
      ))}
      {/* the current place breathes — a ring that swells and fades (scale, not the r attribute) */}
      {!reduced &&
        cps
          .filter((c) => c.state === 'current')
          .map((c) => (
            <motion.circle
              key={`glow-${c.topic.id}`}
              cx={c.x}
              cy={c.y}
              r={CUR / 2 + 5}
              fill="none"
              stroke={c.tone.hue}
              strokeWidth={2}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              animate={{ scale: [1, 1.35], opacity: [0.5, 0] }}
              transition={{ duration: 2.6, repeat: Number.POSITIVE_INFINITY, ease: 'easeOut' }}
            />
          ))}
    </svg>
  );
}

// --- a checkpoint — the topic medallion, seated, tappable, keyboard-reachable --------------------

function Star({ s, color }: { s: number; color: string }) {
  const pts = Array.from({ length: 5 }, (_, i) => {
    const outer = i * ((Math.PI * 2) / 5) - Math.PI / 2;
    const inner = outer + Math.PI / 5;
    return `${(s / 2 + (s / 2) * Math.cos(outer)).toFixed(2)},${(s / 2 + (s / 2) * Math.sin(outer)).toFixed(2)} ${(s / 2 + s * 0.22 * Math.cos(inner)).toFixed(2)},${(s / 2 + s * 0.22 * Math.sin(inner)).toFixed(2)}`;
  }).join(' ');
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} role="presentation" aria-hidden>
      <polygon points={pts} fill={color} />
    </svg>
  );
}

function CheckpointNode({
  c,
  intent,
  avatarId,
  W,
  reduced,
}: {
  c: Checkpoint;
  intent: Intent;
  avatarId: CastId;
  W: number;
  reduced: boolean;
}) {
  const router = useRouter();
  const size = c.state === 'current' ? CUR : CHECK;
  const leftCol = c.x < W / 2;
  const Avatar = CAST[avatarId].Component;

  const open = () =>
    router.navigate(
      intent === 'practice'
        ? { name: 'sandbox', topicId: c.topic.id }
        : { name: 'course', topicId: c.topic.id },
    );

  const label =
    c.state === 'done'
      ? 'completed'
      : c.state === 'current'
        ? 'in progress, you are here'
        : 'not started';

  const numColor = c.state === 'locked' ? 'var(--clss-ink-300)' : '#FFFFFF';
  const bg =
    c.state === 'locked'
      ? 'var(--clss-tonal)'
      : c.state === 'current'
        ? `linear-gradient(160deg, ${mixHex(c.tone.hue, '#ffffff', 0.22)}, ${c.tone.hue})`
        : c.tone.hue;

  return (
    <div style={{ position: 'absolute', top: c.y, left: c.x, transform: 'translate(-50%, -50%)' }}>
      {/* the perched cast avatar — the learner, standing where they are */}
      {c.state === 'current' && (
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.3 }}
          style={{
            position: 'absolute',
            bottom: size * 0.72,
            left: '50%',
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            zIndex: 3,
          }}
        >
          <Avatar size={46} mood="delighted" />
        </motion.div>
      )}

      {/* the label — quiet, pointing outward toward the page centre */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          transform: 'translateY(-50%)',
          ...(leftCol ? { left: size - 2 } : { right: size - 2 }),
          width: 'clamp(96px, 26vw, 168px)',
          textAlign: leftCol ? 'left' : 'right',
          paddingLeft: leftCol ? 12 : 0,
          paddingRight: leftCol ? 0 : 12,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontSize: '0.95rem',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            lineHeight: 1.18,
            color: c.state === 'locked' ? 'var(--clss-ink-500)' : 'var(--clss-ink-900)',
          }}
        >
          {c.topic.name}
        </div>
        <div style={{ marginTop: 2, fontSize: '0.72rem', color: 'var(--clss-ink-500)' }}>
          {c.state === 'done'
            ? 'mastered'
            : c.state === 'current'
              ? c.frac > 0
                ? `${Math.round(c.frac * 100)}% in`
                : 'begin here'
              : `${c.steps} steps`}
        </div>
      </div>

      <motion.button
        type="button"
        onClick={open}
        whileHover={{ scale: 1.07, y: -2 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 380, damping: 22 }}
        aria-label={`${c.topic.name}, ${label}`}
        style={{
          position: 'relative',
          width: size,
          height: size,
          padding: 0,
          border:
            c.state === 'locked'
              ? '1px solid var(--clss-hairline-on-paper-strong)'
              : '2px solid var(--clss-card)',
          borderRadius: '50%',
          background: bg,
          color: numColor,
          cursor: 'pointer',
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'inherit',
          fontVariantNumeric: 'tabular-nums',
          fontWeight: 700,
          fontSize: c.state === 'current' ? '1.5rem' : '1.28rem',
          zIndex: 2,
          boxShadow:
            c.state === 'current' ? `0 0 0 4px ${mixHex(c.tone.hue, '#ffffff', 0.55)}55` : 'none',
        }}
      >
        {c.index}
        {c.state === 'done' && (
          <span
            aria-hidden
            style={{
              position: 'absolute',
              right: -3,
              bottom: -3,
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: 'var(--clss-card)',
              border: `1.5px solid ${c.tone.hue}`,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Star s={12} color={c.tone.hue} />
          </span>
        )}
      </motion.button>
    </div>
  );
}

// --- the entrance clouds -------------------------------------------------------------------------

function Cloud({ fog }: { fog: string }) {
  return (
    <svg
      width={260}
      height={140}
      viewBox="0 0 260 140"
      role="presentation"
      aria-hidden
      style={{ display: 'block' }}
    >
      <path d={blobPath(90, 78, 66, 40, 3, 9, 0.2)} fill={fog} />
      <path d={blobPath(160, 66, 78, 46, 7, 9, 0.2)} fill={fog} />
      <path d={blobPath(200, 86, 54, 34, 11, 9, 0.2)} fill={fog} />
    </svg>
  );
}

function CloudVeil({ dark, reduced }: { dark: boolean; reduced: boolean }) {
  const fog = dark ? '#1B1D24' : '#FFFFFF';
  // a few banks across the world; each drifts to its own side and fades to unveil the terrain
  const banks = [
    { top: '4%', left: '-8%', drift: -150 },
    { top: '2%', left: '52%', drift: 150 },
    { top: '32%', left: '20%', drift: -120 },
    { top: '58%', left: '46%', drift: 140 },
    { top: '78%', left: '-4%', drift: -130 },
  ];
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 5,
        overflow: 'hidden',
      }}
    >
      {banks.map((b, i) => (
        <motion.div
          key={`cloud-${b.top}-${b.left}`}
          initial={{ opacity: 1, x: 0 }}
          animate={reduced ? { opacity: 0 } : { opacity: 0, x: b.drift }}
          transition={{
            duration: reduced ? 0.5 : 1.3,
            delay: i * 0.05,
            ease: [0.22, 0.61, 0.36, 1],
          }}
          style={{ position: 'absolute', top: b.top, left: b.left, filter: 'blur(3px)' }}
        >
          <Cloud fog={fog} />
        </motion.div>
      ))}
    </div>
  );
}

// --- the screen ----------------------------------------------------------------------------------

export function AdventureRoadmap({
  chapters,
  intent,
}: {
  chapters: { chapter: Chapter; tone: SubjectTone }[];
  intent: Intent;
}) {
  const { completed, topicProgress } = useProgress();
  const reduced = useReducedMotion() ?? false;
  const dark = useDark();
  const hostRef = useRef<HTMLDivElement>(null);
  const W = useMeasuredWidth(hostRef);

  // scoped soundscape: the reveal SFX + a nature/play bed, only while this view lives (mute-aware)
  useEffect(() => {
    sfx.reveal();
    ambience.start();
    return () => ambience.stop();
  }, []);

  // flatten chapters → the ordered checkpoints (topics), tagged with progress and biome region
  const flat = useMemo(() => {
    const list: { topic: Topic; tone: SubjectTone; chapterId: string }[] = [];
    for (const { chapter, tone } of chapters)
      for (const topic of chapter.topics) list.push({ topic, tone, chapterId: chapter.id });
    return list;
  }, [chapters]);

  const currentIdx = useMemo(() => {
    const idx = flat.findIndex((f) => !completed.has(f.topic.id));
    return idx === -1 ? flat.length - 1 : idx;
  }, [flat, completed]);

  const H = TOP + Math.max(0, flat.length - 1) * STEP + TOP;

  // positions + per-topic state (needs width; when W===0 we still compute logical fields)
  const cps: Checkpoint[] = useMemo(() => {
    const width = W || 360;
    const inset = Math.max(22, width * 0.06);
    const amp = Math.min(width / 2 - inset - CHECK / 2, width * 0.26, 230);
    const mid = width / 2;
    const phase = (hash(chapters[0]?.chapter.id ?? 'x') % 628) / 100;
    return flat.map((f, i) => {
      const done = completed.has(f.topic.id);
      const state: Checkpoint['state'] = done ? 'done' : i === currentIdx ? 'current' : 'locked';
      const jit = ((hash(`x:${f.topic.id}`) % 1000) / 1000 - 0.5) * width * 0.05;
      let x = mid + Math.sin(i * 0.82 + phase) * amp + jit;
      x = Math.max(inset + CHECK / 2, Math.min(width - inset - CHECK / 2, x));
      return {
        topic: f.topic,
        tone: f.tone,
        chapterId: f.chapterId,
        index: i + 1,
        y: TOP + i * STEP,
        x,
        steps: 6 + (hash(`steps:${f.topic.id}`) % 5), // 6..10 content steps (real count when generated)
        frac: done ? 1 : (topicProgress[f.topic.id] ?? 0),
        state,
      };
    });
  }, [flat, W, completed, topicProgress, currentIdx, chapters]);

  // group consecutive checkpoints into biome regions (one per chapter)
  const regions: Region[] = useMemo(() => {
    const out: Region[] = [];
    for (let i = 0; i < cps.length; i++) {
      const cp = cps[i] as Checkpoint;
      const last = out[out.length - 1];
      if (last && last.chapterId === cp.chapterId) last.to = i;
      else
        out.push({
          chapterId: cp.chapterId,
          pal: resolveBiome(biomeFor(cp.chapterId), dark),
          biomeId: biomeFor(cp.chapterId).id,
          seed: hash(`region:${cp.chapterId}`),
          from: i,
          to: i,
          yTop: 0,
          yBot: 0,
        });
    }
    for (const r of out) {
      const first = cps[r.from] as Checkpoint;
      const lastCp = cps[r.to] as Checkpoint;
      r.yTop = Math.max(0, first.y - 58);
      r.yBot = Math.min(H, lastCp.y + 58);
    }
    return out;
  }, [cps, dark, H]);

  // the road through every checkpoint (a lead-in point above the first), Catmull-Rom → cubic bezier
  const { start, segments, cxAt } = useMemo(() => {
    const startPt: Pt = { x: cps[0]?.x ?? (W || 360) / 2, y: TOP - 62 };
    const pts: Pt[] = [startPt, ...cps.map((c) => ({ x: c.x, y: c.y }))];
    const segs = cps.map((cp, k) => {
      const P1 = pts[k] as Pt;
      const P2 = pts[k + 1] as Pt;
      const P0 = (pts[k - 1] ?? P1) as Pt;
      const P3 = (pts[k + 2] ?? P2) as Pt;
      return {
        p0: P1,
        c1: { x: P1.x + (P2.x - P0.x) / 6, y: P1.y + (P2.y - P0.y) / 6 },
        c2: { x: P2.x - (P3.x - P1.x) / 6, y: P2.y - (P3.y - P1.y) / 6 },
        p1: P2,
        cp,
      };
    });
    const ladder = pts;
    const head = ladder[0] as Pt;
    const tail = ladder[ladder.length - 1] as Pt;
    const at = (y: number): number => {
      if (y <= head.y) return head.x;
      for (let k = 0; k < ladder.length - 1; k++) {
        const a = ladder[k] as Pt;
        const b = ladder[k + 1] as Pt;
        if (y >= a.y && y <= b.y) {
          const t = (y - a.y) / Math.max(1, b.y - a.y);
          return a.x + (b.x - a.x) * t;
        }
      }
      return tail.x;
    };
    return { start: startPt, segments: segs, cxAt: at };
  }, [cps, W]);

  const avatarId = CAST_IDS[
    hash(`cast:${chapters[0]?.chapter.id ?? 'x'}`) % CAST_IDS.length
  ] as CastId;
  // one warm dirt path across every biome — theme-aware so it reads on graphite too
  const roadFill = dark ? mixHex('#E7DAC0', '#15161B', 0.5) : '#E8DCC2';
  const roadEdge = dark ? mixHex('#B89A70', '#0D0E12', 0.42) : '#BC9E72';

  return (
    <div ref={hostRef} style={{ position: 'relative', width: '100%', height: H }}>
      {W > 0 && (
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0.5, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={reduced ? { duration: 0.5 } : { type: 'spring', stiffness: 120, damping: 20 }}
          style={{ position: 'absolute', inset: 0, transformOrigin: '50% 30%' }}
        >
          <World
            cps={cps}
            regions={regions}
            W={W}
            H={H}
            start={start}
            segments={segments}
            cxAt={cxAt}
            roadFill={roadFill}
            roadEdge={roadEdge}
            reduced={reduced}
          />
          {cps.map((c) => (
            <CheckpointNode
              key={c.topic.id}
              c={c}
              intent={intent}
              avatarId={avatarId}
              W={W}
              reduced={reduced}
            />
          ))}
        </motion.div>
      )}
      {W > 0 && <CloudVeil dark={dark} reduced={reduced} />}
    </div>
  );
}
