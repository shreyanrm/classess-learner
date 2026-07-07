'use client';

/**
 * The earned-moment toolkit — the pieces of the victory theatre (DESIGN.md §3.9, §5). Everything
 * here is scarce and precious by law: subject-hue pigment, light, and motion arrive together only
 * when comprehension is genuine. Reused by the course greeting and the boss close, and available
 * to any future victory.
 *
 * Laws honoured: 3px corners, no shadows, one hit of pigment (the subject hue, gold as its single
 * accent). Reduced motion collapses every animation to a calm resolved state. Dark theme rides the
 * --clss-* tokens. Sound is mute-aware through sfx (clss-voice-muted-v1) — never a second system.
 */

import { animate, motion } from 'framer-motion';
import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import { GOLD, whisper } from '../screens/course/shared';
import { sfx } from './sound';

// The star mark — the currency made visible (stars law: XP is visualised as stars). Kept local so
// the toolkit never couples to the header; it is one path, cheaper to repeat than to share.
const STAR =
  'M7 0.5 C7.9 4 8.9 5 12.5 7 C8.9 9 7.9 10 7 13.5 C6.1 10 5.1 9 1.5 7 C5.1 5 6.1 4 7 0.5 Z';

function StarMark({
  size,
  color,
  outline = false,
}: {
  size: number;
  color: string;
  outline?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 14 14"
      width={size}
      height={size}
      role="presentation"
      aria-hidden
      style={{ display: 'block' }}
    >
      <path
        d={STAR}
        fill={outline ? 'none' : color}
        stroke={outline ? 'var(--clss-ink-300)' : 'none'}
        strokeWidth={outline ? 1.1 : 0}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Performance stars (1–3) from the run's real evidence. The boss is the graded close, so its
 * accuracy leads; total attempts beyond one-per-item trims a star for a scrappier path. Never 0 —
 * reaching the greeting means the topic is genuinely earned.
 */
export function performanceStars(o: {
  bossCorrect?: number;
  bossTotal?: number;
  attemptsTotal: number;
  itemsTotal: number;
}): 1 | 2 | 3 {
  const overshoot = Math.max(0, o.attemptsTotal - o.itemsTotal); // stumbles across the whole run
  const acc = o.bossTotal ? (o.bossCorrect ?? 0) / o.bossTotal : 1; // no graded boss → lean on path
  if (acc >= 0.999 && overshoot <= 1) return 3;
  if (acc >= 0.999 || overshoot <= 3) return 2;
  return 1;
}

// ponytail: one runnable check for the star math — dev-only, console.assert never throws.
if (import.meta.env.DEV) {
  console.assert(
    performanceStars({ bossCorrect: 3, bossTotal: 3, attemptsTotal: 6, itemsTotal: 6 }) === 3,
    'flawless run → 3 stars',
  );
  console.assert(
    performanceStars({ bossCorrect: 2, bossTotal: 3, attemptsTotal: 8, itemsTotal: 6 }) === 2,
    'boss pass with stumbles → 2 stars',
  );
  console.assert(
    performanceStars({ bossCorrect: 2, bossTotal: 3, attemptsTotal: 12, itemsTotal: 6 }) === 1,
    'scraped pass → 1 star',
  );
}

/** The three performance stars, popping in one after another in the subject hue; the third is gold. */
export function PerformanceStars({
  stars,
  hue,
  reduced,
  size = 30,
}: {
  stars: 1 | 2 | 3;
  hue: string;
  reduced: boolean;
  size?: number;
}) {
  return (
    <div
      role="img"
      style={{ display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center' }}
      aria-label={`${stars} of 3 stars earned`}
    >
      {[0, 1, 2].map((i) => {
        const earned = i < stars;
        const gold = earned && i === 2; // the third — the flawless mark — resolves to gold
        return (
          <motion.span
            key={i}
            aria-hidden
            initial={reduced ? false : { scale: 0.2, rotate: -35, opacity: 0 }}
            animate={{ scale: earned ? 1 : 0.78, rotate: 0, opacity: 1 }}
            transition={{
              type: 'spring',
              stiffness: 340,
              damping: 15,
              delay: reduced ? 0 : 0.45 + i * 0.22,
            }}
          >
            <StarMark size={size} color={gold ? GOLD : hue} outline={!earned} />
          </motion.span>
        );
      })}
    </div>
  );
}

/** The XP number counting up from zero on a spring — the currency landing, felt not just shown. */
export function XpTally({
  amount,
  hue,
  reduced,
}: {
  amount: number;
  hue: string;
  reduced: boolean;
}) {
  const [n, setN] = useState(reduced ? amount : 0);
  useEffect(() => {
    if (reduced) {
      setN(amount);
      return;
    }
    const controls = animate(0, amount, {
      type: 'spring',
      stiffness: 55,
      damping: 18,
      onUpdate: (v) => setN(Math.round(v)),
    });
    return () => controls.stop();
  }, [amount, reduced]);
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8 }}>
      <span
        style={{
          fontVariantNumeric: 'tabular-nums',
          fontSize: 'clamp(2.4rem, 9vw, 3.4rem)',
          fontWeight: 600,
          letterSpacing: '-0.03em',
          lineHeight: 1,
          color: hue,
        }}
      >
        +{n}
      </span>
      <span style={{ ...whisper, letterSpacing: '0.12em' }}>xp</span>
    </div>
  );
}

/** A restrained radial burst of stars — the reward arriving as light. Silent (the chord carries). */
export function Starburst({
  hue,
  reduced,
  big = false,
  count = 14,
}: {
  hue: string;
  reduced: boolean;
  big?: boolean;
  count?: number;
}) {
  const parts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + (i % 2) * 0.3;
        const d = (big ? 130 : 96) + (i % 3) * 26;
        return {
          id: `b${i}`,
          x: Math.cos(a) * d,
          y: Math.sin(a) * d,
          s: i % 4 === 0 ? 13 : 9,
          gold: i % 3 === 0,
          delay: (i % 5) * 0.03,
        };
      }),
    [count, big],
  );
  if (reduced) return null;
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      {parts.map((p) => (
        <motion.span
          key={p.id}
          initial={{ x: 0, y: 0, scale: 0.2, opacity: 0 }}
          animate={{ x: p.x, y: p.y, scale: [0.2, 1, 0.6], opacity: [0, 1, 0] }}
          transition={{
            duration: big ? 1.2 : 0.95,
            ease: [0.15, 0, 0.2, 1],
            delay: 0.15 + p.delay,
            times: [0, 0.3, 1],
          }}
          style={{ position: 'absolute' }}
        >
          <StarMark size={p.s} color={p.gold ? GOLD : hue} />
        </motion.span>
      ))}
    </div>
  );
}

/** A small trophy glyph — the boss-cleared mark, drawn in the subject hue. */
function Trophy({ hue, size = 15 }: { hue: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} role="presentation" aria-hidden>
      <path
        d="M6 3h12v3a6 6 0 0 1-12 0V3Z M6 4H3v2a4 4 0 0 0 4 4 M18 4h3v2a4 4 0 0 1-4 4 M12 12v4 M8 20h8 M10 16h4v4h-4z"
        fill="none"
        stroke={hue}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The quiet trophy note that marks a boss-closed topic. */
export function TrophyNote({ hue }: { hue: string }) {
  const style: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 12px',
    borderRadius: 3,
    border: `0.5px solid ${hue}`,
    background: 'color-mix(in srgb, var(--clss-paper) 88%, transparent)',
    fontSize: '0.78rem',
    fontWeight: 600,
    letterSpacing: '0.02em',
    color: 'var(--clss-ink-900)',
  };
  return (
    <motion.span
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7, type: 'spring', stiffness: 300, damping: 26 }}
      style={style}
    >
      <Trophy hue={hue} />
      boss cleared
    </motion.span>
  );
}

/** One calm line of meaning per level — the reason the number matters, never hype. */
function levelMeaning(level: number): string {
  const lines = [
    'you are just getting started, and it already shows.',
    'the early ideas are becoming second nature.',
    'you are building real momentum now.',
    'the pieces are starting to connect on their own.',
    'you are going deeper than most ever do.',
    'this is the work of someone who keeps showing up.',
    'depth like this is earned one honest step at a time.',
  ];
  return lines[Math.min(level - 2, lines.length - 1)] ?? 'you keep going deeper — and it holds.';
}

/**
 * The level-up moment — a distinct full-screen beat that fires only when XP crosses a curve
 * threshold. A badge forges in (a ring drawing closed, the new number springing up), the fanfare
 * sounds once (mute-aware), and one line names why it matters. Ultramarine by law: a level is
 * brand-and-mastery, not a subject moment. The parent owns the action bar; this is the scene.
 */
export function LevelUpMoment({ level, reduced }: { level: number; reduced: boolean }) {
  const hue = 'var(--clss-ultramarine)';
  useEffect(() => {
    sfx.fanfare();
  }, []);

  const R = 58;
  const circ = 2 * Math.PI * R;

  return (
    <div
      style={{
        position: 'relative',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 26,
        padding: '32px 24px',
        textAlign: 'center',
      }}
    >
      {/* the ambient bloom the badge sits inside */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: [0, 0.7, 0.45], scale: 1 }}
        transition={{ duration: 1.1, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          width: 360,
          height: 360,
          borderRadius: 999,
          background: `radial-gradient(circle, color-mix(in srgb, ${hue} 22%, transparent) 0%, transparent 62%)`,
          pointerEvents: 'none',
        }}
      />
      <Starburst hue={hue} reduced={reduced} big count={16} />

      {/* the badge forging in — the ring draws closed around the new level number */}
      <div style={{ position: 'relative', width: 148, height: 148 }}>
        <svg
          viewBox="0 0 148 148"
          width={148}
          height={148}
          role="presentation"
          aria-hidden
          style={{ position: 'absolute', inset: 0 }}
        >
          <circle cx={74} cy={74} r={R} fill="none" stroke="var(--clss-ink-100)" strokeWidth={4} />
          <motion.circle
            cx={74}
            cy={74}
            r={R}
            fill="none"
            stroke={hue}
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={reduced ? { strokeDashoffset: 0 } : { strokeDashoffset: circ }}
            animate={{ strokeDashoffset: 0 }}
            transition={{ duration: reduced ? 0 : 1.1, ease: [0.2, 0, 0, 1], delay: 0.1 }}
            style={{ transformOrigin: '74px 74px', transform: 'rotate(-90deg)' }}
          />
        </svg>
        <motion.div
          initial={reduced ? false : { scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 16, delay: reduced ? 0 : 0.5 }}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            fontVariantNumeric: 'tabular-nums',
            fontSize: '3.4rem',
            fontWeight: 650,
            letterSpacing: '-0.04em',
            color: hue,
            lineHeight: 1,
          }}
        >
          {level}
        </motion.div>
      </div>

      <div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduced ? 0 : 0.75, duration: 0.5, ease: [0.2, 0, 0, 1] }}
          style={{ ...whisper, color: hue }}
        >
          new level
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduced ? 0 : 0.9, duration: 0.55, ease: [0.2, 0, 0, 1] }}
          style={{
            marginTop: 10,
            fontSize: 'clamp(1.5rem, 5vw, 2rem)',
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: 'var(--clss-ink-900)',
          }}
        >
          level {level}
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: reduced ? 0 : 1.25, duration: 0.5 }}
          style={{
            marginTop: 12,
            maxWidth: 340,
            marginInline: 'auto',
            fontSize: '1rem',
            lineHeight: 1.55,
            color: 'var(--clss-ink-700)',
          }}
        >
          {levelMeaning(level)}
        </motion.div>
      </div>
    </div>
  );
}
