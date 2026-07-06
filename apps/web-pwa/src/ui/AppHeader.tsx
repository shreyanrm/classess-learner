'use client';

/**
 * The app header — one 64px bar, one baseline, owning ALL top chrome so nothing floats:
 * wordmark left; did-you-know · streak · xp · avatar right, evenly spaced. XP blooms rise
 * from the same anchor. Screens put nothing at the top edge themselves.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from '../shell/router';
import { useProgress } from '../store/progress';
import { SparkIcon } from './icons';
import { ClassessLogo } from './Logo';

const FACTS: string[] = [
  'a white tiger has stripes on its skin, not just its fur',
  'a day on Venus lasts longer than its entire year',
  'honey found in Egyptian tombs is still edible after three thousand years',
  'lightning is about five times hotter than the surface of the sun',
  'octopuses have three hearts, and their blood is blue',
  'sound travels about four times faster underwater than in air',
  'sharks existed on Earth before trees did',
  'bananas are berries, but strawberries are not',
  'the Eiffel Tower grows about fifteen centimetres taller every summer',
  'hot water can sometimes freeze faster than cold water',
  'there are more possible chess games than atoms in the observable universe',
  'a teaspoon of neutron star material would weigh about a billion tonnes',
  'your bones are about five times stronger than steel of the same weight',
  'the human brain runs on roughly the power of a dim light bulb',
];

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

const chipStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  height: 34,
  padding: '0 13px',
  background: '#F1F1F5',
  border: 'none',
  borderRadius: 3,
  fontSize: '0.84rem',
  fontWeight: 550,
  color: '#121316',
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
} as const;

export function AppHeader() {
  const router = useRouter();
  const { xp, streakDays, blooms } = useProgress();
  const [factOpen, setFactOpen] = useState(false);
  const [profile, setProfile] = useState(readProfile);
  const fact = useMemo(() => FACTS[Math.floor(Date.now() / 86400000) % FACTS.length] as string, []);

  useEffect(() => {
    const onFocus = () => setProfile(readProfile());
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);
  const initial = (profile.name ?? 'A').trim().charAt(0).toUpperCase();

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 64,
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 'var(--clss-z-toast)' as unknown as number,
        pointerEvents: 'none',
      }}
    >
      <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center' }}>
        <ClassessLogo height={17} />
      </div>

      <div
        style={{
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          position: 'relative',
        }}
      >
        {/* did you know — fresh every day */}
        <motion.button
          type="button"
          onClick={() => setFactOpen((o) => !o)}
          whileTap={{ scale: 0.96 }}
          style={{ ...chipStyle, cursor: 'pointer' }}
        >
          <SparkIcon size={11} color="#CC1E7A" /> Did you know
        </motion.button>

        {/* the streak */}
        <span title={`day ${streakDays} of being a learner`} style={chipStyle}>
          <svg width="12" height="15" viewBox="0 0 15 19" aria-hidden>
            <defs>
              <linearGradient id="hdrFlame" x1="0.5" y1="0" x2="0.5" y2="1">
                <stop offset="0%" stopColor="#FF9040" />
                <stop offset="62%" stopColor="#FF5A1F" />
                <stop offset="100%" stopColor="#D8437F" />
              </linearGradient>
            </defs>
            <path
              d="M7.5 0.8 C8.2 4.4 12.6 6.2 12.6 10.6 C12.6 14.6 10.3 17.4 7.5 17.4 C4.7 17.4 2.4 14.6 2.4 10.6 C2.4 8.4 3.5 7 4.6 5.7 C5.8 4.3 7.1 3 7.5 0.8 Z"
              fill="url(#hdrFlame)"
            />
          </svg>
          {streakDays}
        </span>

        {/* the xp */}
        <motion.span
          key={xp}
          initial={{ scale: 1.15 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 20 }}
          style={{ ...chipStyle, fontVariantNumeric: 'tabular-nums' }}
        >
          {xp} xp
        </motion.span>

        {/* the learner */}
        <motion.button
          type="button"
          aria-label="You — profile and settings"
          onClick={() => router.navigate({ name: 'you' })}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          style={{
            width: 34,
            height: 34,
            borderRadius: 3,
            border: '1px solid #E9E9EE',
            background: profile.photo ? `center/cover url(${profile.photo})` : '#F1F1F5',
            color: '#5C5E66',
            fontFamily: 'inherit',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          {!profile.photo && initial}
        </motion.button>

        {/* the daily fact card */}
        <AnimatePresence>
          {factOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              style={{
                position: 'absolute',
                top: 46,
                right: 0,
                width: 300,
                padding: '14px 16px',
                background: '#FFFFFF',
                border: '1px solid #E9E9EE',
                borderRadius: 3,
                fontSize: '0.9rem',
                lineHeight: 1.55,
                color: '#5C5E66',
                textAlign: 'left',
              }}
            >
              {fact}
            </motion.div>
          )}
        </AnimatePresence>

        {/* blooms rise from the cluster */}
        <div style={{ position: 'absolute', top: 44, right: 0, pointerEvents: 'none' }}>
          <AnimatePresence>
            {blooms.map((b) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 8, scale: 0.9 }}
                animate={{ opacity: 1, y: -4, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                style={{ color: '#1F35E0', fontWeight: 650, fontSize: '1rem', textAlign: 'right' }}
              >
                +{b.amount} xp
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
