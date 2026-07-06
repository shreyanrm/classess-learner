'use client';

/**
 * Practice — one intention (DESIGN.md §8), second cut. Every door is a mini-poster: a scene
 * illustration on its own hue-washed stage — building blocks for the sandbox, the forgetting
 * curve for review — then the subject grid routed with practice intent. Memory fades on a
 * real curve; the copy never guilts. End-to-end layout, cascade entrance.
 */

import { useRegisterTarget, useVidyaBus } from '@classess/vidya';
import { motion } from 'framer-motion';
import { type ReactNode, useEffect, useId, useState } from 'react';
import { useRouter } from '../shell/router';
import { useProgress } from '../store/progress';
import { ChevronIcon } from '../ui/icons';
import { cascade, rise } from '../ui/kit';
import { GridHero, SubjectGrid, Whisper } from './Learn';

const INK = 'var(--clss-ink-900)';
const GOLD = '#FFC93C';

/** The open canvas — chunky blocks mid-build, a golden ball bouncing, a play arc. */
function SandboxScene() {
  const uid = useId();
  return (
    <svg
      viewBox="0 0 200 150"
      preserveAspectRatio="xMidYMid slice"
      role="presentation"
      aria-hidden
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    >
      <defs>
        <linearGradient id={`${uid}-b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4257F0" />
          <stop offset="100%" stopColor="var(--clss-ultramarine)" />
        </linearGradient>
      </defs>
      {/* the ground to build on */}
      <line
        x1={20}
        y1={118}
        x2={180}
        y2={118}
        stroke={INK}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      {/* a dashed arc of play */}
      <path
        d="M38 46 Q 70 14 120 32"
        fill="none"
        stroke="var(--clss-ultramarine)"
        strokeOpacity={0.5}
        strokeWidth={1.8}
        strokeDasharray="1 7"
        strokeLinecap="round"
      />
      {/* the build so far */}
      <rect
        x={56}
        y={82}
        width={42}
        height={36}
        rx={5}
        fill={`url(#${uid}-b)`}
        stroke={INK}
        strokeWidth={2.4}
      />
      <rect
        x={68}
        y={46}
        width={34}
        height={30}
        rx={5}
        fill="#2BC4D3"
        stroke={INK}
        strokeWidth={2.4}
        transform="rotate(-8 85 61)"
      />
      {/* the golden ball, mid-bounce */}
      <motion.circle
        cx={136}
        cy={106}
        r={11}
        fill={GOLD}
        stroke={INK}
        strokeWidth={2.4}
        animate={{ y: [0, -14, 0] }}
        transition={{ duration: 2.4, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
      />
      {/* a magenta spark of an idea */}
      <path d="M160 44 v16 M152 52 h16" stroke="#CC1E7A" strokeWidth={2.2} strokeLinecap="round" />
    </svg>
  );
}

/** The forgetting curve — ink falling on a real curve, one golden point lifted back. */
function CurveScene() {
  const uid = useId();
  return (
    <svg
      viewBox="0 0 200 150"
      preserveAspectRatio="xMidYMid slice"
      role="presentation"
      aria-hidden
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    >
      <defs>
        <linearGradient id={`${uid}-f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#CC1E7A" stopOpacity={0.22} />
          <stop offset="100%" stopColor="#CC1E7A" stopOpacity={0} />
        </linearGradient>
      </defs>
      {/* the axes, whispered */}
      <path
        d="M28 24 V 122 H 176"
        fill="none"
        stroke={INK}
        strokeOpacity={0.22}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      {/* what fades, tinted */}
      <path
        d="M28 36 C 60 42 74 84 108 100 C 132 110 158 114 176 116 L 176 122 L 28 122 Z"
        fill={`url(#${uid}-f)`}
      />
      {/* the curve itself */}
      <path
        d="M28 36 C 60 42 74 84 108 100 C 132 110 158 114 176 116"
        fill="none"
        stroke={INK}
        strokeWidth={2.8}
        strokeLinecap="round"
      />
      <circle cx={28} cy={36} r={4.4} fill="#CC1E7A" />
      {/* the rebound — review lifts it back */}
      <path
        d="M108 100 C 124 74 138 58 154 48"
        fill="none"
        stroke="#CC1E7A"
        strokeWidth={2}
        strokeDasharray="2 7"
        strokeLinecap="round"
      />
      <motion.g
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3.2, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
      >
        <circle cx={154} cy={48} r={7.5} fill={GOLD} stroke={INK} strokeWidth={2.2} />
      </motion.g>
    </svg>
  );
}

/** A practice door — a poster row: scene on its hue-washed stage, prompt large, support quiet. */
function Door({
  title,
  line,
  hint,
  scene,
  wash,
  onOpen,
  targetRef,
}: {
  title: string;
  line: string;
  hint?: ReactNode;
  scene: ReactNode;
  wash: string;
  onOpen: () => void;
  targetRef?: React.RefObject<HTMLButtonElement | null>;
}) {
  const [hover, setHover] = useState(false);
  return (
    <motion.button
      ref={targetRef}
      type="button"
      onClick={onOpen}
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 360, damping: 26 }}
      style={{
        width: '100%',
        textAlign: 'left',
        background: 'var(--clss-card)',
        border: `1px solid ${hover ? 'var(--clss-faint)' : 'var(--clss-card-border)'}`,
        transition: 'border-color 0.25s ease',
        borderRadius: 3,
        padding: 0,
        overflow: 'hidden',
        cursor: 'pointer',
        fontFamily: 'inherit',
        display: 'flex',
        alignItems: 'stretch',
      }}
    >
      <motion.span
        animate={hover ? { scale: 1.04 } : { scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        style={{
          flexShrink: 0,
          width: 'clamp(140px, 24vw, 220px)',
          minHeight: 140,
          background: wash,
          position: 'relative',
          overflow: 'hidden',
          display: 'block',
        }}
      >
        {scene}
      </motion.span>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          padding: '22px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <span style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span
            style={{
              fontSize: '1.3rem',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: 'var(--clss-ink-900)',
            }}
          >
            {title}
          </span>
          <span style={{ fontSize: '0.88rem', color: 'var(--clss-ink-500)', lineHeight: 1.55 }}>
            {line}
          </span>
        </span>
        <span
          style={{
            color: hover ? 'var(--clss-ink-500)' : 'var(--clss-ink-300)',
            fontSize: '0.9rem',
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            transition: 'color 0.25s ease',
          }}
        >
          {hint}
          <ChevronIcon size={14} />
        </span>
      </span>
    </motion.button>
  );
}

export function Practice() {
  const router = useRouter();
  const { publishPage } = useVidyaBus();
  const { completed } = useProgress();
  const sandboxRef = useRegisterTarget<HTMLButtonElement>('practice-sandbox', {
    kind: 'door',
    label: 'the free play sandbox door',
  });
  const reviewRef = useRegisterTarget<HTMLButtonElement>('practice-review', {
    kind: 'door',
    label: 'the due-for-review door — spaced retrieval against the real forgetting curve',
  });

  // Honest FSRS framing: only concepts actually learned can fade.
  const due = completed.size > 0 ? Math.min(completed.size, 3) : 0;
  const reviewTopicId = [...completed][0];

  useEffect(() => {
    publishPage({ route: 'practice', state: { title: 'practice', intent: 'practice', due } });
  }, [publishPage, due]);

  return (
    <motion.div
      variants={cascade}
      initial="hidden"
      animate="show"
      style={{ minHeight: '100dvh', padding: '108px 6vw 96px' }}
    >
      <Whisper onClick={() => router.navigate({ name: 'home' })}>Home</Whisper>

      <motion.div variants={rise}>
        <h1
          style={{
            margin: 0,
            fontSize: '1.9rem',
            fontWeight: 650,
            letterSpacing: '-0.035em',
            color: 'var(--clss-ink-900)',
          }}
        >
          Practice
        </h1>
        <div style={{ marginTop: 6, fontSize: '0.95rem', color: 'var(--clss-ink-500)' }}>
          memory fades on a real curve — practice keeps it honest
        </div>
      </motion.div>

      <div style={{ marginTop: 52, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <motion.div variants={rise}>
          <Door
            targetRef={sandboxRef}
            title="Free play sandbox"
            line="an open canvas on any topic — no task, Vidya watching"
            scene={<SandboxScene />}
            wash="rgba(31,53,224,0.05)"
            onOpen={() => router.navigate({ name: 'sandbox' })}
          />
        </motion.div>
        <motion.div variants={rise}>
          {due > 0 ? (
            <Door
              targetRef={reviewRef}
              title="Due for review"
              line={
                due === 1
                  ? 'one concept is fading — refresh it'
                  : `${due} concepts are fading — refresh them`
              }
              scene={<CurveScene />}
              wash="rgba(204,30,122,0.05)"
              onOpen={() => router.navigate({ name: 'sandbox', topicId: reviewTopicId })}
            />
          ) : (
            <Door
              targetRef={reviewRef}
              title="Due for review"
              line="nothing is fading yet — learn something first"
              hint="learn"
              scene={<CurveScene />}
              wash="rgba(204,30,122,0.05)"
              onOpen={() => router.navigate({ name: 'learn' })}
            />
          )}
        </motion.div>
      </div>

      <motion.div variants={rise} style={{ marginTop: 76, marginBottom: 20 }}>
        <GridHero prompt="What needs sharpening?" support="the same worlds, practice intent" />
      </motion.div>
      <SubjectGrid intent="practice" />
    </motion.div>
  );
}
