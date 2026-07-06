'use client';

/**
 * Mystery lesson (DESIGN.md §9, beyond syllabus) — hidden, optional, discovered not assigned.
 * The mathematics of juggling: siteswap notation and the average theorem, with one live toy.
 * Every claim here is standard, verifiable mathematics — nothing decorative, nothing invented.
 */

import { useRegisterTarget, useVidyaBus } from '@classess/vidya';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { BarState } from './shared';
import { CardBody, cardTitle, lead, Scrubber, whisper } from './shared';

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
      primary: { label: 'open it', onClick: onOpen },
      secondary: { label: 'done', onClick: onSkip },
    });
  }, [setBar, onOpen, onSkip]);

  return (
    <CardBody maxWidth={520}>
      <div style={{ textAlign: 'center' }}>
        <div style={whisper}>something hidden unlocked</div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.2, 0, 0, 1] }}
          style={{ ...cardTitle, marginTop: 14 }}
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
        border: '0.5px solid var(--clss-hairline-on-paper-strong)',
        borderRadius: 'var(--clss-radius-md)',
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
        <span style={{ ...whisper, fontWeight: 500 }}>drag the throw</span>
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
    setBar({ primary: { label: 'done', onClick: onDone } });
  }, [setBar, onDone]);

  return (
    <CardBody maxWidth={560} center={false}>
      <div style={whisper}>mystery lesson · out of syllabus, in on the secret</div>
      <div style={cardTitle}>the mathematics of juggling</div>

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
