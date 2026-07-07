'use client';

/**
 * Mystery lesson (DESIGN.md §9, beyond syllabus) — hidden, optional, discovered not assigned.
 * The mathematics of juggling: siteswap notation and the average theorem, with one live toy.
 * Every claim here is standard, verifiable mathematics — nothing decorative, nothing invented.
 */

import { useRegisterTarget, useVidyaBus } from '@classess/vidya';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Sage } from '../../ui/cast';
import type { BarState } from './shared';
import { CardBody, cardTitle, GOLD, lead, Scrubber, Stage, whisper } from './shared';

/** The day sky — stars, a constellation tracing three juggled arcs, one golden star. */
function DaySky() {
  const stars: [number, number, number][] = [
    [40, 40, 1.6],
    [90, 96, 1.2],
    [150, 30, 1.8],
    [210, 110, 1.3],
    [265, 52, 1.5],
    [330, 100, 1.2],
    [370, 36, 1.7],
    [300, 24, 1.1],
    [120, 130, 1.2],
    [250, 140, 1.4],
  ];
  // the constellation — three balls mid-cascade, joined
  const constellation: [number, number][] = [
    [130, 92],
    [172, 56],
    [214, 44],
    [256, 56],
    [298, 92],
  ];
  const path = constellation.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
  return (
    <svg
      viewBox="0 0 420 170"
      role="presentation"
      aria-hidden
      style={{ width: '100%', height: '100%', display: 'block', position: 'absolute', inset: 0 }}
      preserveAspectRatio="xMidYMid slice"
    >
      {stars.map(([x, y, r], i) => (
        <motion.circle
          key={`st-${x}-${y}`}
          cx={x}
          cy={y}
          r={r}
          fill="rgba(31,53,224,0.45)"
          animate={{ opacity: [0.3, 0.9, 0.3] }}
          transition={{
            duration: 2.8 + (i % 4) * 0.9,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'easeInOut',
            delay: i * 0.35,
          }}
        />
      ))}
      <motion.path
        d={path}
        fill="none"
        stroke="rgba(31,53,224,0.3)"
        strokeWidth={1}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.6, ease: [0.2, 0, 0.2, 1], delay: 0.4 }}
      />
      {constellation.map(([x, y], i) => (
        <motion.circle
          key={`cn-${x}-${y}`}
          cx={x}
          cy={y}
          r={i === 2 ? 4 : 2.4}
          fill={i === 2 ? GOLD : 'var(--clss-ultramarine)'}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.5 + i * 0.22 }}
        />
      ))}
    </svg>
  );
}

export function MysteryTease({
  setBar,
  onOpen,
  onSkip,
}: {
  setBar: (b: BarState | null) => void;
  onOpen: () => void;
  onSkip: () => void;
}) {
  useEffect(() => {
    setBar({
      primary: { label: 'Open it', onClick: onOpen },
      secondary: { label: 'Done', onClick: onSkip },
    });
  }, [setBar, onOpen, onSkip]);

  return (
    <CardBody maxWidth={620}>
      {/* the day sky — a hidden door, discovered not assigned */}
      <Stage
        minHeight={300}
        style={{
          background:
            'radial-gradient(70% 60% at 30% 20%, rgba(49,72,255,0.12), transparent 65%), linear-gradient(165deg, var(--clss-card) 0%, #F3F4FC 55%, #EDEFFA 100%)',
          border: '1px solid var(--clss-card-border)',
          justifyContent: 'flex-end',
          padding: '0 0 26px',
        }}
      >
        <DaySky />
        {/* Sage keeps watch over hidden doors — owls always know first */}
        <motion.div
          aria-hidden
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 230, damping: 24, delay: 0.7 }}
          style={{ position: 'absolute', left: 22, bottom: 10 }}
        >
          <Sage size={64} mood="curious" />
        </motion.div>
        <div style={{ ...whisper, position: 'relative' }}>Something hidden unlocked</div>
      </Stage>
      <div style={{ textAlign: 'center' }}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.2, 0, 0, 1] }}
          style={{ ...cardTitle, fontSize: 'clamp(1.6rem, 5vw, 2rem)' }}
        >
          the mathematics of juggling
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          style={{ ...lead, marginTop: 12 }}
        >
          not on any syllabus. found only by finishing. two minutes, purely for the joy of it.
        </motion.div>
      </div>
    </CardBody>
  );
}

/** The toy: one throw, drawn honestly — a throw numbered n lands n beats later. */
function ThrowToy() {
  const bus = useVidyaBus();
  const [n, setN] = useState(3);
  const toyRef = useRegisterTarget<HTMLDivElement>('course-mystery-toy', {
    kind: 'sim',
    label: 'the juggling throw toy — a draggable throw number and its arc over the beats',
  });

  useEffect(() => {
    bus.publishCanvas({
      nodeId: 'mystery-juggling',
      equation: `throw = ${n}`,
      steps: [
        `the toy shows a single juggling throw numbered ${n}`,
        `thrown on beat 0, it lands on beat ${n}`,
        'the learner is exploring siteswap notation',
      ],
      lastEditedAt: new Date().toISOString(),
    });
  }, [bus, n]);

  const spacing = 40;
  const x0 = 20;
  const y = 118;
  const xn = x0 + n * spacing;
  const peak = y - 14 - n * 10;
  const d = `M ${x0} ${y} Q ${(x0 + xn) / 2} ${peak} ${xn} ${y}`;

  return (
    <div
      ref={toyRef}
      style={{
        background: 'rgba(31,53,224,0.05)',
        borderRadius: 3,
        padding: '18px 20px 10px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 10,
          fontSize: '1.15rem',
          fontWeight: 550,
          color: 'var(--clss-ink-900)',
        }}
      >
        <span style={{ ...whisper, fontWeight: 500 }}>Drag the throw</span>
        <Scrubber value={n} min={1} max={9} onChange={setN} label="throw number" />
      </div>
      <svg
        viewBox="0 0 400 140"
        role="img"
        aria-label={`a throw numbered ${n} landing ${n} beats later`}
        style={{ width: '100%', display: 'block' }}
      >
        {/* the beats */}
        <line
          x1={x0}
          y1={y}
          x2={x0 + 9 * spacing}
          y2={y}
          stroke="var(--clss-ink-100)"
          strokeWidth={1}
        />
        {Array.from({ length: 10 }, (_, i) => (
          <circle
            // biome-ignore lint/suspicious/noArrayIndexKey: beats are positional
            key={i}
            cx={x0 + i * spacing}
            cy={y}
            r={i === 0 || i === n ? 5 : 3}
            fill={i === 0 || i === n ? 'var(--clss-ink-900)' : 'var(--clss-paper)'}
            stroke={i <= n ? 'var(--clss-ink-900)' : 'var(--clss-ink-300)'}
            strokeWidth={1}
          />
        ))}
        {/* the arc */}
        <motion.path
          animate={{ d }}
          transition={{ type: 'spring', stiffness: 220, damping: 26 }}
          d={d}
          fill="none"
          stroke="var(--clss-ink-900)"
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />
      </svg>
      <div style={{ fontSize: '0.88rem', color: 'var(--clss-ink-700)', paddingBottom: 8 }}>
        thrown on beat 0, it lands on beat {n} — jugglers simply call this throw “a {n}”.
      </div>
    </div>
  );
}

export function MysteryLesson({
  setBar,
  onDone,
}: {
  setBar: (b: BarState | null) => void;
  onDone: () => void;
}) {
  const bus = useVidyaBus();
  useEffect(() => () => bus.publishCanvas(undefined), [bus]);
  useEffect(() => {
    setBar({ primary: { label: 'Done', onClick: onDone } });
  }, [setBar, onDone]);

  return (
    <CardBody maxWidth={560} center={false}>
      <div style={whisper}>Mystery lesson · out of syllabus, in on the secret</div>
      <div style={cardTitle}>The mathematics of juggling</div>

      <div style={lead}>
        jugglers write their patterns as numbers. each throw is named by how many beats it stays in
        the air: a 3 is the gentle arc of the basic three-ball cascade, a 5 flies high, a 1 is a
        quick pass straight across. the everyday cascade, written out, is just 3 3 3 3 — a rhythm,
        the same move for ever.
      </div>

      <ThrowToy />

      <div style={lead}>
        here is the theorem hiding inside: average the numbers and you get the number of balls. the
        pattern 4 4 1 averages (4 + 4 + 1) / 3 = 3, and it is a real three-ball trick. but 5 4 3
        also averages 4 and is impossible — two balls would land on the same beat. the average has
        to balance, and balancing is exactly what you spent this whole course doing. an equation is
        a juggle where nothing is allowed to drop.
      </div>
    </CardBody>
  );
}
