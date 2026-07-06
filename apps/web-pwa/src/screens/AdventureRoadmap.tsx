'use client';

/**
 * The adventure roadmap — a subject's chapters as one continuous journey (owner directive).
 * Each chapter is a BIOME with its own weather (forest → snow → ember → ocean → night → …),
 * strung along a trail that winds down the page stop by stop. The stretch already travelled is
 * inked; the road ahead waits as a faint dashed thread. The current chapter is marked with life:
 * a breathing halo and a "you are here" pin. All pure SVG, white canvas, DESIGN.md law — the
 * biomes carry the colour, the chrome stays quiet.
 */

import { motion, useReducedMotion } from 'framer-motion';
import type { Chapter } from '../data/model';
import { useRouter } from '../shell/router';
import { useProgress } from '../store/progress';
import { biomeFor, biomeRng } from '../ui/biomes';
import type { SubjectTone } from '../ui/hues';

type Intent = 'learn' | 'practice';

interface Stop {
  chapter: Chapter;
  tone: SubjectTone;
  x: number; // 0..100, percent across the field
  y: number; // px down the field
  done: number;
  total: number;
  complete: boolean;
}

const TOP = 78;
const STEP = 150;
const X_LEFT = 26;
const X_RIGHT = 74;
const MEDALLION = 92;

/** The biome medallion — a place seen through a porthole, ringed by its own progress. */
function Medallion({ chapter, tone, done, total }: Omit<Stop, 'x' | 'y' | 'complete'>) {
  const biome = biomeFor(chapter.id);
  const rand = biomeRng(chapter.id);
  const frac = total > 0 ? done / total : 0;
  const R = 44;
  const circ = 2 * Math.PI * R;
  const gid = `sky-${chapter.id}`;
  const cid = `clip-${chapter.id}`;
  return (
    <svg
      width={MEDALLION}
      height={MEDALLION}
      viewBox="0 0 100 100"
      role="presentation"
      aria-hidden
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={biome.sky[0]} />
          <stop offset="100%" stopColor={biome.sky[1]} />
        </linearGradient>
        <clipPath id={cid}>
          <circle cx={50} cy={50} r={R} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${cid})`}>
        <rect x={0} y={0} width={100} height={100} fill={`url(#${gid})`} />
        {biome.draw(rand)}
      </g>
      {/* the porthole rim */}
      <circle cx={50} cy={50} r={R} fill="none" stroke="#FFFFFF" strokeWidth={3} />
      <circle
        cx={50}
        cy={50}
        r={R}
        fill="none"
        stroke="var(--clss-hairline-on-paper-strong)"
        strokeWidth={1}
      />
      {/* the progress ring — the earned arc in the subject's hue */}
      {frac > 0 && (
        <circle
          cx={50}
          cy={50}
          r={R}
          fill="none"
          stroke={tone.hue}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={`${frac * circ} ${circ}`}
          transform="rotate(-90 50 50)"
        />
      )}
    </svg>
  );
}

function StopNode({ stop, intent, current }: { stop: Stop; intent: Intent; current: boolean }) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const { chapter, tone, x, y, done, total, complete } = stop;
  const biome = biomeFor(chapter.id);
  const leftCol = x < 50;

  // enter the biome: land on the next uncleared stop (resume), else its first, else compose
  const open = () => {
    const resumeIdx = total > 0 ? Math.min(done, total - 1) : 0;
    const topicId = chapter.topics[resumeIdx]?.id ?? chapter.topics[0]?.id ?? chapter.id;
    router.navigate(
      intent === 'practice' ? { name: 'sandbox', topicId } : { name: 'course', topicId },
    );
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: y,
        left: `${x}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* the label — points toward the centre of the page */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          transform: 'translateY(-50%)',
          ...(leftCol ? { left: MEDALLION - 4 } : { right: MEDALLION - 4 }),
          width: 'clamp(120px, 32vw, 210px)',
          textAlign: leftCol ? 'left' : 'right',
          paddingLeft: leftCol ? 14 : 0,
          paddingRight: leftCol ? 0 : 14,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontSize: '0.66rem',
            fontWeight: 650,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: tone.hue,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {String(chapter.index).padStart(2, '0')} · {biome.name}
        </div>
        <div
          style={{
            marginTop: 3,
            fontSize: '1.02rem',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            lineHeight: 1.2,
            color: 'var(--clss-ink-900)',
          }}
        >
          {chapter.name}
        </div>
        <div style={{ marginTop: 4, fontSize: '0.78rem', color: 'var(--clss-ink-500)' }}>
          {total === 0
            ? 'Vidya composes this one'
            : complete
              ? 'every stop cleared'
              : done > 0
                ? `${done} of ${total} cleared`
                : `${total} stops`}
        </div>
      </div>

      {/* the current place breathes — a halo of life */}
      {current && !reduced && (
        <motion.span
          aria-hidden
          animate={{ scale: [1, 1.16, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2.6, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            inset: -6,
            borderRadius: '50%',
            border: `2px solid ${biome.accent}`,
            pointerEvents: 'none',
          }}
        />
      )}

      <motion.button
        type="button"
        onClick={open}
        whileHover={{ scale: 1.06, y: -2 }}
        whileTap={{ scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 380, damping: 24 }}
        aria-label={`${chapter.name} — ${biome.name}${current ? ', you are here' : ''}`}
        style={{
          position: 'relative',
          width: MEDALLION,
          height: MEDALLION,
          padding: 0,
          border: 'none',
          borderRadius: '50%',
          background: 'transparent',
          cursor: 'pointer',
          display: 'block',
          zIndex: 2,
        }}
      >
        <Medallion chapter={chapter} tone={tone} done={done} total={total} />
        {complete && (
          <span
            aria-hidden
            style={{
              position: 'absolute',
              right: 2,
              bottom: 2,
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: tone.hue,
              border: '2px solid var(--clss-card)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" role="presentation" aria-hidden>
              <path
                d="M2.5 6.4 L4.9 9 L9.6 3.4"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        )}
      </motion.button>

      {/* you are here — a small caveat pin above the current place */}
      {current && (
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24, delay: 0.2 }}
          style={{
            position: 'absolute',
            bottom: MEDALLION - 8,
            left: '50%',
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap',
            padding: '3px 10px',
            borderRadius: 3,
            background: biome.accent,
            color: '#FFFFFF',
            fontSize: '0.72rem',
            fontWeight: 650,
            pointerEvents: 'none',
          }}
        >
          you are here
        </motion.div>
      )}
    </div>
  );
}

export function AdventureRoadmap({
  chapters,
  intent,
}: {
  chapters: { chapter: Chapter; tone: SubjectTone }[];
  intent: Intent;
}) {
  const { completed } = useProgress();

  const stops: Stop[] = chapters.map(({ chapter, tone }, i) => {
    const total = chapter.topics.length;
    const done = chapter.topics.filter((t) => completed.has(t.id)).length;
    return {
      chapter,
      tone,
      x: i % 2 === 0 ? X_LEFT : X_RIGHT,
      y: TOP + i * STEP,
      done,
      total,
      complete: total > 0 && done === total,
    };
  });

  // the first place not yet cleared is where you stand; all cleared → you've arrived at the last
  const currentIdx = (() => {
    const idx = stops.findIndex((s) => !s.complete);
    return idx === -1 ? stops.length - 1 : idx;
  })();

  const fieldH = TOP + (stops.length - 1) * STEP + TOP;

  return (
    <div style={{ position: 'relative', width: '100%', height: fieldH }}>
      {/* the trail — inked where travelled, faint and dashed on the road ahead */}
      <svg
        role="presentation"
        aria-hidden
        viewBox={`0 0 100 ${fieldH}`}
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        {stops.slice(1).map((s, i) => {
          const a = stops[i] as Stop;
          const b = s;
          const midY = (a.y + b.y) / 2;
          const d = `M ${a.x} ${a.y} C ${a.x} ${midY}, ${b.x} ${midY}, ${b.x} ${b.y}`;
          const travelled = i + 1 <= currentIdx;
          return (
            <path
              key={`trail-${b.chapter.id}`}
              d={d}
              fill="none"
              stroke={travelled ? 'var(--clss-ink-500)' : 'var(--clss-ink-100)'}
              strokeWidth={travelled ? 2.5 : 2}
              strokeLinecap="round"
              strokeDasharray={travelled ? undefined : '2 7'}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>

      {stops.map((stop, i) => (
        <StopNode key={stop.chapter.id} stop={stop} intent={intent} current={i === currentIdx} />
      ))}
    </div>
  );
}
