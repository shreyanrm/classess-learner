'use client';

import { hairline, ink } from '@classess/config';
import { motion } from 'framer-motion';
import {
  type ConstellationEdge,
  type ConstellationRank,
  constellationOrder,
} from './internal/constellation';
import { EASE, SEC } from './motion-tokens';
import { useReducedMotion } from './use-reduced-motion';

export type { ConstellationEdge, ConstellationRank };

export interface ConstellationNode {
  id: string;
  /** Position in the same coordinate space as `width`/`height`. */
  x: number;
  y: number;
  /** The color this node ignites into. Omit to keep it monochrome (color is earned). */
  accent?: string;
}

export interface ConstellationIgniteProps {
  nodes: ConstellationNode[];
  /** Prerequisite edges: light travels from `from` (prerequisite) to `to` (unlocked). */
  edges: ConstellationEdge[];
  /** The just-mastered node(s) the light starts from. */
  source: string | string[];
  /** Coordinate space of the node positions. */
  width: number;
  height: number;
  /** Default accent for nodes without their own. Omit to keep unassigned nodes monochrome. */
  accent?: string;
  nodeRadius?: number;
  /** Milliseconds between successive prerequisite rings. */
  stepMs?: number;
  onComplete?: () => void;
  className?: string;
  style?: import('react').CSSProperties;
}

/**
 * constellation-ignite — the second signature. When a node is mastered, light travels along the
 * prerequisite graph: unlocked nodes pulse and brighten from monochrome to their accent in staggered
 * rings (BFS depth), and the edges between them draw in as the light passes. The "my mind is wiring
 * up" moment.
 *
 * Calm equivalent: nodes fade to color in the same ring order (no size pulse), edges appear already
 * drawn (no travelling stroke).
 */
export function ConstellationIgnite({
  nodes,
  edges,
  source,
  width,
  height,
  accent,
  nodeRadius = 6,
  stepMs = 140,
  onComplete,
  className,
  style,
}: ConstellationIgniteProps) {
  const reduced = useReducedMotion();
  const sources = Array.isArray(source) ? source : [source];

  const ranks = constellationOrder(
    nodes.map((n) => n.id),
    edges,
    sources,
  );
  const depthOf = new Map(ranks.map((r) => [r.id, r.depth]));
  const positionOf = new Map(nodes.map((n) => [n.id, n]));
  const step = stepMs / 1000;

  // The deepest reachable node fires onComplete when its ignite settles.
  const reachable = ranks.filter((r) => Number.isFinite(r.depth));
  const lastId = reachable.length ? reachable[reachable.length - 1]?.id : undefined;

  const coldFill = ink[300];

  return (
    <svg
      className={className}
      style={style}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Concept map lighting up along its prerequisites"
    >
      {edges.map((edge) => {
        const a = positionOf.get(edge.from);
        const b = positionOf.get(edge.to);
        if (!a || !b) return null;
        const fromDepth = depthOf.get(edge.from) ?? Number.POSITIVE_INFINITY;
        const lit = Number.isFinite(fromDepth);
        const litColor = positionOf.get(edge.to)?.accent ?? accent ?? ink[700];
        const delay = lit ? (fromDepth + 0.5) * step : 0;
        const key = `${edge.from}->${edge.to}`;
        return (
          <g key={key}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={hairline.onPaper} strokeWidth={1} />
            {lit && (
              <motion.line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={litColor}
                strokeWidth={1.5}
                strokeLinecap="round"
                initial={{ pathLength: reduced ? 1 : 0, opacity: reduced ? 0 : 1 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={
                  reduced
                    ? { opacity: { duration: SEC.micro, delay } }
                    : { pathLength: { duration: SEC.standard, ease: EASE.decelerate, delay } }
                }
              />
            )}
          </g>
        );
      })}

      {nodes.map((node) => {
        const depth = depthOf.get(node.id) ?? Number.POSITIVE_INFINITY;
        const lit = Number.isFinite(depth);
        const litFill = node.accent ?? accent ?? ink[700];
        const delay = lit ? depth * step : 0;
        const isLast = node.id === lastId;
        return (
          <motion.circle
            key={node.id}
            cx={node.x}
            cy={node.y}
            initial={{ fill: coldFill, r: nodeRadius }}
            animate={
              lit
                ? reduced
                  ? { fill: litFill, r: nodeRadius }
                  : { fill: litFill, r: [nodeRadius, nodeRadius * 1.3, nodeRadius] }
                : { fill: coldFill, r: nodeRadius }
            }
            transition={
              reduced
                ? { fill: { duration: SEC.standard, ease: EASE.standard, delay } }
                : { duration: SEC.standard, ease: EASE.emphasized, delay }
            }
            onAnimationComplete={() => {
              if (lit && isLast) onComplete?.();
            }}
          />
        );
      })}
    </svg>
  );
}
