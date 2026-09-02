'use client';

import { radius, zIndex } from '@classess/config';
import { useReducedMotion } from '@classess/motion';
import { motion } from 'framer-motion';
import { type FlameState, flameForMood, MOLTEN, type WoboMood } from './identity';

export interface WoboPresenceProps {
  /** Diameter in px. */
  size?: number;
  mood?: WoboMood;
  /** Override the mood's default flame (the flame is expressive per the license). */
  flame?: FlameState;
  /** Where she looks while thinking, each axis in -1..1. */
  gaze?: { x: number; y: number };
  /** Dock her fixed to the bottom-right (her default home). */
  fixed?: boolean;
  onTap?: () => void;
  label?: string;
}

interface FlameParams {
  opacity: number[];
  scale: number[];
  durationS: number;
  lean: number;
  heightMul: number;
}

const FLAME: Record<FlameState, FlameParams> = {
  steady: {
    opacity: [0.7, 0.9, 0.62, 0.84],
    scale: [1, 1.06, 0.96, 1.02],
    durationS: 1.1,
    lean: 0,
    heightMul: 1,
  },
  lean: {
    opacity: [0.7, 0.92, 0.64, 0.86],
    scale: [1, 1.07, 0.95, 1.03],
    durationS: 1.0,
    lean: 7,
    heightMul: 1.05,
  },
  trail: {
    opacity: [0.72, 0.94, 0.66, 0.88],
    scale: [1.02, 1.1, 0.98, 1.05],
    durationS: 0.95,
    lean: 3,
    heightMul: 1.25,
  },
  flare: {
    opacity: [0.85, 1, 0.8, 0.95],
    scale: [1.12, 1.28, 1.06, 1.18],
    durationS: 0.8,
    lean: 0,
    heightMul: 1.2,
  },
  ember: {
    opacity: [0.34, 0.46, 0.3, 0.4],
    scale: [0.8, 0.86, 0.77, 0.82],
    durationS: 1.7,
    lean: 0,
    heightMul: 0.85,
  },
  brighten: {
    opacity: [0.82, 1, 0.72, 0.96],
    scale: [1.06, 1.18, 1.0, 1.12],
    durationS: 0.6,
    lean: 0,
    heightMul: 1.1,
  },
};

/** The flame-glow beneath her — always present, bobs with her float, flickers irregularly. */
function Flame({ size, state, reduced }: { size: number; state: FlameState; reduced: boolean }) {
  const p = FLAME[state];
  const w = size * 1.5;
  const h = size * 0.9 * p.heightMul;
  return (
    <motion.div
      aria-hidden
      style={{
        position: 'absolute',
        left: '50%',
        bottom: -h * 0.35,
        width: w,
        height: h,
        x: '-50%',
        marginLeft: p.lean,
        borderRadius: '50%',
        background: `radial-gradient(closest-side, ${MOLTEN.glowInner} 0%, ${MOLTEN.glowMid} 45%, ${MOLTEN.glowOuter} 100%)`,
        pointerEvents: 'none',
        // Depth via the flame, never a shadow.
        filter: 'blur(2px)',
      }}
      initial={{ opacity: reduced ? 0.6 : p.opacity[0], scale: 1 }}
      animate={reduced ? { opacity: 0.6, scale: 1 } : { opacity: p.opacity, scale: p.scale }}
      transition={
        reduced
          ? { duration: 0 }
          : { duration: p.durationS, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }
      }
    />
  );
}

/** Two cute eyes with wet catchlights. Blink roughly every 5s; drift toward the gaze while thinking. */
function Eyes({
  size,
  mood,
  gaze,
  reduced,
}: {
  size: number;
  mood: WoboMood;
  gaze: { x: number; y: number };
  reduced: boolean;
}) {
  const eyeW = size * 0.16;
  const eyeH = size * 0.22;
  const dx = mood === 'thinking' ? gaze.x * size * 0.05 : 0;
  const dy = mood === 'thinking' ? gaze.y * size * 0.04 : 0;
  const squishing = mood === 'correct' || mood === 'celebrate';

  const eye = (side: 'l' | 'r') => (
    <motion.div
      key={side}
      style={{
        position: 'relative',
        width: eyeW,
        height: eyeH,
        borderRadius: radius.jelly,
        background: '#2A1206',
        x: dx,
        y: dy,
      }}
      animate={reduced ? {} : { scaleY: squishing ? [1, 0.5, 1] : [1, 1, 0.1, 1] }}
      transition={
        reduced
          ? { duration: 0 }
          : squishing
            ? { duration: 0.4, ease: 'easeInOut' }
            : {
                duration: 5,
                times: [0, 0.94, 0.97, 1],
                repeat: Number.POSITIVE_INFINITY,
                ease: 'easeInOut',
              }
      }
    >
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: '18%',
          right: '20%',
          width: eyeW * 0.34,
          height: eyeW * 0.34,
          borderRadius: radius.jelly,
          background: 'rgba(255,255,255,0.92)',
        }}
      />
    </motion.div>
  );

  return (
    <div style={{ display: 'flex', gap: size * 0.14, marginTop: size * 0.16 }}>
      {eye('l')}
      {eye('r')}
    </div>
  );
}

/**
 * WoboPresence — the signature tutor. A single round squircle jelly, molten and matte, with two cute
 * eyes and an ever-present flickering flame-glow beneath her. She floats and breathes; her mood drives
 * her reactions and her flame. Identity is locked; choreography (mood, gaze, flame) is the page's to
 * compose. She never casts a shadow — the flame is her ground.
 */
export function WoboPresence({
  size = 72,
  mood = 'idle',
  flame,
  gaze = { x: 0, y: 0 },
  fixed = false,
  onTap,
  label = 'Wobo, your tutor',
}: WoboPresenceProps) {
  const reduced = useReducedMotion();
  const flameState = flame ?? flameForMood(mood);

  // Mood-driven body reactions (identity unchanged — only how she moves).
  const bodyAnimate = reduced
    ? {}
    : mood === 'celebrate'
      ? { y: [0, -10, 0, -4, 0], scale: [1, 1.06, 0.97, 1.02, 1] }
      : mood === 'correct'
        ? { scale: [1, 1.08, 0.96, 1] }
        : mood === 'waiting'
          ? { scale: [1, 1.01, 1], opacity: [0.85, 0.85, 0.85] }
          : { scale: [1, 1.03, 0.99, 1.02, 1] }; // idle breathing

  const bodyTransition = reduced
    ? { duration: 0 }
    : mood === 'correct' || mood === 'celebrate'
      ? { duration: 0.7, ease: 'easeInOut' as const }
      : { duration: 4, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' as const };

  const dock = fixed
    ? ({ position: 'fixed', right: 24, bottom: 24, zIndex: zIndex.woboPresence } as const)
    : ({ position: 'relative' } as const);

  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onTap}
      style={{
        ...dock,
        width: size,
        height: size,
        padding: 0,
        border: 0,
        background: 'transparent',
        cursor: onTap ? 'pointer' : 'default',
        WebkitTapHighlightColor: 'transparent',
      }}
      // Gentle vertical float; the flame (a child) bobs with her.
      animate={reduced ? {} : { y: [0, -6, 0] }}
      transition={
        reduced
          ? { duration: 0 }
          : { duration: 3.4, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }
      }
    >
      <Flame size={size} state={flameState} reduced={reduced} />
      <motion.div
        style={{
          position: 'relative',
          width: size,
          height: size,
          // A round squircle jelly — soft, organic, unmistakably her.
          borderRadius: '46% 46% 44% 44% / 48% 48% 46% 46%',
          // Molten, matte: a lighter core to base to deep, with only a whisper of top sheen.
          background: `radial-gradient(120% 120% at 42% 28%, ${MOLTEN.core} 0%, ${MOLTEN.base} 46%, ${MOLTEN.deep} 100%)`,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
        animate={bodyAnimate}
        transition={bodyTransition}
      >
        {/* Matte sheen — a whisper, never glossy. */}
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            background:
              'radial-gradient(60% 40% at 38% 22%, rgba(255,255,255,0.16) 0%, transparent 60%)',
            pointerEvents: 'none',
          }}
        />
        <Eyes size={size} mood={mood} gaze={gaze} reduced={reduced} />
      </motion.div>
    </motion.button>
  );
}
