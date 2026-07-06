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

function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Entry points she may fly in from, relative to the viewport. */
const ENTRIES: Array<(w: number, h: number) => { x: number; y: number }> = [
  (w, h) => ({ x: -w * 0.55, y: -h * 0.45 }), // over the top-left horizon
  (w, h) => ({ x: -w * 0.7, y: -h * 0.05 }), // straight across the room
  (w, h) => ({ x: -w * 0.25, y: -h * 0.8 }), // a dive from above
  (w, h) => ({ x: w * 0.3, y: -h * 0.75 }), // over the right shoulder
];

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
        {/* The binary aura — while she flies, energy wisps lick around her whole silhouette. */}
        <motion.div
          aria-hidden
          animate={{ opacity: flying ? 1 : 0 }}
          transition={{ duration: flying ? 0.25 : 0.5 }}
          style={{ position: 'absolute', inset: '-38%', pointerEvents: 'none' }}
        >
          <motion.div
            animate={{ scale: [1, 1.12, 0.96, 1.08, 1], opacity: [0.7, 0.95, 0.75, 0.9, 0.7] }}
            transition={{ duration: 1.1, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(255,158,98,0.55) 22%, rgba(255,90,31,0.35) 46%, rgba(240,97,155,0.22) 64%, rgba(240,97,155,0) 78%)',
              filter: 'blur(13px)',
            }}
          />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => {
            const a = -90 + i * 51.4; // around the rim
            return (
              <motion.div
                key={i}
                animate={{
                  scaleY: [0.6, 1.5, 0.8, 1.3, 0.6],
                  opacity: [0.5, 0.95, 0.6, 0.9, 0.5],
                }}
                transition={{
                  duration: 0.75 + i * 0.11,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: 'easeInOut',
                  delay: i * 0.07,
                }}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: 7,
                  height: size * 0.52,
                  marginLeft: -3.5,
                  marginTop: -size * 0.52,
                  transformOrigin: '50% 100%',
                  rotate: a,
                  translateY: -size * 0.34,
                  borderRadius: 999,
                  background:
                    'linear-gradient(to top, rgba(255,217,168,0.9), rgba(255,90,31,0.75) 40%, rgba(240,97,155,0.45) 72%, rgba(240,97,155,0) 100%)',
                  filter: 'blur(2.5px)',
                }}
              />
            );
          })}
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
