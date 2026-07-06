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
  // The glass: transparent at rest, frosting in as the world scrolls beneath it.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
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
        background: scrolled ? 'rgba(255,255,255,0.62)' : 'rgba(255,255,255,0)',
        backdropFilter: scrolled ? 'blur(18px) saturate(1.6)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(18px) saturate(1.6)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(233,233,238,0.75)' : '1px solid transparent',
        transition: 'background 0.35s ease, border-color 0.35s ease, backdrop-filter 0.35s ease',
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

        {/* the streak — a clean two-layer teardrop flame, an inner core of light */}
        <span title={`day ${streakDays} of being a learner`} style={chipStyle}>
          <motion.svg
            width="15"
            height="19"
            viewBox="0 0 15 19"
            role="presentation"
            aria-hidden
            animate={{ scaleY: [1, 1.05, 0.97, 1], scaleX: [1, 0.97, 1.03, 1] }}
            transition={{ duration: 2.4, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
            style={{ transformOrigin: '50% 100%', display: 'block' }}
          >
            <defs>
              <linearGradient id="hdrFlame" x1="0.5" y1="0" x2="0.5" y2="1">
                <stop offset="0%" stopColor="#FF8A3D" />
                <stop offset="100%" stopColor="#F0461F" />
              </linearGradient>
            </defs>
            {/* outer teardrop — tip drawn up, a full round base */}
            <path
              d="M7.5 1.2
                 C7.9 4.1 10.1 5.9 11.6 8.1
                 C12.5 9.5 13 10.9 13 12.4
                 C13 15.6 10.6 17.9 7.5 17.9
                 C4.4 17.9 2 15.6 2 12.4
                 C2 10.9 2.5 9.5 3.4 8.1
                 C4.9 5.9 7.1 4.1 7.5 1.2 Z"
              fill="url(#hdrFlame)"
            />
            {/* the inner core — a smaller teardrop of light, breathing on its own */}
            <motion.path
              d="M7.5 9.4
                 C7.8 10.9 8.9 11.8 9.6 12.9
                 C10 13.6 10.2 14.2 10.2 14.9
                 C10.2 16.5 9 17.6 7.5 17.6
                 C6 17.6 4.8 16.5 4.8 14.9
                 C4.8 14.2 5 13.6 5.4 12.9
                 C6.1 11.8 7.2 10.9 7.5 9.4 Z"
              fill="#FFE1B8"
              animate={{ scaleY: [1, 1.12, 0.94, 1] }}
              transition={{ duration: 1.7, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
              style={{ transformOrigin: '50% 92%' }}
            />
          </motion.svg>
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
                style={{
                  // an earned bloom takes the owning subject's hue; ultramarine is the default earn
                  color: b.hue ?? '#1F35E0',
                  fontWeight: 650,
                  fontSize: '1rem',
                  textAlign: 'right',
                }}
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
