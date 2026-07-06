'use client';

/**
 * The app header — one 64px bar, one baseline, owning ALL top chrome so nothing floats:
 * wordmark left; did-you-know · streak · xp · avatar right, evenly spaced. XP blooms rise
 * from the same anchor. Screens put nothing at the top edge themselves.
 */

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from '../shell/router';
import { useViewport } from '../shell/useViewport';
import { levelInfo, useProgress, type XpBloom } from '../store/progress';
import { AVATAR_CHANGED_EVENT, readAvatarProfile, renderAvatar } from './avatars';
import { SparkIcon } from './icons';
import { ClassessLogo } from './Logo';

const STAR_PATH =
  'M7 0.5 C7.9 4 8.9 5 12.5 7 C8.9 9 7.9 10 7 13.5 C6.1 10 5.1 9 1.5 7 C5.1 5 6.1 4 7 0.5 Z';

/** A tiny star — reused for the burst and the level-up ring. */
function Star({ size, color }: { size: number; color: string }) {
  return (
    <svg
      viewBox="0 0 14 14"
      width={size}
      height={size}
      role="presentation"
      aria-hidden
      style={{ display: 'block' }}
    >
      <path d={STAR_PATH} fill={color} />
    </svg>
  );
}

/**
 * The level medallion — a progress ring around the level number, joined to the avatar.
 * The arc encodes xp-to-next-level; the tooltip carries the exact fraction. Pulses on level-up.
 */
export function LevelBadge({
  info,
  celebrate,
  size = 34,
}: {
  info: ReturnType<typeof levelInfo>;
  celebrate: boolean;
  size?: number;
}) {
  const still = useReducedMotion();
  const r = size / 2 - 2;
  const c = 2 * Math.PI * r;
  const hue = 'var(--clss-ultramarine)';
  return (
    <motion.span
      title={`level ${info.level} · ${info.intoLevel}/${info.span} xp to level ${info.level + 1}`}
      animate={celebrate && !still ? { scale: [1, 1.22, 1] } : { scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 14 }}
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="presentation"
        aria-hidden
        style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}
      >
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E9E9EE" strokeWidth={2.5} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={hue}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - info.progress) }}
          transition={{ type: 'spring', stiffness: 210, damping: 26 }}
        />
      </svg>
      <span
        style={{
          fontSize: size > 40 ? '1.1rem' : '0.82rem',
          fontWeight: 700,
          color: 'var(--clss-ink)',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
        }}
      >
        {info.level}
      </span>
    </motion.span>
  );
}

/** One earned moment: the number rising with tiny stars arcing out, subject-hued, spring physics. */
function StarBurst({ bloom }: { bloom: XpBloom }) {
  const still = useReducedMotion();
  const hue = bloom.hue ?? 'var(--clss-ultramarine)';
  const levelUp = bloom.crossedTo != null;
  // more stars for a bigger earn; a level-up gets a full ring
  const count = levelUp ? 9 : Math.min(4, 2 + Math.floor(bloom.amount / 60));
  const stars = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      // fan upward for a routine bloom; full radial ring for a level-up
      const angle = levelUp
        ? (i / count) * Math.PI * 2
        : (-140 + (count > 1 ? (i / (count - 1)) * 100 : 50)) * (Math.PI / 180);
      const dist = levelUp ? 30 : 20 + ((i * 7) % 14);
      return {
        key: `star-${i}`,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        size: levelUp ? 9 : 7 + ((i * 3) % 4),
        delay: i * 0.02,
      };
    });
  }, [count, levelUp]);

  return (
    <div style={{ position: 'relative', textAlign: 'right' }}>
      {/* the stars */}
      <div style={{ position: 'absolute', right: 6, top: 4, width: 0, height: 0 }}>
        {!still &&
          stars.map((s) => (
            <motion.div
              key={s.key}
              initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
              animate={{ x: s.x, y: s.y, opacity: [0, 1, 0], scale: [0.4, 1, 0.7] }}
              transition={{
                type: 'spring',
                stiffness: 240,
                damping: 16,
                delay: s.delay,
                opacity: { duration: levelUp ? 1.4 : 1, times: [0, 0.3, 1] },
              }}
              style={{ position: 'absolute' }}
            >
              <Star size={s.size} color={hue} />
            </motion.div>
          ))}
      </div>
      {/* the number */}
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.9 }}
        animate={{ opacity: 1, y: levelUp ? -10 : -4, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        style={{
          color: hue,
          fontWeight: levelUp ? 700 : 650,
          fontSize: levelUp ? '1.05rem' : '1rem',
        }}
      >
        {levelUp && (
          <span style={{ display: 'block', fontSize: '0.7rem', letterSpacing: '0.04em' }}>
            level {bloom.crossedTo}
          </span>
        )}
        +{bloom.amount} xp
      </motion.div>
    </div>
  );
}

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

const chipStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  height: 34,
  padding: '0 13px',
  background: 'var(--clss-tonal)',
  border: 'none',
  borderRadius: 3,
  fontSize: '0.84rem',
  fontWeight: 550,
  color: 'var(--clss-ink)',
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
} as const;

export function AppHeader() {
  const router = useRouter();
  const { width } = useViewport();
  // Narrow phones can't hold the full cluster — the did-you-know nicety folds away so the
  // core (streak · xp · level · avatar) never clips off the right edge.
  const compact = width < 560;
  const { xp, streakDays, blooms } = useProgress();
  const level = levelInfo(xp);
  // the level-up beat: pulse the badge while a crossing bloom is on screen
  const celebrate = blooms.some((b) => b.crossedTo != null);
  const [factOpen, setFactOpen] = useState(false);
  // The glass: transparent at rest, frosting in as the world scrolls beneath it.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const [profile, setProfile] = useState(readAvatarProfile);
  const fact = useMemo(() => FACTS[Math.floor(Date.now() / 86400000) % FACTS.length] as string, []);

  useEffect(() => {
    const refresh = () => setProfile(readAvatarProfile());
    window.addEventListener('focus', refresh);
    window.addEventListener(AVATAR_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener(AVATAR_CHANGED_EVENT, refresh);
    };
  }, []);

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 64,
        padding: compact ? '0 16px' : '0 24px',
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
          gap: compact ? 8 : 10,
          position: 'relative',
        }}
      >
        {/* did you know — fresh every day; folds away on narrow phones to protect the core cluster */}
        {!compact && (
          <motion.button
            type="button"
            onClick={() => setFactOpen((o) => !o)}
            whileTap={{ scale: 0.96 }}
            style={{ ...chipStyle, cursor: 'pointer' }}
          >
            <SparkIcon size={11} color="#CC1E7A" /> Did you know
          </motion.button>
        )}

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

        {/* identity — the level medallion joined to the avatar as one unit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <LevelBadge info={level} celebrate={celebrate} />
          {/* the learner — photo, chosen cast buddy, or initial, all through one resolver */}
          <motion.button
            type="button"
            aria-label={`You — level ${level.level}, profile and settings`}
            onClick={() => router.navigate({ name: 'you' })}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            style={{
              width: 34,
              height: 34,
              borderRadius: 3,
              border: '1px solid var(--clss-card-border)',
              background: 'var(--clss-tonal)',
              padding: 0,
              overflow: 'hidden',
              fontFamily: 'inherit',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            {renderAvatar(profile, 32)}
          </motion.button>
        </div>

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
                background: 'var(--clss-card)',
                border: '1px solid var(--clss-card-border)',
                borderRadius: 3,
                fontSize: '0.9rem',
                lineHeight: 1.55,
                color: 'var(--clss-ink-soft)',
                textAlign: 'left',
              }}
            >
              {fact}
            </motion.div>
          )}
        </AnimatePresence>

        {/* earned moments rise from the cluster as star-bursts */}
        <div style={{ position: 'absolute', top: 44, right: 4, pointerEvents: 'none' }}>
          <AnimatePresence>
            {blooms.map((b) => (
              <motion.div key={b.id} exit={{ opacity: 0 }}>
                <StarBurst bloom={b} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
