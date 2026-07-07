'use client';

/**
 * The combo — consecutive correct answers, building quietly across the practice flow and carrying
 * into the boss. It lives at module scope so a chain survives card-to-card (and surface-to-surface)
 * without prop-drilling; it breaks honestly the moment an answer misses. This is deliberately NOT
 * the tutor's correctStreak (that resets whenever the assistance ladder shifts) — the combo is a
 * pure count of clean answers in a row, the learner's own momentum made visible.
 *
 * Restraint by law (DESIGN.md §3, gamification taste law): silent and grey below the earn
 * threshold, pigment and a rising tone only once it is genuinely earned. One idea per moment.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { useSyncExternalStore } from 'react';
import { GOLD } from '../screens/course/shared';
import { sfx } from './sound';

/** At this length the combo stops being a whisper and earns pigment, glow, and a rising tone. */
export const COMBO_EARN = 3;

let count = 0;
const listeners = new Set<() => void>();
const emit = () => {
  for (const l of listeners) l();
};

/**
 * Register a clean answer. Returns the new chain length. From the earn threshold up it plays the
 * rising tone (mute-aware through sfx) — unless `silent`, which the boss uses to fold its batch of
 * results into the chain without stacking a sound over the boss's own evaluation.
 */
export function comboHit(silent = false): number {
  count += 1;
  if (!silent && count >= COMBO_EARN) sfx.combo(count);
  emit();
  return count;
}

/** A miss breaks the chain — honestly, with no penalty beyond the reset back to zero. */
export function comboBreak(): void {
  if (count === 0) return;
  count = 0;
  emit();
}

export function useCombo(): number {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => count,
    () => count,
  );
}

// The star mark — the currency made visible (stars law). One path, kept local; cheaper to repeat
// than to couple to the header or the celebration toolkit.
const STAR =
  'M7 0.5 C7.9 4 8.9 5 12.5 7 C8.9 9 7.9 10 7 13.5 C6.1 10 5.1 9 1.5 7 C5.1 5 6.1 4 7 0.5 Z';

/**
 * A single +XP tick — a small star chip that rises off the point of action and fades. Absolutely
 * positioned; drop it inside a `position: relative` parent at the moment of a correct answer. The
 * amount is the real award, passed in from XP_AWARDS — never a decorative number.
 */
export function XpTick({
  amount,
  hue = 'var(--clss-ultramarine)',
}: {
  amount: number;
  hue?: string;
}) {
  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0, x: '-50%', y: 4, scale: 0.92 }}
      animate={{ opacity: [0, 1, 1, 0], x: '-50%', y: [-2, -16, -26, -40], scale: 1 }}
      transition={{ duration: 1.5, times: [0, 0.18, 0.7, 1], ease: [0.2, 0, 0.2, 1] }}
      style={{
        position: 'absolute',
        top: -6,
        left: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        pointerEvents: 'none',
        fontSize: '0.82rem',
        fontWeight: 600,
        color: hue,
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
      }}
    >
      <svg viewBox="0 0 14 14" width={11} height={11} role="presentation" aria-hidden>
        <path d={STAR} fill={GOLD} />
      </svg>
      +{amount} xp
    </motion.div>
  );
}

/**
 * The combo meter — a quiet chip that appears once two answers have landed in a row, naming the
 * momentum. Grey and whispered below the earn threshold; at the threshold it takes the subject hue
 * and a soft breathing glow. It exits (AnimatePresence) the instant the chain breaks — the honest
 * break, shown without a word of guilt.
 */
export function ComboMeter({ hue = 'var(--clss-ultramarine)' }: { hue?: string }) {
  const n = useCombo();
  const earned = n >= COMBO_EARN;
  return (
    <AnimatePresence>
      {n >= 2 && (
        <motion.div
          key="combo"
          initial={{ opacity: 0, y: -4, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 320, damping: 24 }}
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '3px 9px',
            borderRadius: 999,
            fontSize: '0.68rem',
            letterSpacing: '0.08em',
            fontWeight: 600,
            textTransform: 'uppercase',
            color: earned ? hue : 'var(--clss-ink-500)',
            border: `0.5px solid ${
              earned
                ? `color-mix(in srgb, ${hue} 45%, transparent)`
                : 'var(--clss-hairline-on-paper-strong)'
            }`,
            background: earned ? `color-mix(in srgb, ${hue} 8%, transparent)` : 'transparent',
            transition: 'color 0.3s ease, border-color 0.3s ease, background 0.3s ease',
          }}
        >
          {earned && (
            <motion.span
              aria-hidden
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 2.4, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                inset: -6,
                borderRadius: 999,
                background: `radial-gradient(circle, color-mix(in srgb, ${hue} 30%, transparent) 0%, transparent 70%)`,
                pointerEvents: 'none',
              }}
            />
          )}
          <span style={{ position: 'relative', fontVariantNumeric: 'tabular-nums' }}>
            {n} in a row
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
