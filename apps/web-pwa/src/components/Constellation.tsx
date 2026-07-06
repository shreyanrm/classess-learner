'use client';

/**
 * The constellation — the learner's mind made visible. Mastered concepts carry their earned colour
 * and glow; everything ahead is monochrome. Edges are the prerequisite wiring; when a concept ignites,
 * light has travelled down these wires to what it unlocked. This is the brand thesis as a picture.
 *
 * Two variants: `peek` (small, calm, non-interactive — for Today) and `full` (labelled, tappable — for
 * Progress). Depth is glow and tone, never a shadow.
 */

import {
  accent as accents,
  canvas,
  hairline,
  ink,
  radius,
  space,
  typeScale,
} from '@classess/config';
import { useReducedMotion } from '@classess/motion';
import type { Band } from '@classess/ui';
import { motion } from 'framer-motion';
import { nodes as allNodes, carriesColor, isLocked, type MapNode, subject } from '../mock/appData';

const HUE = accents[subject.accent];

/** Radius of a node dot, by how far along the learner is. */
function dotRadius(band: Band): number {
  if (band === 'independent') return 3.4;
  if (band === 'secure') return 3.0;
  if (band === 'developing' || band === 'emerging') return 2.6;
  return 2.2;
}

function dotFill(node: MapNode): string {
  if (node.band === 'independent') return HUE;
  if (node.band === 'secure') return HUE;
  if (node.band === 'developing') return ink[500];
  if (node.band === 'emerging') return ink[300];
  return canvas;
}

function dotStroke(node: MapNode): string {
  if (carriesColor(node.band)) return HUE;
  if (isLocked(node)) return ink[100];
  return ink[300];
}

export interface ConstellationProps {
  variant?: 'peek' | 'full';
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Highlight the node the learner is currently on. */
  currentId?: string;
}

export function Constellation({
  variant = 'full',
  selectedId = null,
  onSelect,
  currentId,
}: ConstellationProps) {
  const reduced = useReducedMotion();
  const interactive = variant === 'full';
  const height = variant === 'peek' ? 150 : 360;

  return (
    <svg
      viewBox="0 0 100 80"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Your learning map — ${allNodes.filter((n) => n.band === 'independent').length} concepts mastered`}
      style={{ width: '100%', height, display: 'block', touchAction: 'manipulation' }}
    >
      <title>Your learning constellation</title>

      {/* Prerequisite wiring — brighter when both ends have earned colour (light has travelled it). */}
      {allNodes.flatMap((node) =>
        node.prereqIds.map((pid) => {
          const from = allNodes.find((n) => n.id === pid);
          if (!from) return null;
          const lit = carriesColor(from.band) && carriesColor(node.band);
          return (
            <line
              key={`${pid}-${node.id}`}
              x1={from.x * 100}
              y1={from.y * 80}
              x2={node.x * 100}
              y2={node.y * 80}
              stroke={lit ? HUE : hairline.onPaper}
              strokeWidth={lit ? 0.5 : 0.35}
              strokeOpacity={lit ? 0.55 : 1}
            />
          );
        }),
      )}

      {/* Nodes */}
      {allNodes.map((node, i) => {
        const cx = node.x * 100;
        const cy = node.y * 80;
        const r = dotRadius(node.band);
        const colored = carriesColor(node.band);
        const selected = node.id === selectedId;
        const isCurrent = node.id === currentId;

        return (
          <motion.g
            key={node.id}
            style={{ cursor: interactive && onSelect ? 'pointer' : 'default' }}
            onClick={interactive && onSelect ? () => onSelect(node.id) : undefined}
            initial={reduced ? false : { opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={
              reduced ? { duration: 0 } : { delay: i * 0.04, duration: 0.4, ease: [0, 0, 0, 1] }
            }
          >
            {/* Earned-colour glow — depth from light, not shadow. */}
            {colored && <circle cx={cx} cy={cy} r={r * 2.6} fill={HUE} opacity={0.14} />}
            {/* The current node breathes a soft ring. */}
            {isCurrent && (
              <motion.circle
                cx={cx}
                cy={cy}
                r={r + 1.8}
                fill="none"
                stroke={ink[500]}
                strokeWidth={0.4}
                animate={
                  reduced ? {} : { opacity: [0.3, 0.7, 0.3], r: [r + 1.6, r + 2.4, r + 1.6] }
                }
                transition={
                  reduced
                    ? { duration: 0 }
                    : { duration: 3, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }
                }
              />
            )}
            {selected && (
              <circle
                cx={cx}
                cy={cy}
                r={r + 2.4}
                fill="none"
                stroke={colored ? HUE : ink[700]}
                strokeWidth={0.5}
              />
            )}
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill={dotFill(node)}
              stroke={dotStroke(node)}
              strokeWidth={0.5}
            />
          </motion.g>
        );
      })}
    </svg>
  );
}

/** A compact legend for the full map — meaning never rides on colour alone (shape + words too). */
export function ConstellationLegend() {
  const item = (dot: React.ReactNode, label: string) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: space.half }}>
      {dot}
      <span style={{ fontSize: typeScale.caption.size, color: ink[500] }}>{label}</span>
    </span>
  );
  const dot = (fill: string, stroke: string) => (
    <span
      style={{
        width: 10,
        height: 10,
        borderRadius: radius.jelly,
        background: fill,
        border: `1px solid ${stroke}`,
      }}
    />
  );
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: space[2] }}>
      {item(dot(HUE, HUE), 'Mastered')}
      {item(dot(ink[500], ink[500]), 'In progress')}
      {item(dot(canvas, ink[300]), 'Ahead')}
      {item(dot(canvas, ink[100]), 'Locked')}
    </div>
  );
}
