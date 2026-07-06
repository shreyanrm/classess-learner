'use client';

/**
 * The living constellation — the knowledge twin as hero art (DESIGN.md §11). Stars are concepts;
 * hairlines are the prerequisite graph. Independent mastery fills a star ultramarine inside a soft
 * wash halo; guided mastery is an ultramarine ring, unfilled — the visible difference between
 * "can do alone" and "can do with help". Stars breathe, one mote drifts, and a newly earned star
 * replays its ignite once: it catches light and its edges illuminate outward.
 */

import { motion, useReducedMotion } from 'framer-motion';
import {
  EDGES,
  FAR_STARS,
  STARS,
  type Star,
  type StarState,
  starById,
  VIEW_H,
  VIEW_W,
} from './twin-data';

const ULTRAMARINE = 'var(--clss-ultramarine)';

/** Pull a prerequisite line's endpoints in so it meets the star's halo, not its centre. */
function trimmed(from: Star, to: Star, by = 14) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < by * 2 + 4) return { x1: from.x, y1: from.y, x2: to.x, y2: to.y };
  const ux = dx / len;
  const uy = dy / len;
  return {
    x1: from.x + ux * by,
    y1: from.y + uy * by,
    x2: to.x - ux * by,
    y2: to.y - uy * by,
  };
}

function StarCore({ star, state }: { star: Star; state: StarState }) {
  if (state === 'independent')
    return (
      <>
        <circle cx={star.x} cy={star.y} r={19} style={{ fill: 'url(#twin-halo)' }} />
        <circle cx={star.x} cy={star.y} r={4.5} style={{ fill: ULTRAMARINE }} />
      </>
    );
  if (state === 'supported')
    return (
      <circle
        cx={star.x}
        cy={star.y}
        r={4.5}
        style={{ fill: 'var(--clss-paper)', stroke: ULTRAMARINE, strokeWidth: 1.25 }}
      />
    );
  return <circle cx={star.x} cy={star.y} r={3} style={{ fill: 'var(--clss-ink-100)' }} />;
}

export function Constellation({
  states,
  ignited,
  selectedId,
  onSelect,
}: {
  states: Record<string, StarState>;
  /** Star ids replaying their ignite on this mount — newly completed since last visit. */
  ignited: ReadonlySet<string>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const reduced = useReducedMotion();

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height: '100%', display: 'block' }}
      aria-label="your knowledge constellation — every star is a concept"
    >
      <title>your knowledge constellation</title>
      <defs>
        <radialGradient id="twin-halo">
          <stop offset="0%" style={{ stopColor: ULTRAMARINE, stopOpacity: 0.22 }} />
          <stop offset="55%" style={{ stopColor: ULTRAMARINE, stopOpacity: 0.09 }} />
          <stop offset="100%" style={{ stopColor: ULTRAMARINE, stopOpacity: 0 }} />
        </radialGradient>
      </defs>

      {/* tap the sky to put the card away — pointer convenience; the card's close button is the accessible path */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: backdrop dismiss duplicates the card's accessible close button */}
      <rect
        x={0}
        y={0}
        width={VIEW_W}
        height={VIEW_H}
        fill="transparent"
        onClick={() => onSelect(null)}
      />

      {/* far stars — the chapters still to come (decorative, no accessible text) */}
      <g>
        {FAR_STARS.map((f) => (
          <circle key={f.id} cx={f.x} cy={f.y} r={1.6} style={{ fill: 'var(--clss-ink-100)' }} />
        ))}
      </g>

      {/* prerequisite lines */}
      <g>
        {EDGES.map((e) => {
          const t = trimmed(e.from, e.to);
          return (
            <line
              key={`${e.from.id}-${e.to.id}`}
              {...t}
              style={{ stroke: 'var(--clss-ink-100)' }}
              strokeWidth={0.5}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </g>

      {/* one faint drifting mote — the sky is alive even when nothing happens */}
      {!reduced && (
        <motion.circle
          cx={0}
          cy={150}
          r={1.4}
          style={{ fill: 'var(--clss-ink-300)' }}
          animate={{ x: [0, VIEW_W], y: [0, -36, 24, -14, 0], opacity: [0, 0.5, 0.5, 0.5, 0] }}
          transition={{ duration: 38, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
        />
      )}

      {/* the stars — breathing, staggered */}
      {STARS.map((star, i) => {
        const state = states[star.id] ?? 'unlit';
        const lit = state !== 'unlit';
        const selected = selectedId === star.id;
        const pick = () => onSelect(selected ? null : star.id);
        return (
          <motion.g
            key={star.id}
            role="button"
            tabIndex={0}
            aria-label={`${star.label} — ${BREATH_LABEL[state]}`}
            style={{ cursor: 'pointer', outline: 'none' }}
            animate={reduced ? undefined : { opacity: [0.85, 1, 0.85] }}
            transition={
              reduced
                ? undefined
                : {
                    duration: 4.8,
                    delay: i * 0.55,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: 'easeInOut',
                  }
            }
            onClick={(e) => {
              e.stopPropagation();
              pick();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                pick();
              }
            }}
          >
            {/* generous invisible hit area */}
            <circle cx={star.x} cy={star.y} r={18} fill="transparent" />
            {selected && (
              <circle
                cx={star.x}
                cy={star.y}
                r={10}
                style={{ fill: 'none', stroke: 'var(--clss-ink-300)', strokeWidth: 0.75 }}
                vectorEffect="non-scaling-stroke"
              />
            )}
            <StarCore star={star} state={state} />
            <text
              x={star.x}
              y={star.y + 24}
              textAnchor="middle"
              style={{
                fill: lit ? 'var(--clss-ink-700)' : 'var(--clss-ink-300)',
                fontSize: 11.5,
                fontFamily: 'inherit',
              }}
            >
              {star.label}
            </text>
          </motion.g>
        );
      })}

      {/* constellation-ignite — a newly earned star catches light, once, ~750ms */}
      {!reduced &&
        Array.from(ignited).map((id) => {
          const star = starById(id);
          if (!star) return null;
          const rays = EDGES.filter((e) => e.from.id === id || e.to.id === id);
          return (
            <g key={`ignite-${id}`} style={{ pointerEvents: 'none' }}>
              <motion.circle
                cx={star.x}
                cy={star.y}
                style={{ fill: 'none', stroke: ULTRAMARINE }}
                strokeWidth={1}
                initial={{ r: 4, opacity: 0.75 }}
                animate={{ r: 30, opacity: 0 }}
                transition={{ duration: 0.75, ease: 'easeOut' }}
              />
              {rays.map((e) => {
                const a = e.from.id === id ? e.from : e.to;
                const b = e.from.id === id ? e.to : e.from;
                return (
                  <motion.line
                    key={`ray-${e.from.id}-${e.to.id}`}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    style={{ stroke: ULTRAMARINE }}
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                    initial={{ pathLength: 0, opacity: 0.8 }}
                    animate={{ pathLength: 1, opacity: 0 }}
                    transition={{
                      pathLength: { duration: 0.45, ease: 'easeOut' },
                      opacity: { delay: 0.45, duration: 0.3 },
                    }}
                  />
                );
              })}
            </g>
          );
        })}
    </svg>
  );
}

const BREATH_LABEL: Record<StarState, string> = {
  independent: 'yours, independently',
  supported: 'yours, with guidance',
  unlit: 'not started',
};
