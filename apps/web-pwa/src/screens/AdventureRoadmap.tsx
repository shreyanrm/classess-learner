'use client';

/**
 * THE EXPEDITION — a subject's journey as a full-screen game world (Fable's cut).
 *
 * Not a chart on a page: a place. The view takes the whole viewport through a portal — a
 * parallax sky with drifting birds, distant mountain silhouettes, and an edge-to-edge painted
 * valley the learner scrolls down. Each CHAPTER is a biome region of the valley; each TOPIC is
 * a checkpoint medallion seated on one continuous carved road; the CONTENT of a topic is the
 * cobbles between checkpoints, lit exactly as far as the learner has walked. Tapping a
 * checkpoint zooms INTO the world — a game's enter-the-level — then opens the course.
 *
 * Life: birds cross the sky, creatures graze the meadows, smoke curls from a camp beside the
 * current checkpoint. Chrome floats on frosted glass. Clouds part on entry with a soft chord;
 * a quiet nature bed plays only while the world is open (mute-aware). Pure seeded SVG, both
 * themes, reduced-motion collapses to calm. Data contract (chapters → topics, progress,
 * routing) unchanged.
 */

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Chapter, Topic } from '../data/model';
import { useRouter } from '../shell/router';
import { useProgress } from '../store/progress';
import { hash } from '../ui/art';
import { type BiomePalette, biomeFor, resolveBiome } from '../ui/biomes';
import { CAST, type CastId } from '../ui/cast';
import type { SubjectTone } from '../ui/hues';
import { FROST } from '../ui/kit';
import { ambience, sfx } from '../ui/sound';

type Intent = 'learn' | 'practice';

// --- world metrics --------------------------------------------------------------------------

const TOP_PAD = 220; // sky room above the first checkpoint
const STEP_Y = 168; // vertical stride between checkpoints
const FOOT_PAD = 260; // valley floor after the last checkpoint
const CHECK = 62;
const CUR = 78;
const CAST_IDS = Object.keys(CAST) as CastId[];

interface Pt {
  x: number;
  y: number;
}

interface Checkpoint {
  topic: Topic;
  tone: SubjectTone;
  chapterId: string;
  index: number;
  p: Pt;
  steps: number;
  frac: number;
  state: 'done' | 'current' | 'locked';
}

interface Region {
  chapterId: string;
  pal: BiomePalette;
  seed: number;
  yTop: number;
  yBot: number;
}

// --- tiny math: Catmull-Rom → cubic segments, with point sampling ---------------------------

interface Seg {
  a: Pt;
  c1: Pt;
  c2: Pt;
  b: Pt;
}

function spline(pts: Pt[]): Seg[] {
  const segs: Seg[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i];
    const p2 = pts[i + 1];
    if (!p1 || !p2) continue;
    const p0 = pts[i - 1] ?? p1;
    const p3 = pts[i + 2] ?? p2;
    segs.push({
      a: p1,
      c1: { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
      c2: { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
      b: p2,
    });
  }
  return segs;
}

function segPoint(s: Seg, t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * u * s.a.x + 3 * u * u * t * s.c1.x + 3 * u * t * t * s.c2.x + t * t * t * s.b.x,
    y: u * u * u * s.a.y + 3 * u * u * t * s.c1.y + 3 * u * t * t * s.c2.y + t * t * t * s.b.y,
  };
}

const segsToPath = (segs: Seg[]) =>
  segs[0] === undefined
    ? ''
    : `M ${segs[0].a.x.toFixed(1)} ${segs[0].a.y.toFixed(1)} ${segs
        .map(
          (s) =>
            `C ${s.c1.x.toFixed(1)} ${s.c1.y.toFixed(1)}, ${s.c2.x.toFixed(1)} ${s.c2.y.toFixed(1)}, ${s.b.x.toFixed(1)} ${s.b.y.toFixed(1)}`,
        )
        .join(' ')}`;

function mulberry(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seeded rolling ridge across the full width — the top edge of a landmass, closed to a floor. */
function ridgePath(W: number, y: number, amp: number, seed: number, footY: number): string {
  const r = mulberry(seed);
  const n = 6 + Math.floor(r() * 3);
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) pts.push({ x: (W * i) / n, y: y + (r() - 0.5) * 2 * amp });
  return `${segsToPath(spline(pts))} L ${W} ${footY} L 0 ${footY} Z`;
}

function useDark(): boolean {
  const [dark, setDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark',
  );
  useEffect(() => {
    const el = document.documentElement;
    const mo = new MutationObserver(() => setDark(el.dataset.theme === 'dark'));
    mo.observe(el, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);
  return dark;
}

function topicSteps(t: Topic): number {
  const withUnits = t as Topic & { activities?: unknown[]; cards?: unknown[] };
  const n = withUnits.activities?.length ?? withUnits.cards?.length;
  return n && n > 2 ? Math.min(12, n) : 5 + (hash(`steps:${t.id}`) % 4);
}

// --- sky life --------------------------------------------------------------------------------

function Birds({ reduced, dark }: { reduced: boolean; dark: boolean }) {
  if (reduced) return null;
  const ink = dark ? 'rgba(226,230,240,0.5)' : 'rgba(40,48,60,0.42)';
  return (
    <>
      {[0, 1, 2].map((i) => (
        <motion.svg
          key={`bird-${i}`}
          width="46"
          height="18"
          viewBox="0 0 46 18"
          aria-hidden
          role="presentation"
          initial={{ x: '-8vw' }}
          animate={{ x: '108vw', y: [0, -14, 6, -8, 0] }}
          transition={{
            x: {
              duration: 44 + i * 13,
              repeat: Number.POSITIVE_INFINITY,
              delay: i * 9,
              ease: 'linear',
            },
            y: { duration: 7 + i * 2, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' },
          }}
          style={{ position: 'absolute', top: `${9 + i * 7}%`, left: 0 }}
        >
          <path
            d="M4 10 Q 11 3 18 10 M18 10 Q 25 3 32 10"
            fill="none"
            stroke={ink}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </motion.svg>
      ))}
    </>
  );
}

// --- ground life ------------------------------------------------------------------------------

function Grazer({
  x,
  y,
  s,
  tint,
  flip,
}: {
  x: number;
  y: number;
  s: number;
  tint: string;
  flip: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`} opacity={0.82}>
      <ellipse cx={0} cy={13} rx={16} ry={4} fill="rgba(20,22,28,0.12)" />
      <path
        d="M-13 4 Q -14 -5 -4 -6 L 6 -6 Q 13 -6 14 -12 Q 15 -16 19 -16 Q 22 -16 21 -12 L 20 -7 Q 19 -2 13 0 L 13 10 L 10 10 L 10 2 L -4 2 L -4 10 L -7 10 L -7 1 Q -13 1 -13 4 Z"
        fill={tint}
      />
    </g>
  );
}

function CampSmoke({ x, y, reduced }: { x: number; y: number; reduced: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-7 0 L 0 -7 L 7 0 Z" fill="rgba(122,90,58,0.9)" />
      <circle cx={0} cy={-4} r={3.4} fill="#F2A24B" opacity={0.9} />
      {!reduced &&
        [0, 1, 2].map((i) => (
          <motion.circle
            key={`wisp-${i}`}
            cx={0}
            r={3 + i}
            fill="rgba(160,168,182,0.5)"
            initial={{ cx: 0, cy: -8, opacity: 0 }}
            animate={{ cy: -34 - i * 8, opacity: [0, 0.55, 0], cx: [0, i % 2 ? 6 : -5] }}
            transition={{
              duration: 4.4,
              repeat: Number.POSITIVE_INFINITY,
              delay: i * 1.4,
              ease: 'easeOut',
            }}
          />
        ))}
    </g>
  );
}

// --- the screen (frosted chrome comes from ui/kit's hoisted FROST recipe) -----------------------

export function AdventureRoadmap({
  chapters,
  intent,
  title,
  onExit,
}: {
  chapters: { chapter: Chapter; tone: SubjectTone }[];
  intent: Intent;
  title?: string;
  onExit?: () => void;
}) {
  const router = useRouter();
  const { completed, topicProgress } = useProgress();
  const reduced = useReducedMotion() ?? false;
  const dark = useDark();
  const scrollRef = useRef<HTMLDivElement>(null);
  const skyRef = useRef<HTMLDivElement>(null);
  const farRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(() => (typeof window === 'undefined' ? 390 : window.innerWidth));
  const [entering, setEntering] = useState<Checkpoint | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const on = () => setW(window.innerWidth);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // the world is open: lock the page behind it, breathe, listen
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sfx.reveal();
    ambience.start();
    const t = window.setTimeout(() => setRevealed(true), reduced ? 350 : 1250);
    return () => {
      document.body.style.overflow = prev;
      ambience.stop();
      window.clearTimeout(t);
    };
  }, [reduced]);

  // flatten chapters → checkpoints on one road
  const flat = useMemo(() => {
    const list: { topic: Topic; tone: SubjectTone; chapterId: string }[] = [];
    for (const { chapter, tone } of chapters)
      for (const topic of chapter.topics) list.push({ topic, tone, chapterId: chapter.id });
    return list;
  }, [chapters]);

  const currentIdx = useMemo(() => {
    const i = flat.findIndex((f) => !completed.has(f.topic.id));
    return i === -1 ? flat.length - 1 : i;
  }, [flat, completed]);

  const H = TOP_PAD + Math.max(0, flat.length - 1) * STEP_Y + FOOT_PAD;

  const cps: Checkpoint[] = useMemo(() => {
    const mid = W / 2;
    const amp = Math.min(W * 0.3, 250);
    const phase = (hash(chapters[0]?.chapter.id ?? 'x') % 628) / 100;
    return flat.map((f, i) => {
      const done = completed.has(f.topic.id);
      const jit = ((hash(`jit:${f.topic.id}`) % 100) / 100 - 0.5) * W * 0.06;
      return {
        topic: f.topic,
        tone: f.tone,
        chapterId: f.chapterId,
        index: i + 1,
        p: { x: mid + Math.sin(phase + i * 1.05) * amp + jit, y: TOP_PAD + i * STEP_Y },
        steps: topicSteps(f.topic),
        frac: done ? 1 : Math.max(0, Math.min(1, topicProgress[f.topic.id] ?? 0)),
        state: done ? 'done' : i === currentIdx ? 'current' : ('locked' as const),
      };
    });
  }, [flat, completed, topicProgress, currentIdx, W, chapters]);

  const regions: Region[] = useMemo(() => {
    const out: Region[] = [];
    for (const { chapter } of chapters) {
      const mine = cps.filter((c) => c.chapterId === chapter.id);
      const head = mine[0];
      const tail = mine[mine.length - 1];
      if (!head || !tail) continue;
      out.push({
        chapterId: chapter.id,
        pal: resolveBiome(biomeFor(chapter.id), dark),
        seed: hash(`region:${chapter.id}`),
        yTop: head.p.y - STEP_Y * 0.55,
        yBot: tail.p.y + STEP_Y * 0.55,
      });
    }
    const first = out[0];
    const last = out[out.length - 1];
    if (first) first.yTop = 0;
    if (last) last.yBot = H;
    return out;
  }, [chapters, cps, dark, H]);

  const roadSegs = useMemo(() => {
    const pts: Pt[] = [{ x: W / 2, y: -60 }, ...cps.map((c) => c.p), { x: W / 2, y: H + 60 }];
    return spline(pts);
  }, [cps, W, H]);

  // cobbles: the content steps riding the road INTO each checkpoint, lit as far as walked
  const cobbles = useMemo(() => {
    const out: { p: Pt; lit: boolean; hue: string; key: string }[] = [];
    cps.forEach((c, i) => {
      const seg = roadSegs[i];
      if (!seg) return;
      const walked = c.state === 'done' ? 1 : c.state === 'current' ? c.frac : 0;
      for (let k = 0; k < c.steps; k++) {
        const t = (k + 0.5) / c.steps;
        if (t > 0.88) continue; // keep cobbles off the medallion itself
        out.push({
          p: segPoint(seg, t),
          lit: t <= walked,
          hue: c.tone?.hue ?? '#1F35E0',
          key: `${c.topic.id}:${k}`,
        });
      }
    });
    return out;
  }, [cps, roadSegs]);

  // parallax: sky drifts at 8%, the far range at 16%
  useEffect(() => {
    if (reduced) return;
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = el.scrollTop;
        if (skyRef.current) skyRef.current.style.transform = `translateY(${-y * 0.08}px)`;
        if (farRef.current) farRef.current.style.transform = `translateY(${-y * 0.16}px)`;
      });
    };
    el.addEventListener('scroll', on, { passive: true });
    return () => {
      el.removeEventListener('scroll', on);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  // arrive standing at the current checkpoint
  // biome-ignore lint/correctness/useExhaustiveDependencies: arrival scroll runs once, on mount
  useEffect(() => {
    const el = scrollRef.current;
    const cur = cps[currentIdx];
    if (el && cur) el.scrollTop = Math.max(0, cur.p.y - window.innerHeight * 0.55);
  }, []);

  const enter = (c: Checkpoint) => {
    if (entering) return;
    sfx.tap();
    setEntering(c);
    window.setTimeout(
      () =>
        router.navigate(
          intent === 'practice'
            ? { name: 'sandbox', topicId: c.topic.id }
            : { name: 'course', topicId: c.topic.id },
        ),
      reduced ? 80 : 480,
    );
  };

  const doneCount = cps.filter((c) => c.state === 'done').length;
  const storedAvatar = (typeof localStorage !== 'undefined' &&
    localStorage.getItem('clss-avatar-v1')) as CastId | null;
  const avatarId: CastId =
    storedAvatar && storedAvatar in CAST
      ? storedAvatar
      : (CAST_IDS[hash('expedition-avatar') % CAST_IDS.length] ?? ('pip' as CastId));
  const Avatar = CAST[avatarId].Component;
  const skyTop = regions[0]?.pal.washTop ?? 'var(--clss-canvas)';
  const horizon = dark ? 'rgba(255,196,120,0.10)' : 'rgba(255,196,120,0.35)';

  const world = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        // Above the app chrome (header sits at 1100): a scene owns the whole screen while open.
        zIndex: 1150,
        overflow: 'hidden',
        background: skyTop,
      }}
      aria-label={`${title ?? 'subject'} expedition map`}
    >
      {/* LAYER 0 — sky: biome wash, a low sun, birds crossing */}
      <div
        ref={skyRef}
        style={{
          position: 'absolute',
          inset: '-12% 0 0 0',
          height: '130%',
          background: `linear-gradient(${skyTop} 0%, ${regions[0]?.pal.washBot ?? skyTop} 46%, ${horizon} 72%, transparent 100%)`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '14%',
            right: '16%',
            width: 90,
            height: 90,
            borderRadius: '50%',
            background: dark
              ? 'radial-gradient(circle, rgba(255,214,150,0.28), transparent 70%)'
              : 'radial-gradient(circle, rgba(255,226,168,0.9), transparent 70%)',
            filter: 'blur(2px)',
          }}
        />
        <Birds reduced={reduced} dark={dark} />
      </div>

      {/* LAYER 1 — the distant range, parallax silhouettes */}
      <div
        ref={farRef}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: '46%',
          pointerEvents: 'none',
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${W} 420`}
          preserveAspectRatio="none"
          aria-hidden
          role="presentation"
        >
          <path
            d={ridgePath(W, 218, 66, hash('far-a'), 420)}
            fill={regions[0]?.pal.far ?? '#B9C6D8'}
            opacity={0.55}
          />
          <path
            d={ridgePath(W, 292, 52, hash('far-b'), 420)}
            fill={regions[0]?.pal.far ?? '#B9C6D8'}
            opacity={0.85}
          />
        </svg>
      </div>

      {/* LAYER 2 — the valley: full-bleed, scrollable */}
      <div
        ref={scrollRef}
        style={{ position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden' }}
      >
        <div style={{ position: 'relative', width: '100%', height: H }}>
          <motion.div
            animate={
              entering ? { scale: reduced ? 1 : 1.16, opacity: 0.001 } : { scale: 1, opacity: 1 }
            }
            transition={{ duration: 0.48, ease: [0.45, 0, 0.24, 1] }}
            style={{
              width: '100%',
              height: '100%',
              transformOrigin: entering ? `${entering.p.x}px ${entering.p.y}px` : '50% 50%',
            }}
          >
            <svg
              width="100%"
              height={H}
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="none"
              aria-hidden
              role="presentation"
              style={{ display: 'block' }}
            >
              <title>the expedition valley</title>
              {/* region atmospheres — full width, blending down the valley */}
              {regions.map((r) => (
                <g key={`wash:${r.chapterId}`}>
                  <defs>
                    <linearGradient id={`w:${r.chapterId}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={r.pal.washTop} stopOpacity={0} />
                      <stop offset="30%" stopColor={r.pal.washBot} stopOpacity={0.95} />
                      <stop offset="100%" stopColor={r.pal.washBot} stopOpacity={0.95} />
                    </linearGradient>
                  </defs>
                  <rect
                    x={0}
                    y={r.yTop}
                    width={W}
                    height={r.yBot - r.yTop + STEP_Y * 0.6}
                    fill={`url(#w:${r.chapterId})`}
                  />
                </g>
              ))}
              {/* each region: a horizon ridge, the main landmass, its under-shadow, trees, creatures */}
              {regions.map((r) => {
                const rand = mulberry(r.seed);
                const trees = Array.from({ length: 4 + Math.floor(rand() * 3) }, (_, i) => ({
                  tx: 24 + rand() * (W - 48),
                  ty: r.yTop + 60 + rand() * Math.max(60, r.yBot - r.yTop - 90),
                  s: 0.7 + rand() * 0.8,
                  key: `t:${r.chapterId}:${i}`,
                  conifer: rand() > 0.45,
                }));
                const grazers =
                  W > 520
                    ? Array.from({ length: 1 + Math.floor(rand() * 2) }, (_, i) => ({
                        gx: 40 + rand() * (W - 80),
                        gy: r.yTop + 90 + rand() * Math.max(50, r.yBot - r.yTop - 130),
                        s: 0.8 + rand() * 0.5,
                        flip: rand() > 0.5,
                        key: `g:${r.chapterId}:${i}`,
                      }))
                    : [];
                return (
                  <g key={`land:${r.chapterId}`}>
                    <path
                      d={ridgePath(W, r.yTop + 46, 26, r.seed ^ 7, r.yBot + STEP_Y)}
                      fill={r.pal.far}
                      opacity={0.5}
                    />
                    <path
                      d={ridgePath(W, r.yTop + 96, 34, r.seed, r.yBot + STEP_Y)}
                      fill={r.pal.top}
                    />
                    <path
                      d={ridgePath(W, r.yTop + 108, 34, r.seed, r.yBot + STEP_Y)}
                      fill={r.pal.side}
                      opacity={0.35}
                    />
                    {trees.map((t) =>
                      t.conifer ? (
                        <g
                          key={t.key}
                          transform={`translate(${t.tx} ${t.ty}) scale(${t.s})`}
                          opacity={0.9}
                        >
                          <ellipse cx={0} cy={2} rx={13} ry={4} fill="rgba(20,22,28,0.12)" />
                          <rect
                            x={-1.6}
                            y={-10}
                            width={3.2}
                            height={12}
                            rx={1.4}
                            fill={r.pal.side}
                          />
                          <path
                            d="M0 -44 L 13 -18 L 5 -18 L 16 -2 L -16 -2 L -5 -18 L -13 -18 Z"
                            fill={r.pal.side}
                          />
                          <path
                            d="M0 -44 L 13 -18 L 5 -18 L 16 -2 L 0 -2 Z"
                            fill={r.pal.top}
                            opacity={0.5}
                          />
                        </g>
                      ) : (
                        <g
                          key={t.key}
                          transform={`translate(${t.tx} ${t.ty}) scale(${t.s})`}
                          opacity={0.9}
                        >
                          <ellipse cx={0} cy={2} rx={12} ry={4} fill="rgba(20,22,28,0.12)" />
                          <rect
                            x={-1.6}
                            y={-12}
                            width={3.2}
                            height={14}
                            rx={1.4}
                            fill={r.pal.side}
                          />
                          <circle cx={0} cy={-22} r={13} fill={r.pal.side} />
                          <circle cx={-7} cy={-17} r={9} fill={r.pal.side} />
                          <circle cx={7} cy={-17} r={9} fill={r.pal.side} />
                          <circle cx={-3} cy={-25} r={9} fill={r.pal.top} opacity={0.55} />
                        </g>
                      ),
                    )}
                    {grazers.map((g) => (
                      <Grazer
                        key={g.key}
                        x={g.gx}
                        y={g.gy}
                        s={g.s}
                        tint={r.pal.side}
                        flip={g.flip}
                      />
                    ))}
                  </g>
                );
              })}
              {/* THE ROAD — carved: casing, bed, then the walked cobbles */}
              <path
                d={segsToPath(roadSegs)}
                fill="none"
                stroke={regions[0]?.pal.roadEdge ?? '#C6A671'}
                strokeWidth={30}
                strokeLinecap="round"
                opacity={0.95}
              />
              <path
                d={segsToPath(roadSegs)}
                fill="none"
                stroke={regions[0]?.pal.road ?? '#E7D6B2'}
                strokeWidth={22}
                strokeLinecap="round"
              />
              {cobbles.map((c) => (
                <circle
                  key={c.key}
                  cx={c.p.x}
                  cy={c.p.y}
                  r={c.lit ? 4.6 : 3.6}
                  fill={c.lit ? c.hue : 'rgba(20,22,28,0.22)'}
                  opacity={c.lit ? 0.95 : 0.75}
                />
              ))}
              {cps[currentIdx] && (
                <CampSmoke
                  x={cps[currentIdx].p.x + (cps[currentIdx].p.x < W / 2 ? 74 : -74)}
                  y={cps[currentIdx].p.y + 14}
                  reduced={reduced}
                />
              )}
            </svg>

            {/* checkpoints — real buttons seated on the road */}
            {cps.map((c) => {
              const size = c.state === 'current' ? CUR : CHECK;
              const hue = c.tone?.hue ?? '#1F35E0';
              return (
                <motion.button
                  key={c.topic.id}
                  type="button"
                  onClick={() => enter(c)}
                  aria-label={`${c.topic.name} — checkpoint ${c.index}, ${
                    c.state === 'done'
                      ? 'completed'
                      : c.state === 'current'
                        ? 'in progress, you are here'
                        : 'not started'
                  }`}
                  whileHover={{ y: -4, scale: 1.05 }}
                  whileTap={{ scale: 0.93 }}
                  transition={{ type: 'spring', stiffness: 340, damping: 20 }}
                  style={{
                    position: 'absolute',
                    left: c.p.x - size / 2,
                    top: c.p.y - size / 2,
                    width: size,
                    height: size,
                    borderRadius: '50%',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    background: 'transparent',
                    fontFamily: 'inherit',
                  }}
                >
                  {c.state === 'current' && !reduced && (
                    <motion.span
                      aria-hidden
                      animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                      transition={{
                        duration: 2.1,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: 'easeOut',
                      }}
                      style={{
                        position: 'absolute',
                        inset: -8,
                        borderRadius: '50%',
                        border: `2px solid ${hue}`,
                      }}
                    />
                  )}
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '50%',
                      background:
                        c.state === 'done'
                          ? `linear-gradient(160deg, ${hue}, color-mix(in srgb, ${hue} 62%, #000 12%))`
                          : c.state === 'current'
                            ? 'var(--clss-paper)'
                            : 'color-mix(in srgb, var(--clss-ink) 12%, var(--clss-paper))',
                      border:
                        c.state === 'current'
                          ? `3px solid ${hue}`
                          : '2px solid color-mix(in srgb, var(--clss-ink) 22%, transparent)',
                      boxShadow:
                        c.state === 'current'
                          ? `0 10px 28px -8px ${hue}`
                          : '0 6px 16px -8px rgba(20,22,28,0.45)',
                      display: 'grid',
                      placeItems: 'center',
                      color: c.state === 'done' ? '#fff' : 'var(--clss-ink-700)',
                      fontWeight: 700,
                      fontSize: c.state === 'current' ? '1.05rem' : '0.92rem',
                    }}
                  >
                    {c.state === 'done' ? (
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        aria-hidden
                        role="presentation"
                      >
                        <path
                          d="M12 2.6 L14.8 8.4 L21.2 9.3 L16.6 13.8 L17.7 20.2 L12 17.2 L6.3 20.2 L7.4 13.8 L2.8 9.3 L9.2 8.4 Z"
                          fill="#fff"
                        />
                      </svg>
                    ) : (
                      c.index
                    )}
                  </span>
                  {c.state === 'current' && (
                    <span
                      aria-hidden
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: -34,
                        transform: 'translateX(-50%)',
                      }}
                    >
                      <Avatar size={40} />
                    </span>
                  )}
                  {c.state !== 'locked' && (
                    <span
                      aria-hidden
                      style={{
                        ...FROST,
                        position: 'absolute',
                        top: size + 8,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        padding: '4px 10px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: 'var(--clss-ink-900)',
                        whiteSpace: 'nowrap',
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {c.topic.name}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        </div>
      </div>

      {/* LAYER 3 — frosted chrome */}
      <div
        style={{
          position: 'absolute',
          top: 'max(14px, env(safe-area-inset-top))',
          left: 16,
          right: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          pointerEvents: 'none',
        }}
      >
        {onExit && (
          <motion.button
            type="button"
            onClick={() => {
              sfx.tap();
              onExit();
            }}
            aria-label="Back to the chapter list"
            whileHover={{ x: -3 }}
            whileTap={{ scale: 0.94 }}
            style={{
              ...FROST,
              width: 40,
              height: 40,
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              color: 'var(--clss-ink-900)',
              pointerEvents: 'auto',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden role="presentation">
              <path
                d="M10.5 3 L5.5 8 L10.5 13"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.button>
        )}
        <div style={{ ...FROST, padding: '8px 14px', pointerEvents: 'auto' }}>
          <div
            style={{
              fontSize: '1rem',
              fontWeight: 650,
              color: 'var(--clss-ink-900)',
              lineHeight: 1.2,
            }}
          >
            {title ?? 'the expedition'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--clss-ink-500)', fontWeight: 550 }}>
            {doneCount} of {cps.length} checkpoints ·{' '}
            {intent === 'practice' ? 'practice trail' : 'learning trail'}
          </div>
        </div>
      </div>

      {/* LAYER 4 — entrance clouds part to reveal the world */}
      <AnimatePresence>
        {!revealed && (
          <motion.div
            initial={false}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
            aria-hidden
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={`cloud-${i}`}
                initial={{ x: 0, opacity: 1 }}
                animate={{ x: (i % 2 ? 1 : -1) * (reduced ? 0 : 60 + i * 40), opacity: 0 }}
                transition={{ duration: reduced ? 0.35 : 1.15 + i * 0.08, ease: [0.3, 0, 0.2, 1] }}
                style={{
                  position: 'absolute',
                  left: `${-14 + i * 24}%`,
                  top: `${-10 + ((i * 26) % 90)}%`,
                  width: '60%',
                  height: '52%',
                  borderRadius: '50%',
                  background: dark ? 'rgba(30,33,42,0.92)' : 'rgba(248,250,253,0.94)',
                  filter: 'blur(34px)',
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* enter-the-level flash */}
      <AnimatePresence>
        {entering && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.42, ease: 'easeIn' }}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'var(--clss-paper)',
              pointerEvents: 'none',
            }}
            aria-hidden
          />
        )}
      </AnimatePresence>
    </motion.div>
  );

  return typeof document === 'undefined' ? world : createPortal(world, document.body);
}
