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
import { canonicalSubjectId } from '../curriculum/subjects';

/** FNV-1a — stable tiny hash for deterministic art. */
export function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A tiny seeded PRNG (mulberry32) so each sigil's features are stable. */
export function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mix two hex colors — t=0 → a, t=1 → b. For deriving dark-theme terrain from a light palette. */
export function mixHex(a: string, b: string, t: number): string {
  const pa = Number.parseInt(a.slice(1), 16);
  const pb = Number.parseInt(b.slice(1), 16);
  const mix = (sh: number) => {
    const x = (pa >> sh) & 255;
    const y = (pb >> sh) & 255;
    return Math.round(x + (y - x) * t);
  };
  const h = (n: number) => n.toString(16).padStart(2, '0');
  return `#${h(mix(16))}${h(mix(8))}${h(mix(0))}`;
}

/**
 * A smooth, closed organic blob — Catmull-Rom through radial points jittered by a seed. One
 * generator for every soft mass in the world: plateaus, canopies, boulders, clouds, drifts.
 */
export function blobPath(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  seed: number,
  pts = 8,
  jitter = 0.18,
): string {
  const r = rng(seed);
  const P: [number, number][] = Array.from({ length: pts }, (_, i) => {
    const a = (i / pts) * Math.PI * 2;
    const j = 1 - jitter + r() * jitter * 2;
    return [cx + Math.cos(a) * rx * j, cy + Math.sin(a) * ry * j];
  });
  const at = (i: number) => P[((i % pts) + pts) % pts] as [number, number];
  let d = `M ${at(0)[0].toFixed(1)} ${at(0)[1].toFixed(1)}`;
  for (let i = 0; i < pts; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return `${d} Z`;
}

const INK_FAINT = 'var(--wobo-ink-100)';
const INK_SOFT = 'var(--wobo-ink-300)';
const INK = 'var(--wobo-ink-700)';
const ULTRA = 'var(--wobo-ultramarine)';

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
  /** The owning subject's hue — earned moments take the subject family (default ultramarine). */
  hue?: string;
  /** Draw-in animation on mount (used sparingly — course headers, not whole grids). */
  draw?: boolean;
  /** Hero scale: full-ink strokes at poster weight — for a sigil that IS the card's subject. */
  bold?: boolean;
}

/** The concept sigil — a topic's own geometry. */
export function TopicSigil({
  id,
  size = 56,
  mastered = false,
  hue = ULTRA,
  draw = false,
  bold = false,
}: TopicSigilProps) {
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
  const stroke = mastered ? hue : bold ? INK : INK_SOFT;
  const faint = mastered ? hue : bold ? INK_SOFT : INK_FAINT;
  const wMain = bold ? 2 : 1.1;
  const wFine = bold ? 1.4 : 0.8;
  const drawProps = draw
    ? {
        initial: { pathLength: 0, opacity: 0 },
        animate: { pathLength: 1, opacity: 1 },
        transition: { duration: 0.9, ease: [0.2, 0, 0, 1] as const },
      }
    : {};

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="presentation"
      aria-hidden
      style={{ display: 'block' }}
    >
      {/* the orbit arc */}
      <motion.path
        d={`M ${c + art.orbitR * Math.cos(art.arcStart)} ${c + art.orbitR * Math.sin(art.arcStart)}
            A ${art.orbitR} ${art.orbitR} 0 ${large} 1 ${c + art.orbitR * Math.cos(arcEnd)} ${c + art.orbitR * Math.sin(arcEnd)}`}
        fill="none"
        stroke={faint}
        strokeWidth={bold ? 1.4 : 1}
        strokeLinecap="round"
        {...drawProps}
      />
      {/* the base polygon */}
      <motion.polygon
        points={polygonPoints(c, c, art.baseR, art.sides, art.rot)}
        fill={mastered ? hue : bold ? '#FFFFFF' : 'none'}
        fillOpacity={mastered ? 0.08 : bold ? 0.85 : undefined}
        stroke={stroke}
        strokeWidth={wMain}
        strokeLinejoin="round"
        {...drawProps}
      />
      {/* inner echo */}
      <circle cx={c} cy={c} r={art.innerR} fill="none" stroke={faint} strokeWidth={wFine} />
      {/* a chord through the idea */}
      {art.hasChord && (
        <line
          x1={c + art.baseR * Math.cos(art.chordA)}
          y1={c + art.baseR * Math.sin(art.chordA)}
          x2={c + art.baseR * Math.cos(art.chordB)}
          y2={c + art.baseR * Math.sin(art.chordB)}
          stroke={stroke}
          strokeWidth={bold ? 1.6 : 0.9}
        />
      )}
      {/* orbit nodes — in bold the first carries the art system's one golden accent */}
      {art.dotAngles.map((a, i) => (
        <circle
          key={`${id}-dot-${a.toFixed(4)}`}
          cx={c + art.orbitR * Math.cos(a)}
          cy={c + art.orbitR * Math.sin(a)}
          r={i === 0 ? (bold ? 3 : 2.2) : bold ? 2 : 1.5}
          fill={mastered && i === 0 ? hue : bold && i === 0 ? '#FFC93C' : INK}
          stroke={bold && i === 0 ? INK : undefined}
          strokeWidth={bold && i === 0 ? 1.2 : undefined}
        />
      ))}
    </svg>
  );
}

/** Subject artworks — bold, layered, colorful; each one its own little poster. */
export function SubjectGlyph({
  subjectId,
  size = 72,
  accent = false,
}: {
  subjectId: string;
  size?: number;
  accent?: boolean;
}) {
  const o = accent ? 1 : 0.92;
  // A board names a subject its own way (physical_science, computer…); the glyph draws its canonical
  // family. Gradient ids stay keyed to the raw id so distinct doors never share a <defs> id.
  const sid = canonicalSubjectId(subjectId);
  return (
    <svg
      viewBox="0 0 96 96"
      width={size}
      height={size}
      role="presentation"
      aria-hidden
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id={`sg-m-${subjectId}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4257F0" />
          <stop offset="100%" stopColor="#1F35E0" />
        </linearGradient>
        <linearGradient id={`sg-s-${subjectId}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2BC4D3" />
          <stop offset="100%" stopColor="#0A7E8A" />
        </linearGradient>
        <linearGradient id={`sg-g-${subjectId}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F0A030" />
          <stop offset="100%" stopColor="#B26A00" />
        </linearGradient>
        <linearGradient id={`sg-p-${subjectId}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8E6CF5" />
          <stop offset="100%" stopColor="#6D4AE0" />
        </linearGradient>
        <linearGradient id={`sg-b-${subjectId}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3ECD8C" />
          <stop offset="100%" stopColor="#1CA363" />
        </linearGradient>
        <linearGradient id={`sg-c-${subjectId}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F04A9C" />
          <stop offset="100%" stopColor="#D6196F" />
        </linearGradient>
      </defs>
      {sid === 'math' && (
        <g opacity={o}>
          {/* a bold construction: gradient square, tilted triangle, the golden point */}
          <rect x={18} y={26} width={44} height={44} rx={7} fill={`url(#sg-m-${subjectId})`} />
          <rect
            x={18}
            y={26}
            width={44}
            height={44}
            rx={7}
            fill="rgba(255,255,255,0.14)"
            transform="rotate(-8 40 48)"
          />
          <polygon
            points="50,18 78,66 22,66"
            fill="none"
            stroke="#0D0D10"
            strokeWidth={3.4}
            strokeLinejoin="round"
            transform="rotate(6 50 48)"
          />
          <circle cx={71} cy={30} r={6.5} fill="#FFC93C" />
          <circle cx={71} cy={30} r={6.5} fill="none" stroke="#0D0D10" strokeWidth={2} />
        </g>
      )}
      {sid === 'physics' && (
        <g opacity={o}>
          {/* an orbiting atom — violet nucleus, bold ink orbits, one golden electron */}
          <ellipse
            cx={48}
            cy={48}
            rx={31}
            ry={13}
            fill="none"
            stroke="#0D0D10"
            strokeWidth={3}
            transform="rotate(-28 48 48)"
          />
          <ellipse
            cx={48}
            cy={48}
            rx={31}
            ry={13}
            fill="none"
            stroke="#0D0D10"
            strokeWidth={3}
            transform="rotate(28 48 48)"
          />
          <circle cx={48} cy={48} r={12} fill={`url(#sg-p-${subjectId})`} />
          <circle cx={48} cy={48} r={12} fill="none" stroke="#0D0D10" strokeWidth={3} />
          <circle cx={73} cy={31} r={5.5} fill="#FFC93C" />
          <circle cx={73} cy={31} r={5.5} fill="none" stroke="#0D0D10" strokeWidth={2} />
          <circle cx={24} cy={64} r={4} fill="#6D4AE0" stroke="#0D0D10" strokeWidth={2} />
        </g>
      )}
      {(sid === 'chemistry' || sid === 'science') && (
        <g opacity={o}>
          {/* a chunky flask, teal liquid, rising bubbles */}
          <path
            d="M40 20 L40 40 L24 66 C21 72 25 78 32 78 L64 78 C71 78 75 72 72 66 L56 40 L56 20 Z"
            fill="#EAF7F8"
            stroke="#0D0D10"
            strokeWidth={3.2}
            strokeLinejoin="round"
          />
          <path
            d="M31 56 L65 56 L72 66 C75 72 71 78 64 78 L32 78 C25 78 21 72 24 66 Z"
            fill={`url(#sg-s-${subjectId})`}
          />
          <rect x={35} y={16} width={26} height={7} rx={3.5} fill="#0D0D10" />
          <circle cx={42} cy={66} r={3.4} fill="rgba(255,255,255,0.85)" />
          <circle cx={54} cy={70} r={2.4} fill="rgba(255,255,255,0.7)" />
          <circle cx={60} cy={44} r={4} fill="#2BC4D3" />
          <circle cx={68} cy={32} r={2.6} fill="#FFC93C" />
        </g>
      )}
      {sid === 'biology' && (
        <g opacity={o}>
          {/* a layered leaf with white veins, and a small golden-hearted cell */}
          <path
            d="M28 76 C 24 46 42 22 74 18 C 78 50 58 74 28 76 Z"
            fill={`url(#sg-b-${subjectId})`}
            stroke="#0D0D10"
            strokeWidth={3.2}
            strokeLinejoin="round"
          />
          <path
            d="M33 71 C 44 58 56 44 69 25"
            fill="none"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth={2.6}
            strokeLinecap="round"
          />
          <path
            d="M42 60 L 54 62 M50 50 L 62 50 M58 40 L 67 37"
            stroke="rgba(255,255,255,0.7)"
            strokeWidth={2.2}
            strokeLinecap="round"
          />
          <circle cx={68} cy={68} r={9} fill="#FFFFFF" stroke="#0D0D10" strokeWidth={2.6} />
          <circle cx={68} cy={68} r={3.6} fill="#FFC93C" stroke="#0D0D10" strokeWidth={1.6} />
        </g>
      )}
      {sid === 'cs' && (
        <g opacity={o}>
          {/* chunky code brackets on a magenta panel, a friendly golden cursor mid-line */}
          <rect x={16} y={24} width={64} height={48} rx={7} fill={`url(#sg-c-${subjectId})`} />
          <rect
            x={16}
            y={24}
            width={64}
            height={48}
            rx={7}
            fill="rgba(255,255,255,0.12)"
            transform="rotate(-6 48 48)"
          />
          <path
            d="M38 38 L28 48 L38 58"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={4.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M58 38 L68 48 L58 58"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={4.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect x={44.5} y={39} width={7} height={18} rx={1.5} fill="#FFC93C" />
          <rect
            x={44.5}
            y={39}
            width={7}
            height={18}
            rx={1.5}
            fill="none"
            stroke="#0D0D10"
            strokeWidth={2}
          />
        </g>
      )}
      {sid === 'social' && (
        <g opacity={o}>
          {/* a warm globe with bold meridians and a horizon flag */}
          <circle cx={46} cy={48} r={27} fill={`url(#sg-g-${subjectId})`} />
          <ellipse
            cx={46}
            cy={48}
            rx={12}
            ry={27}
            fill="none"
            stroke="rgba(255,255,255,0.75)"
            strokeWidth={2.6}
          />
          <path
            d="M20 48 L72 48 M23 36 L69 36 M23 60 L69 60"
            stroke="rgba(255,255,255,0.65)"
            strokeWidth={2.4}
            strokeLinecap="round"
          />
          <circle cx={46} cy={48} r={27} fill="none" stroke="#0D0D10" strokeWidth={3.2} />
          <path
            d="M72 26 L72 14 L84 17.5 L72 21"
            fill="#CC1E7A"
            stroke="#0D0D10"
            strokeWidth={2.2}
            strokeLinejoin="round"
          />
          <line
            x1={72}
            y1={14}
            x2={72}
            y2={34}
            stroke="#0D0D10"
            strokeWidth={2.6}
            strokeLinecap="round"
          />
        </g>
      )}
      {!['math', 'physics', 'chemistry', 'science', 'biology', 'cs', 'social'].includes(
        subjectId,
      ) && <circle cx={48} cy={48} r={26} fill={`url(#sg-m-${subjectId})`} />}
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
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="presentation"
      aria-hidden
      style={{ display: 'block' }}
    >
      <line x1={0} y1={cy} x2={width} y2={cy} stroke={INK_FAINT} strokeWidth={0.8} />
      {marks.map((m) =>
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
export function EmptyConstellation({
  size = 140,
  label,
  hue = ULTRA,
}: {
  size?: number;
  label?: string;
  hue?: string;
}) {
  const stars: [number, number, number][] = [
    [30, 84, 2],
    [58, 40, 2.6],
    [86, 66, 1.8],
    [110, 30, 2.2],
    [76, 104, 1.6],
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <svg
        viewBox="0 0 140 140"
        width={size}
        height={size}
        role="presentation"
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
            fill={i === 1 ? hue : INK_SOFT}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{
              duration: 3.4 + i * 0.6,
              repeat: Number.POSITIVE_INFINITY,
              ease: 'easeInOut',
            }}
          />
        ))}
      </svg>
      {label && <div style={{ color: 'var(--wobo-ink-500)', fontSize: '0.88rem' }}>{label}</div>}
    </div>
  );
}

/** The boss sigil — the topic's own geometry, set in a ring, worthy of a final door. */
export function BossSigil({
  id,
  size = 96,
  mastered = false,
  hue = ULTRA,
}: {
  id: string;
  size?: number;
  /** Once the topic is mastered, the ring ignites in the subject's hue. */
  mastered?: boolean;
  hue?: string;
}) {
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        role="presentation"
        aria-hidden
        style={{ position: 'absolute', inset: 0 }}
      >
        <motion.circle
          cx={32}
          cy={32}
          r={30}
          fill="none"
          stroke={mastered ? hue : INK_SOFT}
          strokeWidth={1}
          strokeDasharray="3 5"
          animate={mastered ? { rotate: 360 } : undefined}
          transition={
            mastered
              ? { duration: 60, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }
              : undefined
          }
          style={{ transformOrigin: '32px 32px' }}
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
        <TopicSigil id={id} size={size * 0.72} mastered={mastered} hue={hue} />
      </div>
    </div>
  );
}
