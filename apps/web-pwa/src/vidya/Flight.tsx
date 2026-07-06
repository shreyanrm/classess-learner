'use client';

/**
 * Vidya in flight. On every page she flies in from somewhere — arcs through the room, banks
 * into the turn, and settles onto her dock with a soft bounce. Beneath her: a warm light-beam
 * shadow, long and bright while she is airborne, relaxing into a hovering pool once she lands.
 * She never stops floating — a slow bob keeps her airborne even at rest.
 */

import { useReducedMotion } from '@classess/motion';
import { VidyaBody, type VidyaMood } from '@classess/vidya';
import { motion, useAnimationControls, useTime, useTransform } from 'framer-motion';
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

  // The perpetual hover — she floats even at rest.
  const bob = useTransform(time, (ms) => (reduced ? 0 : Math.sin(ms / 900) * 3.2));

  // The beam breathes with the hover: nearer the ground, tighter the pool.
  const beamPulse = useTransform(time, (ms) => (reduced ? 0.5 : 0.5 + 0.18 * Math.sin(ms / 700)));
  const beamOpacity = useTransform(beamPulse, (v) => (flying ? 0.85 : 0.32 + v * 0.22));
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
    const from = ENTRIES[hash(routeKey) % ENTRIES.length]?.(w, h) ?? { x: -w * 0.5, y: -h * 0.4 };
    // A waypoint that swings her through the open room before she settles.
    const midX = from.x * 0.45 - w * 0.08;
    const midY = Math.min(from.y * 0.3, -h * 0.18) - 40;
    const leanIn = from.x < 0 ? 10 : -10;
    setFlying(true);
    void controls
      .start({
        x: [from.x, midX, 12, 0],
        y: [from.y, midY, -14, 0],
        rotate: [leanIn * 1.4, leanIn, -leanIn * 0.4, 0],
        opacity: [0, 1, 1, 1],
        transition: { duration: 1.5, times: [0, 0.45, 0.82, 1], ease: 'easeInOut' },
      })
      .then(() => setFlying(false));
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
      <motion.div style={{ y: bob }}>
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
