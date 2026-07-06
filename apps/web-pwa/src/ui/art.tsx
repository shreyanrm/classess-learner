'use client';

/**
 * The art system — generative, structural, never clip-art (DESIGN.md §2, law 7: glanceable).
 *
 * Every topic owns a concept sigil: unique geometric line-art derived deterministically from its
 * id — a base polygon, orbiting nodes, and arc traces. Fine ink strokes at rest; the sigil
 * ignites in ultramarine once the concept is mastered. One generator, thousands of distinct
 * artworks, zero authored assets — and the art MEANS something: it is the concept's identity,
 * repeated on its card, its course header, and its star in the twin.
 */

import { motion } from 'framer-motion';
import { useMemo } from 'react';

/** FNV-1a — stable tiny hash for deterministic art. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A tiny seeded PRNG (mulberry32) so each sigil's features are stable. */
function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const INK_FAINT = 'var(--clss-ink-100)';
const INK_SOFT = 'var(--clss-ink-300)';
const INK = 'var(--clss-ink-700)';
const ULTRA = 'var(--clss-ultramarine)';

function polygonPoints(cx: number, cy: number, r: number, sides: number, rot: number): string {
  return Array.from({ length: sides }, (_, i) => {
    const a = rot + (i / sides) * Math.PI * 2;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
}

export interface TopicSigilProps {
  id: string;
  size?: number;
  /** Mastered sigils carry the pigment. */
  mastered?: boolean;
  /** Draw-in animation on mount (used sparingly — course headers, not whole grids). */
  draw?: boolean;
}

/** The concept sigil — a topic's own geometry. */
export function TopicSigil({ id, size = 56, mastered = false, draw = false }: TopicSigilProps) {
  const art = useMemo(() => {
    const r = rng(hash(id));
    const sides = 3 + Math.floor(r() * 6); // 3..8
    const rot = r() * Math.PI * 2;
    const baseR = 16 + r() * 6;
    const orbitR = baseR + 6 + r() * 5;
    const dots = 1 + Math.floor(r() * 3);
    const dotAngles = Array.from({ length: dots }, () => r() * Math.PI * 2);
    const arcStart = r() * Math.PI * 2;
    const arcSpan = Math.PI * (0.5 + r() * 0.9);
    const hasChord = r() > 0.45;
    const chordA = r() * Math.PI * 2;
    const chordB = chordA + Math.PI * (0.6 + r() * 0.8);
    const innerR = baseR * (0.38 + r() * 0.2);
    return {
      sides,
      rot,
      baseR,
      orbitR,
      dots,
      dotAngles,
      arcStart,
      arcSpan,
      hasChord,
      chordA,
      chordB,
      innerR,
    };
  }, [id]);

  const c = 32;
  const arcEnd = art.arcStart + art.arcSpan;
  const large = art.arcSpan > Math.PI ? 1 : 0;
  const stroke = mastered ? ULTRA : INK_SOFT;
  const drawProps = draw
    ? {
        initial: { pathLength: 0, opacity: 0 },
        animate: { pathLength: 1, opacity: 1 },
        transition: { duration: 0.9, ease: [0.2, 0, 0, 1] as const },
      }
    : {};

  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative, aria-hidden
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden style={{ display: 'block' }}>
      {/* the orbit arc */}
      <motion.path
        d={`M ${c + art.orbitR * Math.cos(art.arcStart)} ${c + art.orbitR * Math.sin(art.arcStart)}
            A ${art.orbitR} ${art.orbitR} 0 ${large} 1 ${c + art.orbitR * Math.cos(arcEnd)} ${c + art.orbitR * Math.sin(arcEnd)}`}
        fill="none"
        stroke={mastered ? ULTRA : INK_FAINT}
        strokeWidth={1}
        strokeLinecap="round"
        {...drawProps}
      />
      {/* the base polygon */}
      <motion.polygon
        points={polygonPoints(c, c, art.baseR, art.sides, art.rot)}
        fill={mastered ? 'var(--clss-ultramarine-soft)' : 'none'}
        stroke={stroke}
        strokeWidth={1.1}
        strokeLinejoin="round"
        {...drawProps}
      />
      {/* inner echo */}
      <circle
        cx={c}
        cy={c}
        r={art.innerR}
        fill="none"
        stroke={mastered ? ULTRA : INK_FAINT}
        strokeWidth={0.8}
      />
      {/* a chord through the idea */}
      {art.hasChord && (
        <line
          x1={c + art.baseR * Math.cos(art.chordA)}
          y1={c + art.baseR * Math.sin(art.chordA)}
          x2={c + art.baseR * Math.cos(art.chordB)}
          y2={c + art.baseR * Math.sin(art.chordB)}
          stroke={stroke}
          strokeWidth={0.9}
        />
      )}
      {/* orbit nodes */}
      {art.dotAngles.map((a, i) => (
        <circle
          key={`${id}-dot-${a.toFixed(4)}`}
          cx={c + art.orbitR * Math.cos(a)}
          cy={c + art.orbitR * Math.sin(a)}
          r={i === 0 ? 2.2 : 1.5}
          fill={mastered && i === 0 ? ULTRA : INK}
        />
      ))}
    </svg>
  );
}

/** Hand-drawn subject glyphs — construction-line art, one accent node each. */
export function SubjectGlyph({
  subjectId,
  size = 72,
  accent = false,
}: {
  subjectId: string;
  size?: number;
  accent?: boolean;
}) {
  const a = accent ? ULTRA : INK;
  const common = {
    fill: 'none' as const,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative, aria-hidden
    <svg viewBox="0 0 96 96" width={size} height={size} aria-hidden style={{ display: 'block' }}>
      {subjectId === 'math' && (
        <g>
          {/* a compass construction: circle, inscribed triangle, its height */}
          <circle cx={48} cy={48} r={30} stroke={INK_FAINT} strokeWidth={1.2} {...common} />
          <polygon
            points={polygonPoints(48, 48, 30, 3, -Math.PI / 2)}
            stroke={INK_SOFT}
            strokeWidth={1.4}
            {...common}
          />
          <line
            x1={48}
            y1={18}
            x2={48}
            y2={78}
            stroke={INK_FAINT}
            strokeWidth={1}
            strokeDasharray="2 4"
          />
          <circle cx={48} cy={18} r={3} fill={a} />
          <circle cx={22} cy={63} r={2} fill={INK} />
          <circle cx={74} cy={63} r={2} fill={INK} />
        </g>
      )}
      {subjectId === 'science' && (
        <g>
          {/* two electron orbits and a nucleus */}
          <ellipse
            cx={48}
            cy={48}
            rx={32}
            ry={13}
            stroke={INK_FAINT}
            strokeWidth={1.2}
            transform="rotate(-24 48 48)"
            {...common}
          />
          <ellipse
            cx={48}
            cy={48}
            rx={32}
            ry={13}
            stroke={INK_SOFT}
            strokeWidth={1.2}
            transform="rotate(38 48 48)"
            {...common}
          />
          <circle cx={48} cy={48} r={4} fill={a} />
          <circle cx={73} cy={35} r={2.2} fill={INK} />
          <circle cx={26} cy={62} r={2.2} fill={INK} />
        </g>
      )}
      {subjectId === 'social' && (
        <g>
          {/* a meridian globe over a horizon */}
          <circle cx={48} cy={44} r={26} stroke={INK_SOFT} strokeWidth={1.3} {...common} />
          <ellipse cx={48} cy={44} rx={11} ry={26} stroke={INK_FAINT} strokeWidth={1} {...common} />
          <line x1={22} y1={44} x2={74} y2={44} stroke={INK_FAINT} strokeWidth={1} />
          <line x1={14} y1={78} x2={82} y2={78} stroke={INK_SOFT} strokeWidth={1.2} />
          <circle cx={58} cy={33} r={3} fill={a} />
        </g>
      )}
      {subjectId !== 'math' && subjectId !== 'science' && subjectId !== 'social' && (
        <circle cx={48} cy={48} r={26} stroke={INK_SOFT} strokeWidth={1.3} fill="none" />
      )}
    </svg>
  );
}

/** A thin generative filigree strip — heads a chapter row, derived from its id. */
export function ChapterFiligree({
  id,
  width = 120,
  height = 10,
}: {
  id: string;
  width?: number;
  height?: number;
}) {
  const marks = useMemo(() => {
    const r = rng(hash(id));
    return Array.from({ length: 9 }, (_, i) => ({
      x: 4 + i * ((width - 8) / 8),
      kind: r() > 0.6 ? 'dot' : r() > 0.3 ? 'tick' : 'gap',
    }));
  }, [id, width]);
  const cy = height / 2;
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative, aria-hidden
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      aria-hidden
      style={{ display: 'block' }}
    >
      <line x1={0} y1={cy} x2={width} y2={cy} stroke={INK_FAINT} strokeWidth={0.8} />
      {marks.map((m, i) =>
        m.kind === 'dot' ? (
          <circle key={`${id}-mark-${m.x.toFixed(1)}`} cx={m.x} cy={cy} r={1.6} fill={INK_SOFT} />
        ) : m.kind === 'tick' ? (
          <line
            key={`${id}-mark-${m.x.toFixed(1)}`}
            x1={m.x}
            y1={cy - 3}
            x2={m.x}
            y2={cy + 3}
            stroke={INK_SOFT}
            strokeWidth={0.9}
          />
        ) : null,
      )}
    </svg>
  );
}

/** An empty-state constellation sketch — a promise, not a void. */
export function EmptyConstellation({ size = 140, label }: { size?: number; label?: string }) {
  const stars: [number, number, number][] = [
    [30, 84, 2],
    [58, 40, 2.6],
    [86, 66, 1.8],
    [110, 30, 2.2],
    [76, 104, 1.6],
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      // biome-ignore lint/a11y/noSvgWithoutTitle: decorative, aria-hidden
      <svg
        viewBox="0 0 140 140"
        width={size}
        height={size}
        aria-hidden
        style={{ display: 'block' }}
      >
        <path
          d="M 30 84 L 58 40 L 86 66 L 110 30 M 86 66 L 76 104"
          stroke={INK_FAINT}
          strokeWidth={1}
          fill="none"
        />
        {stars.map(([x, y, r], i) => (
          <motion.circle
            key={`star-${x}-${y}`}
            cx={x}
            cy={y}
            r={r}
            fill={i === 1 ? ULTRA : INK_SOFT}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{
              duration: 3.4 + i * 0.6,
              repeat: Number.POSITIVE_INFINITY,
              ease: 'easeInOut',
            }}
          />
        ))}
      </svg>
      {label && <div style={{ color: 'var(--clss-ink-500)', fontSize: '0.88rem' }}>{label}</div>}
    </div>
  );
}

/** The boss sigil — the topic's own geometry, set in a ring, worthy of a final door. */
export function BossSigil({ id, size = 96 }: { id: string; size?: number }) {
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      {/* biome-ignore lint/a11y/noSvgWithoutTitle: decorative, aria-hidden */}
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        aria-hidden
        style={{ position: 'absolute', inset: 0 }}
      >
        <circle
          cx={32}
          cy={32}
          r={30}
          fill="none"
          stroke={INK_SOFT}
          strokeWidth={1}
          strokeDasharray="3 5"
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <TopicSigil id={id} size={size * 0.72} />
      </div>
    </div>
  );
}
