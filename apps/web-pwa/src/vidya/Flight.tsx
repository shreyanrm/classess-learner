'use client';

/**
 * Vidya in flight. On every page she flies in from somewhere — arcs through the room, banks
 * into the turn, and settles onto her dock with a soft bounce. Beneath her: a warm light-beam
 * shadow, long and bright while she is airborne, relaxing into a hovering pool once she lands.
 * She never stops floating — a slow bob keeps her airborne even at rest.
 */

import { useReducedMotion } from '@classess/motion';
import { VidyaBody, type VidyaMood } from '@classess/vidya';
import {
  animate,
  motion,
  useMotionValue,
  useSpring,
  useTime,
  useTransform,
  useVelocity,
} from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

// Once per browser session she performs the full arrival; after that she only glides.
const FLEW_KEY = 'clss-vidya-flew';

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
  const time = useTime();
  const [flying, setFlying] = useState(false);
  const lastRoute = useRef<string>('');

  // The entrance offset from the dock, driven by force — not keyframes. At rest it sits at 0
  // (docked); a flight jumps it off-screen then springs it home, so acceleration, the banked
  // arc, overshoot and settle all fall out of the physics instead of being authored.
  const ex = useMotionValue(0);
  const ey = useMotionValue(0);
  const op = useMotionValue(0);
  // Anticipation squash — she loads before she launches.
  const sqx = useMotionValue(1);
  const sqy = useMotionValue(1);
  // Banking is truthful: it reads her real horizontal velocity and relaxes to 0 as she settles.
  const evx = useVelocity(ex);
  const bank = useTransform(evx, (v) => Math.max(-22, Math.min(22, v * 0.012)));

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

    // Reduced motion collapses the whole thing to a fade — no travel, no lean.
    if (reduced) {
      ex.jump(0);
      ey.jump(0);
      animate(op, 1, { duration: 0.3 });
      return;
    }

    const w = window.innerWidth;
    const h = window.innerHeight;
    const flew = sessionStorage.getItem(FLEW_KEY);

    // FREQUENCY LAW: later route changes get a short, low-amplitude glide into the dock —
    // present already, she just eases back in. Never the grand arrival twice.
    if (flew) {
      op.set(1);
      ex.jump(-Math.min(46, w * 0.05));
      ey.jump(-Math.min(26, h * 0.04));
      animate(ex, 0, { type: 'spring', stiffness: 140, damping: 20 });
      animate(ey, 0, { type: 'spring', stiffness: 170, damping: 22 });
      return;
    }

    // The full arrival — once per session. One continuous force curve from off-screen to dock.
    sessionStorage.setItem(FLEW_KEY, '1');
    const small = w < 760 || h < 560;
    ex.jump(-(small ? w * 0.5 : w * 0.72));
    ey.jump(-(small ? h * 0.36 : h * 0.44));
    op.set(0);
    setFlying(true);

    // Anticipation: the squash is her visible load, and an underdamped spring eases in from rest
    // on its own — she barely moves for the first breath, then launches. No timing gap to cancel.
    animate(op, 1, { duration: 0.24 });
    animate(sqx, [1, 1.12, 0.98, 1], { duration: 0.34, ease: 'easeOut' });
    animate(sqy, [1, 0.86, 1.04, 1], { duration: 0.34, ease: 'easeOut' });

    // y catches home faster than x, so the trajectory bows into an arc — no control points.
    // Underdamped springs (ratio < 1) give the overshoot-and-settle the law asks for, for free.
    animate(ey, 0, { type: 'spring', stiffness: 90, damping: 15 });
    const home = animate(ex, 0, { type: 'spring', stiffness: 45, damping: 13 });
    void home.then(() => setFlying(false)).catch(() => setFlying(false));

    // No matter what interrupts the flight, she always lands, visible, on her dock.
    const safety = window.setTimeout(() => {
      ex.jump(0);
      ey.jump(0);
      op.set(1);
      sqx.set(1);
      sqy.set(1);
      setFlying(false);
    }, 3000);
    return () => window.clearTimeout(safety);
  }, [routeKey, reduced, ex, ey, op, sqx, sqy]);

  return (
    <motion.div
      style={{
        position: 'fixed',
        right: 22,
        bottom: 26,
        opacity: op,
        zIndex: 'var(--clss-z-vidyaPresence)' as unknown as number,
        pointerEvents: flying ? 'none' : 'auto',
      }}
    >
      {/* The flight body — position, bank and squash all live on real motion values. */}
      <motion.div style={{ x: ex, y: ey, rotate: bank, scaleX: sqx, scaleY: sqy }}>
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
              background: 'var(--clss-vidya-beam)',
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
              background: 'var(--clss-vidya-beam-pool)',
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
    </motion.div>
  );
}
