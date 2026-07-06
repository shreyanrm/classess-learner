'use client';

/**
 * The course intro scene — every course opens on its own picture (owner directive: two courses
 * never open identically). The scene is derived deterministically from the topic: the concept's
 * own sigil geometry (echoed huge and faint behind, at a per-topic angle), the subject's hue, and
 * a small cast + prop chosen and posed from the topic id. One generator, a distinct arrival for
 * every course. White canvas, 3px radius, hue wash — DESIGN.md law.
 */

import { motion } from 'framer-motion';
import { chapterById, topicById } from '../data/catalog';
import { hash, rng, TopicSigil } from './art';
import { type CastId, type PropId, Scene, type SceneItem } from './cast';

/** `rgba()` from a hex hue — the stage wash and motes need translucent stops. */
function rgba(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

const CASTS: CastId[] = ['pip', 'sage', 'sprout', 'volt', 'ember', 'pico', 'juni', 'torto'];
const MOODS = ['happy', 'curious', 'delighted', 'neutral'] as const;

/** The prop that belongs to a subject's world — a flask for chemistry, a planet for physics… */
const SUBJECT_PROP: Record<string, PropId> = {
  math: 'pencil',
  physics: 'planet',
  chemistry: 'beaker',
  science: 'beaker',
  biology: 'plant',
  cs: 'bulb',
  social: 'flag',
};

function subjectOf(topicId: string): string {
  const chapter = topicById(topicId)
    ? chapterById(topicById(topicId)?.chapterId ?? '')
    : chapterById(topicId);
  return chapter?.subjectId ?? 'math';
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
  // the sigil's huge faint echo — placed and turned uniquely per course
  const echoAngle = Math.round(r() * 360);
  const echoTop = r() > 0.5;
  const echoLeft = r() > 0.5;
  const echoSize = Math.round(minHeight * (0.9 + r() * 0.5));

  // a small world at the sigil's feet: two distinct buddies + the subject's own prop
  const a = Math.floor(r() * CASTS.length);
  let b = Math.floor(r() * CASTS.length);
  if (b === a) b = (b + 1 + Math.floor(r() * (CASTS.length - 1))) % CASTS.length;
  const cast1 = CASTS[a] as CastId;
  const cast2 = CASTS[b] as CastId;
  const prop = SUBJECT_PROP[subjectOf(topicId)] ?? 'books';
  const mood1 = MOODS[Math.floor(r() * MOODS.length)];
  const mood2 = MOODS[Math.floor(r() * MOODS.length)];
  const flip = r() > 0.5;
  // three plausible arrangements, chosen per topic
  const layout = Math.floor(r() * 3);
  const items: SceneItem[] =
    layout === 0
      ? [
          { id: prop, x: 0.16, size: 46 },
          { id: cast1, x: 0.34, size: 76, mood: mood1 },
          { id: cast2, x: 0.64, size: 66, mood: mood2, flip },
        ]
      : layout === 1
        ? [
            { id: cast1, x: 0.2, size: 72, mood: mood1 },
            { id: cast2, x: 0.46, size: 80, mood: mood2 },
            { id: prop, x: 0.78, size: 50 },
          ]
        : [
            { id: cast1, x: 0.24, size: 78, mood: mood1 },
            { id: prop, x: 0.5, size: 48 },
            { id: cast2, x: 0.76, size: 68, mood: mood2, flip },
          ];

  const motes = Array.from({ length: 4 }, (_, i) => ({
    id: `mote-${i}`,
    left: `${12 + Math.round(r() * 76)}%`,
    top: `${14 + Math.round(r() * 40)}%`,
    s: 3 + Math.round(r() * 4),
    dur: 6 + r() * 4,
    gold: i === 1,
  }));

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
        background: rgba(hue, 0.06),
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
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

      {/* slow hue motes — alive at rest */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {motes.map((m, i) => (
          <motion.span
            key={m.id}
            animate={{ y: [0, -13, 0], opacity: [0.3, 0.65, 0.3] }}
            transition={{
              duration: m.dur,
              repeat: Number.POSITIVE_INFINITY,
              ease: 'easeInOut',
              delay: i * 0.8,
            }}
            style={{
              position: 'absolute',
              left: m.left,
              top: m.top,
              width: m.s,
              height: m.s,
              borderRadius: 999,
              background: m.gold ? '#FFC93C' : rgba(hue, 0.5),
            }}
          />
        ))}
      </div>

      {/* the concept's sigil, drawing itself — lifted so its world sits at its feet */}
      <motion.div
        initial={{ scale: 0.92 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 230, damping: 26 }}
        style={{ position: 'relative', marginBottom: 44 }}
      >
        <TopicSigil id={topicId} size={sigilSize} draw bold={bold} hue={hue} />
      </motion.div>

      {/* the little world that greets this course */}
      <Scene
        items={items}
        height={116}
        hue={hue}
        wash={0}
        baseline={10}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          background: 'transparent',
          borderRadius: 0,
        }}
      />
    </motion.div>
  );
}
