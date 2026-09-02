'use client';

/**
 * Wobo in flight. On every page she flies in from somewhere — arcs through the room, banks
 * into the turn, and settles onto her dock with a soft bounce. She never stops floating: docked,
 * a slow organic drift (bob, a whisper of sway and tilt) keeps her mid-swoosh — the same being
 * that glides between routes, never a metronome, never a beam pinning her to the ground.
 */

import { useReducedMotion } from '@classess/motion';
import { WoboBody, type WoboMood } from '@classess/wobo';
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
const FLEW_KEY = 'clss-wobo-flew';

export function FlyingWobo({
  routeKey,
  mood,
  gestureAngle,
  onTap,
  onHoldStart,
  onHoldEnd,
  size = 68,
}: {
  routeKey: string;
  mood: WoboMood;
  /** Direction (radians) she leans + gazes toward while explaining — toward the ink she's drawing. */
  gestureAngle?: number;
  onTap: () => void;
  /** Push-to-talk on her docked body — forwarded straight to WoboBody. */
  onHoldStart?: () => void;
  onHoldEnd?: () => void;
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
    if (reduced) return; // reduced-motion: she stays put — no drift, no pointer lean.
    const onMove = (e: PointerEvent) => {
      px.set(Math.max(-8, Math.min(8, (e.clientX - window.innerWidth + 60) * 0.02)));
      py.set(Math.max(-8, Math.min(8, (e.clientY - window.innerHeight + 60) * 0.02)));
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [px, py, reduced]);

  // The perpetual idle drift — docked, she wanders a slow organic loop, not a metronomic bob.
  // Layered incommensurate periods (bob ≈5s, sway ≈6.6s, tilt ≈5.6s) with phase offsets trace a
  // soft Lissajous float; the spring/velocity feel rides in on her pointer springs folded below.
  const driftY = useTransform(time, (ms) =>
    reduced ? 0 : Math.sin(ms / 800) * 7 + Math.sin(ms / 520) * 1.3,
  );
  const driftX = useTransform(time, (ms) =>
    reduced ? 0 : Math.sin(ms / 1050 + 0.7) * 3 + Math.sin(ms / 680) * 0.8,
  );
  const driftRot = useTransform(time, (ms) => (reduced ? 0 : Math.sin(ms / 900 + 1.3) * 1.5));

  // Pointer drift folded into the same values — velocity-continuous springs, her route-glide feel.
  const idleX = useTransform([driftX, px], ([d, p]: number[]) => (d ?? 0) + (p ?? 0));
  const idleY = useTransform([driftY, py], ([d, p]: number[]) => (d ?? 0) + (p ?? 0));

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
        zIndex: 'var(--clss-z-woboPresence)' as unknown as number,
        pointerEvents: flying ? 'none' : 'auto',
      }}
    >
      {/* The flight body — position, bank and squash all live on real motion values. */}
      <motion.div style={{ x: ex, y: ey, rotate: bank, scaleX: sqx, scaleY: sqy }}>
        <motion.div style={{ x: idleX, y: idleY, rotate: driftRot }}>
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
          <WoboBody
            size={size}
            mood={flying ? 'hint' : mood}
            // While inking she turns to the board (gestureAngle); otherwise her eyes drift to the
            // cursor. Flight owns her gaze during arrival, so neither applies until she's landed.
            gaze={flying ? undefined : gestureAngle !== undefined ? undefined : 'pointer'}
            gestureAngle={flying ? undefined : gestureAngle}
            onTap={onTap}
            // Push-to-talk only once she has landed — a hold during the arrival would fight it.
            onHoldStart={flying ? undefined : onHoldStart}
            onHoldEnd={flying ? undefined : onHoldEnd}
            label="Talk to Wobo"
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
