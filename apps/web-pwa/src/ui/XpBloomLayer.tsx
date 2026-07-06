'use client';

/**
 * The XP bloom — the earn made visible (CONTEXT.md §9). A quiet counter chip lives top-right;
 * on a genuine earn a "+n" blooms out of it in ultramarine (the mastery pigment) and settles
 * into the total. Scarce by design: blooms fire only from the progress store.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { useProgress } from '../store/progress';

export function XpBloomLayer() {
  const { xp, streakDays, blooms } = useProgress();

  return (
    <div
      style={{
        position: 'fixed',
        top: 18,
        right: 20,
        zIndex: 'var(--clss-z-toast)' as unknown as number,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 6,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '6px 12px',
          background: 'var(--clss-paper)',
          border: '0.5px solid var(--clss-hairline-on-paper-strong)',
          borderRadius: 'var(--clss-radius-sm)',
          fontSize: '0.82rem',
          color: 'var(--clss-ink-700)',
        }}
      >
        <motion.span
          key={xp}
          initial={{ scale: 1.25, color: 'var(--clss-ultramarine)' }}
          animate={{ scale: 1, color: 'var(--clss-ink-900)' }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          style={{ fontWeight: 600 }}
        >
          {xp} xp
        </motion.span>
        <span style={{ color: 'var(--clss-ink-300)' }}>·</span>
        <span>day {streakDays} of being a learner</span>
      </div>
      <AnimatePresence>
        {blooms.map((b) => (
          <motion.div
            key={b.id}
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: -6, scale: 1 }}
            exit={{ opacity: 0, y: -22, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            style={{
              color: 'var(--clss-ultramarine)',
              fontWeight: 600,
              fontSize: '1.05rem',
              letterSpacing: '-0.01em',
            }}
          >
            +{b.amount} xp
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
