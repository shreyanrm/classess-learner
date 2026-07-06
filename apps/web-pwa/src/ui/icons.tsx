'use client';

/**
 * The house icon set — hand-crafted marks, never a stock glyph. One register for all of them:
 * 0.9px ink strokes, round caps, and exactly one accent node per mark. 16-18px, currentColor,
 * so every icon takes the ink of the text beside it.
 */

import { motion } from 'framer-motion';

const STROKE = 0.9;

/**
 * The voice mark — NOT a microphone. A sound-bloom: three arcs rising from a single node,
 * a voice opening into the room. While she listens the arcs breathe outward in sequence.
 */
export function MicBloomIcon({ active = false, size = 18 }: { active?: boolean; size?: number }) {
  // arcs centred on the node at (9, 14.5), opening upward
  const arcs = [4, 7, 10].map((r) => {
    const a = Math.PI / 3.4; // half-opening angle from vertical
    const x1 = 9 - r * Math.sin(a);
    const y1 = 14.5 - r * Math.cos(a);
    const x2 = 9 + r * Math.sin(a);
    const y2 = 14.5 - r * Math.cos(a);
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  });
  return (
    <svg
      viewBox="0 0 18 18"
      width={size}
      height={size}
      role="presentation"
      aria-hidden
      style={{ display: 'block', overflow: 'visible' }}
    >
      {arcs.map((d, i) => (
        <motion.path
          key={d}
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth={STROKE}
          strokeLinecap="round"
          animate={
            active
              ? { opacity: [0.25, 1, 0.25], scale: [0.96, 1.05, 0.96] }
              : { opacity: 0.4 + i * 0.25, scale: 1 }
          }
          transition={
            active
              ? {
                  duration: 1.1,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: 'easeInOut',
                  delay: i * 0.18,
                }
              : { duration: 0.3 }
          }
          style={{ transformOrigin: '9px 14.5px' }}
        />
      ))}
      {/* the accent node — the voice itself */}
      <motion.circle
        cx={9}
        cy={14.5}
        r={1.7}
        fill="currentColor"
        animate={active ? { scale: [1, 1.25, 1] } : { scale: 1 }}
        transition={
          active
            ? { duration: 1.1, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }
            : { duration: 0.3 }
        }
        style={{ transformOrigin: '9px 14.5px' }}
      />
    </svg>
  );
}

/** Close — two ink strokes that stop short of the middle; the accent node holds the centre. */
export function CloseIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      role="presentation"
      aria-hidden
      style={{ display: 'block' }}
    >
      <path
        d="M3.6 3.6 L6.6 6.6 M9.4 9.4 L12.4 12.4 M12.4 3.6 L9.4 6.6 M6.6 9.4 L3.6 12.4"
        fill="none"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
      <circle cx={8} cy={8} r={1.1} fill="currentColor" />
    </svg>
  );
}

/** Back — one long stroke home, an open head, the accent node marking where you are. */
export function BackIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      role="presentation"
      aria-hidden
      style={{ display: 'block' }}
    >
      <path
        d="M13.4 8 L4 8 M7.4 4.4 L3.8 8 L7.4 11.6"
        fill="none"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={13.4} cy={8} r={1.1} fill="currentColor" />
    </svg>
  );
}

/** Send — a line of flight rising to the corner, the accent node the word taking off. */
export function SendIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      role="presentation"
      aria-hidden
      style={{ display: 'block' }}
    >
      <path
        d="M3.4 12.6 C6.5 11 9.5 8.5 11.9 5.2 M11.9 5.2 L8.8 5.6 M11.9 5.2 L11.6 8.3"
        fill="none"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={3.4} cy={12.6} r={1.2} fill="currentColor" />
    </svg>
  );
}

/** Chevron — the quiet onward mark; the accent node sits at the turn. */
export function ChevronIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 14 14"
      width={size}
      height={size}
      role="presentation"
      aria-hidden
      style={{ display: 'block' }}
    >
      <path
        d="M5 3 L9.2 7 L5 11"
        fill="none"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={9.2} cy={7} r={1} fill="currentColor" />
    </svg>
  );
}

/** Her four-point spark — the chip mark. The accent IS the mark. */
export function SparkIcon({ size = 12, color = '#1F35E0' }: { size?: number; color?: string }) {
  return (
    <svg
      viewBox="0 0 14 14"
      width={size}
      height={size}
      role="presentation"
      aria-hidden
      style={{ display: 'block' }}
    >
      <path
        d="M7 0.5 C7.9 4 8.9 5 12.5 7 C8.9 9 7.9 10 7 13.5 C6.1 10 5.1 9 1.5 7 C5.1 5 6.1 4 7 0.5 Z"
        fill={color}
      />
    </svg>
  );
}


/** The mic — a sound wave, seven rounded bars; they dance while she listens. Never a wifi arc. */
export function WaveformIcon({ active = false, size = 18 }: { active?: boolean; size?: number }) {
  const bars = [0.3, 0.55, 0.9, 0.5, 0.9, 0.55, 0.3];
  return (
    <span
      aria-hidden
      style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.12, height: size }}
    >
      {bars.map((h, i) => (
        <motion.span
          key={`${i}-${h}`}
          animate={active ? { scaleY: [h, Math.min(1, h + 0.45), h * 0.7, h] } : { scaleY: h }}
          transition={
            active
              ? {
                  duration: 0.7,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: 'easeInOut',
                  delay: i * 0.08,
                }
              : { type: 'spring', stiffness: 300, damping: 24 }
          }
          style={{
            width: Math.max(2, size * 0.13),
            height: size,
            borderRadius: 999,
            background: 'currentColor',
            transformOrigin: '50% 50%',
          }}
        />
      ))}
    </span>
  );
}
