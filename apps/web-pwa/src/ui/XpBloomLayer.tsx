'use client';

/**
 * The identity cluster, top right: the streak flame, the learner's avatar with its XP badge,
 * and the bloom queue rising beneath on a genuine earn (ultramarine — the mastery pigment).
 */

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useRouter } from '../shell/router';
import { useProgress } from '../store/progress';

function readProfile(): { name?: string; photo?: string } {
  try {
    return {
      ...(JSON.parse(localStorage.getItem('clss-learner-profile') ?? '{}') as { name?: string }),
      photo: localStorage.getItem('clss-profile-photo') ?? undefined,
    };
  } catch {
    return {};
  }
}

export function XpBloomLayer() {
  const { xp, streakDays, blooms } = useProgress();
  const router = useRouter();
  const [profile, setProfile] = useState(readProfile);
  useEffect(() => {
    const onFocus = () => setProfile(readProfile());
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);
  const initial = (profile.name ?? 'A').trim().charAt(0).toUpperCase();

  return (
    <div
      style={{
        position: 'fixed',
        top: 14,
        right: 20,
        zIndex: 'var(--clss-z-toast)' as unknown as number,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* the streak — a small living flame with its day count */}
        <div
          title={`day ${streakDays} of being a learner`}
          style={{ display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <motion.svg
            width="15"
            height="19"
            viewBox="0 0 15 19"
            aria-hidden
            animate={{ scaleY: [1, 1.07, 0.96, 1], scaleX: [1, 0.95, 1.04, 1] }}
            transition={{ duration: 2.4, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
            style={{ transformOrigin: '50% 100%' }}
          >
            <defs>
              <linearGradient id="streakGrad" x1="0.5" y1="0" x2="0.5" y2="1">
                <stop offset="0%" stopColor="#FF9040" />
                <stop offset="62%" stopColor="#FF5A1F" />
                <stop offset="100%" stopColor="#D8437F" />
              </linearGradient>
            </defs>
            <path
              d="M7.5 0.8 C8.2 4.4 12.6 6.2 12.6 10.6 C12.6 14.6 10.3 17.4 7.5 17.4 C4.7 17.4 2.4 14.6 2.4 10.6 C2.4 8.4 3.5 7 4.6 5.7 C5.8 4.3 7.1 3 7.5 0.8 Z"
              fill="url(#streakGrad)"
            />
            <path
              d="M7.5 9.2 C8.6 11 9.7 11.9 9.7 13.6 C9.7 15.4 8.7 16.4 7.5 16.4 C6.3 16.4 5.3 15.4 5.3 13.6 C5.3 11.9 6.4 11 7.5 9.2 Z"
              fill="#FFD9A8"
            />
          </motion.svg>
          <span
            style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--clss-ink-700)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {streakDays}
          </span>
        </div>

        {/* the avatar — one tap to everything that is theirs; XP rides it as a badge */}
        <motion.button
          type="button"
          aria-label={`You — profile and settings. ${xp} xp`}
          onClick={() => router.navigate({ name: 'you' })}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          style={{
            position: 'relative',
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: '0.5px solid var(--clss-hairline-on-paper-strong)',
            background: profile.photo
              ? `center/cover url(${profile.photo})`
              : 'var(--clss-ink-100)',
            color: 'var(--clss-ink-700)',
            fontFamily: 'inherit',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          {!profile.photo && initial}
          <motion.span
            key={xp}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 18 }}
            style={{
              position: 'absolute',
              bottom: -7,
              left: '50%',
              translateX: '-50%',
              background: 'var(--clss-ink-900)',
              color: 'var(--clss-paper)',
              borderRadius: 999,
              padding: '1.5px 7px',
              fontSize: '0.62rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              fontVariantNumeric: 'tabular-nums',
              border: '1.5px solid var(--clss-paper)',
            }}
          >
            {xp} xp
          </motion.span>
        </motion.button>
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
              pointerEvents: 'none',
            }}
          >
            +{b.amount} xp
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
