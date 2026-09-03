'use client';

/**
 * The course intro scene — every course opens on its own picture (owner directive: two courses
 * never open identically). The scene is derived deterministically from the topic id: the concept's
 * own sigil geometry (echoed huge and faint behind at a per-topic angle), and a bespoke generative
 * constellation — a fine-line lattice of nodes wired like a quiet circuit, drawn in the subject's
 * own hue with a couple of accent nodes. One generator, a distinct, dignified arrival for every
 * course. No stock characters, no clip-art props: course imagery must be relevant to the topic and
 * premium (owner law). White/paper canvas, 3px radius, low-alpha hue wash — DESIGN.md law.
 */

import { motion } from 'framer-motion';
import { hash, rng, TopicSigil } from './art';
import { usePointerTilt } from './kit';

/** `rgba()` from a hex hue — the wash, the glow, and the hue nodes need translucent stops. */
function rgba(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

const GOLD = '#FFC93C';
const FIELD_W = 400;
const FIELD_H = 300;

interface Node {
  x: number;
  y: number;
  r: number;
  kind: 'faint' | 'hue' | 'gold';
}
interface Edge {
  a: number;
  b: number;
  hot: boolean;
}

/** A seeded lattice for a topic — nodes placed off-centre (the sigil owns the core), then wired
 *  to nearest neighbours so it reads as an intelligent circuit rather than scattered dots. */
function buildField(topicId: string): { nodes: Node[]; edges: Edge[] } {
  const r = rng(hash(`field:${topicId}`));
  const cx = FIELD_W / 2;
  const cy = FIELD_H / 2;
  const count = 8 + Math.floor(r() * 4); // 8..11
  const nodes: Node[] = [];
  let guard = 0;
  while (nodes.length < count && guard < 500) {
    guard++;
    const x = 30 + r() * (FIELD_W - 60);
    const y = 26 + r() * (FIELD_H - 52);
    // keep an elliptical core clear so the sigil never fights the field
    const dx = x - cx;
    const dy = y - cy;
    if ((dx * dx) / (108 * 108) + (dy * dy) / (86 * 86) < 1) continue;
    nodes.push({ x, y, r: 1.5, kind: 'faint' });
  }

  // one golden accent + two hue accents (the view's single hit of pigment lives here)
  const pick = (): number => Math.floor(r() * nodes.length);
  const gold = pick();
  (nodes[gold] as Node).kind = 'gold';
  (nodes[gold] as Node).r = 2.8;
  let placed = 0;
  for (let g = 0; g < nodes.length && placed < 2; g++) {
    const i = (gold + 1 + g) % nodes.length;
    if (nodes[i]?.kind === 'faint') {
      (nodes[i] as Node).kind = 'hue';
      (nodes[i] as Node).r = 2.4;
      placed++;
    }
  }

  // wire each node to its nearest neighbour(s) — a mesh, not a cloud; drop the long ugly spans
  const edges: Edge[] = [];
  const seen = new Set<string>();
  nodes.forEach((n, i) => {
    const near = nodes
      .map((m, j) => ({ j, d: Math.hypot(m.x - n.x, m.y - n.y) }))
      .filter((e) => e.j !== i)
      .sort((p, q) => p.d - q.d)
      .slice(0, 2);
    for (const { j, d } of near) {
      if (d > 168) continue;
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ a: i, b: j, hot: nodes[i]?.kind !== 'faint' || nodes[j]?.kind !== 'faint' });
    }
  });

  return { nodes, edges };
}

function Constellation({ topicId, hue }: { topicId: string; hue: string }) {
  const { nodes, edges } = buildField(topicId);
  return (
    <svg
      viewBox={`0 0 ${FIELD_W} ${FIELD_H}`}
      preserveAspectRatio="xMidYMid slice"
      role="presentation"
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      {edges.map((e, i) => {
        const a = nodes[e.a] as Node;
        const b = nodes[e.b] as Node;
        return (
          <motion.line
            key={`${e.a}-${e.b}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={e.hot ? rgba(hue, 0.32) : 'var(--wobo-ink-100)'}
            strokeWidth={e.hot ? 1 : 0.8}
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.15 + i * 0.045, ease: [0.2, 0, 0, 1] }}
          />
        );
      })}
      {nodes.map((n, i) => {
        const fill = n.kind === 'gold' ? GOLD : n.kind === 'hue' ? hue : 'var(--wobo-ink-300)';
        const alive = n.kind !== 'faint';
        return (
          <motion.circle
            key={`${n.x.toFixed(1)}-${n.y.toFixed(1)}`}
            cx={n.x}
            cy={n.y}
            r={n.r}
            fill={fill}
            initial={{ scale: 0, opacity: 0 }}
            animate={alive ? { scale: 1, opacity: [0.6, 1, 0.6] } : { scale: 1, opacity: 0.85 }}
            transition={
              alive
                ? {
                    scale: { type: 'spring', stiffness: 300, damping: 20, delay: 0.5 + i * 0.05 },
                    opacity: {
                      duration: 3.6 + (i % 3),
                      repeat: Number.POSITIVE_INFINITY,
                      ease: 'easeInOut',
                    },
                  }
                : { type: 'spring', stiffness: 300, damping: 22, delay: 0.5 + i * 0.05 }
            }
            style={{ transformOrigin: `${n.x}px ${n.y}px` }}
          />
        );
      })}
    </svg>
  );
}

export function CourseIntroScene({
  topicId,
  hue,
  minHeight = 300,
  sigilSize = 132,
  bold = true,
}: {
  topicId: string;
  hue: string;
  minHeight?: number;
  sigilSize?: number;
  bold?: boolean;
}) {
  const r = rng(hash(`intro:${topicId}`));
  // hero pointer parallax (MOTION.md §1) — the field drifts behind the still sigil on desktop
  const tilt = usePointerTilt(8);
  // the sigil's huge faint echo — placed and turned uniquely per course
  const echoAngle = Math.round(r() * 360);
  const echoTop = r() > 0.5;
  const echoLeft = r() > 0.5;
  const echoSize = Math.round(minHeight * (0.9 + r() * 0.5));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      style={{
        position: 'relative',
        width: '100%',
        minHeight,
        borderRadius: 3,
        // a quiet hue wash, lifted by a soft central glow — premium, not a flat pink slab
        background: `radial-gradient(120% 90% at 50% 42%, ${rgba(hue, 0.09)} 0%, ${rgba(hue, 0.04)} 55%, transparent 100%)`,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* the sigil's own geometry, huge and faint — this course's watermark, turned uniquely */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          ...(echoTop ? { top: -echoSize * 0.28 } : { bottom: -echoSize * 0.28 }),
          ...(echoLeft ? { left: -echoSize * 0.22 } : { right: -echoSize * 0.22 }),
          opacity: 0.06,
          transform: `rotate(${echoAngle}deg)`,
          pointerEvents: 'none',
        }}
      >
        <TopicSigil id={topicId} size={echoSize} hue={hue} bold />
      </div>

      {/* the bespoke generative lattice — a quiet circuit in the subject's hue, on the sky plane */}
      <motion.div style={{ position: 'absolute', inset: 0, x: tilt.x, y: tilt.y }}>
        <Constellation topicId={topicId} hue={hue} />
      </motion.div>

      {/* the concept's sigil, drawing itself — the course's true identity, centred and alive */}
      <motion.div
        initial={{ scale: 0.92 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 230, damping: 26 }}
        style={{ position: 'relative' }}
      >
        <TopicSigil id={topicId} size={sigilSize} draw bold={bold} hue={hue} />
      </motion.div>
    </motion.div>
  );
}
