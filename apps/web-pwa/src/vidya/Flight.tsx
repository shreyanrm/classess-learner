'use client';

/**
 * Vidya in flight. On every page she flies in from somewhere — arcs through the room, banks
 * into the turn, and settles onto her dock with a soft bounce. Beneath her: a warm light-beam
 * shadow, long and bright while she is airborne, relaxing into a hovering pool once she lands.
 * She never stops floating — a slow bob keeps her airborne even at rest.
 */

import { useReducedMotion } from '@classess/motion';
import { VidyaBody, type VidyaMood } from '@classess/vidya';
import { motion, useAnimationControls, useSpring, useTime, useTransform } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

export function FlyingVidya({
  routeKey,
  mood,
  onTap,
  size = 68,
}: {
  routeKey: string;
  mood: VidyaMood;
  onTap: () => void;
  size?: number;
}) {
  const reduced = useReducedMotion();
  const controls = useAnimationControls();
  const time = useTime();
  const [flying, setFlying] = useState(false);
  const lastRoute = useRef<string>('');

  // Docked responsiveness: she drifts a few px toward the cursor — alive, never in the way.
  const px = useSpring(0, { stiffness: 60, damping: 18 });
  const py = useSpring(0, { stiffness: 60, damping: 18 });
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      px.set(Math.max(-8, Math.min(8, (e.clientX - window.innerWidth + 60) * 0.02)));
      py.set(Math.max(-8, Math.min(8, (e.clientY - window.innerHeight + 60) * 0.02)));
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [px, py]);

  // The perpetual hover — she floats even at rest.
  const bob = useTransform(time, (ms) => (reduced ? 0 : Math.sin(ms / 900) * 3.2));

  // The beam breathes with the hover: nearer the ground, tighter the pool.
  const beamPulse = useTransform(time, (ms) => (reduced ? 0.5 : 0.5 + 0.18 * Math.sin(ms / 700)));
  const beamOpacity = useTransform(beamPulse, (v) => (flying ? 0.12 : 0.32 + v * 0.22));
  const beamScaleY = useTransform(beamPulse, (v) => (flying ? 1 : 0.52 + v * 0.1));

  useEffect(() => {
    if (lastRoute.current === routeKey) return;
    lastRoute.current = routeKey;
    if (reduced) {
      void controls.start({ x: 0, y: 0, rotate: 0, opacity: 1, transition: { duration: 0.2 } });
      return;
    }
    const w = window.innerWidth;
    const h = window.innerHeight;
    // Top-down entry → one full circle in the open room → settle on the dock. All in-viewport.
    // Coordinates are offsets from the dock (bottom-right), so x∈[-(w-120),0], y∈[-(h-120),0].
    const cxr = -Math.min(w * 0.42, w - 260); // circle centre, safely on-screen
    const cyr = -h * 0.52;
    const r = Math.max(70, Math.min(w, h) * 0.16);
    const xs: number[] = [cxr, cxr];
    const ys: number[] = [-h - 90, cyr - r];
    const LOOP = 12;
    for (let i = 1; i <= LOOP; i++) {
      const a = -Math.PI / 2 + (i / LOOP) * Math.PI * 2; // start at circle top, one full loop
      xs.push(cxr + r * Math.cos(a));
      ys.push(cyr + r * Math.sin(a));
    }
    xs.push(0);
    ys.push(0);
    const STEPS = xs.length - 1;
    // Banking follows velocity — she leans into the turn like a thing with weight.
    const rots = xs.map((x, i) => {
      if (i === 0) return 0;
      const dx = x - (xs[i - 1] as number);
      const dy = (ys[i] as number) - (ys[i - 1] as number);
      return Math.max(-26, Math.min(26, dx * 0.16 + dy * -0.04));
    });
    rots[STEPS] = 0;
    setFlying(true);
    void controls
      .start({
        x: xs,
        y: ys,
        rotate: rots,
        opacity: [0, 1, ...Array(STEPS - 1).fill(1)],
        transition: { duration: 2.3, ease: [0.3, 0.9, 0.4, 1] },
      })
      .then(() =>
        controls.start({
          y: [0, -12, 0, -4, 0],
          scaleY: [1, 0.92, 1.06, 0.97, 1],
          scaleX: [1, 1.06, 0.96, 1.02, 1],
          transition: { duration: 0.7, ease: 'easeOut' },
        }),
      )
      .then(() => setFlying(false))
      .catch(() => setFlying(false));
    // No matter what interrupts the flight, she always lands, visible, on her dock.
    const safety = window.setTimeout(() => {
      controls.set({ x: 0, y: 0, rotate: 0, opacity: 1, scaleX: 1, scaleY: 1 });
      setFlying(false);
    }, 3000);
    return () => window.clearTimeout(safety);
  }, [routeKey, reduced, controls]);

  return (
    <motion.div
      animate={controls}
      initial={{ opacity: 0 }}
      style={{
        position: 'fixed',
        right: 22,
        bottom: 26,
        zIndex: 'var(--clss-z-vidyaPresence)' as unknown as number,
        pointerEvents: flying ? 'none' : 'auto',
      }}
    >
      <motion.div style={{ y: bob, x: px, translateY: py }}>
        {/* Her motion flame — an upside-down fire, trailing beneath her as she flies. */}
        <motion.div
          aria-hidden
          animate={{ opacity: flying ? 1 : 0 }}
          transition={{ duration: flying ? 0.2 : 0.45 }}
          style={{
            position: 'absolute',
            left: '50%',
            top: '62%',
            width: size * 0.86,
            height: size * 1.35,
            translateX: '-50%',
            transformOrigin: '50% 0%',
            pointerEvents: 'none',
            filter: 'blur(1.5px)',
          }}
        >
          <motion.svg
            viewBox="0 0 40 60"
            width="100%"
            height="100%"
            animate={{
              scaleY: [1, 1.28, 0.92, 1.18, 1],
              scaleX: [1, 0.92, 1.06, 0.95, 1],
              skewX: [0, -3, 2.5, -2, 0],
            }}
            transition={{ duration: 0.55, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
            style={{ transformOrigin: '50% 8%', display: 'block', overflow: 'visible' }}
          >
            {/* outer tongue — molten into rose */}
            <path
              d="M20 58 C7 41 2 30 6 18 C9 9 14 5 20 3 C26 5 31 9 34 18 C38 30 33 41 20 58 Z"
              fill="rgba(240,97,155,0.55)"
            />
            <path
              d="M20 54 C9 39 5 30 8.5 19 C11 11 15 7 20 5.5 C25 7 29 11 31.5 19 C35 30 31 39 20 54 Z"
              fill="#FF5A1F"
              opacity="0.85"
            />
            {/* the hot core */}
            <motion.path
              d="M20 46 C13 36 11 29 13 22 C15 16 17.5 13.5 20 12.5 C22.5 13.5 25 16 27 22 C29 29 27 36 20 46 Z"
              fill="#FFD9A8"
              animate={{ scaleY: [1, 1.2, 0.9, 1.15, 1] }}
              transition={{ duration: 0.4, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
              style={{ transformOrigin: '50% 20%' }}
            />
          </motion.svg>
        </motion.div>
        {/* The light-beam shadow beneath her — the floating made visible. */}
        <motion.div
          aria-hidden
          style={{
            position: 'absolute',
            left: '50%',
            top: '68%',
            width: size * 0.62,
            height: size * 1.5,
            translateX: '-50%',
            transformOrigin: '50% 0%',
            scaleY: beamScaleY,
            opacity: beamOpacity,
            background:
              'linear-gradient(to bottom, rgba(255,133,71,0.42), rgba(255,90,31,0.16) 55%, rgba(255,90,31,0) 88%)',
            clipPath: 'polygon(38% 0%, 62% 0%, 92% 100%, 8% 100%)',
            filter: 'blur(5px)',
            pointerEvents: 'none',
          }}
        />
        <motion.div
          aria-hidden
          style={{
            position: 'absolute',
            left: '50%',
            top: `calc(68% + ${size * 1.28}px)`,
            width: size * 0.94,
            height: size * 0.2,
            translateX: '-50%',
            borderRadius: '50%',
            background:
              'radial-gradient(ellipse at center, rgba(255,90,31,0.3), rgba(255,90,31,0) 70%)',
            filter: 'blur(4px)',
            opacity: beamOpacity,
            scaleX: beamScaleY,
            pointerEvents: 'none',
          }}
        />
        <VidyaBody
          size={size}
          mood={flying ? 'hint' : mood}
          gaze={flying ? undefined : 'pointer'}
          onTap={onTap}
          label="Talk to Vidya"
        />
      </motion.div>
    </motion.div>
  );
}
