'use client';

/**
 * Course-player chrome, shared across every card: the segmented progress bar (endowed, eased),
 * the bottom action bar (Check/Continue + a quiet "why?"), the horizontal card deck, the
 * hue-tinted Stage every card's visual subject sits on, the celebration particle pop, and the
 * draggable number scrubber. Ink on paper, hairlines, 3px corners (DESIGN.md §2).
 */

import { AnimatePresence, motion } from 'framer-motion';
import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useMemo,
  useRef,
} from 'react';
import { MagneticButton } from '../../ui/kit';

/** `rgba()` from a hex hue — stages and ignites need translucent stops of the subject's hue. */
export function rgba(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/** The one golden accent of the art system. */
export const GOLD = '#FFC93C';

// --- Text registers ------------------------------------------------------------------------------

export const whisper: CSSProperties = {
  fontSize: '0.72rem',
  letterSpacing: '0.14em',
  color: 'var(--clss-ink-500)',
  fontWeight: 500,
};

export const cardTitle: CSSProperties = {
  fontSize: 'clamp(1.5rem, 4vw, 1.9rem)',
  fontWeight: 550,
  letterSpacing: '-0.02em',
  color: 'var(--clss-ink-900)',
  lineHeight: 1.2,
};

export const lead: CSSProperties = {
  fontSize: '1rem',
  lineHeight: 1.6,
  color: 'var(--clss-ink-700)',
};

export const equationType: CSSProperties = {
  fontSize: 'clamp(1.6rem, 5vw, 2.1rem)',
  fontWeight: 550,
  letterSpacing: '-0.01em',
  color: 'var(--clss-ink-900)',
  fontVariantNumeric: 'tabular-nums',
};

// --- The action bar ------------------------------------------------------------------------------

export interface BarAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export interface BarState {
  primary: BarAction;
  /** The quiet affordance — "why?" after an answer, "done" on optional cards. */
  secondary?: BarAction;
}

export function ActionBar({ bar }: { bar: BarState | null }) {
  if (!bar) return null;
  return (
    <div
      style={{
        borderTop: '0.5px solid var(--clss-hairline-on-paper)',
        padding: '14px 24px calc(14px + env(safe-area-inset-bottom, 0px))',
        display: 'flex',
        justifyContent: 'center',
        background: 'var(--clss-paper)',
      }}
    >
      <div
        style={{
          width: 'min(680px, 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 10,
        }}
      >
        {bar.secondary && (
          <MagneticButton variant="quiet" onClick={bar.secondary.onClick}>
            {bar.secondary.label}
          </MagneticButton>
        )}
        <MagneticButton
          variant="primary"
          onClick={bar.primary.onClick}
          disabled={bar.primary.disabled}
          style={{ minWidth: 148, justifyContent: 'center' }}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={bar.primary.label}
              initial={{ opacity: 0, y: 7 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -7 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            >
              {bar.primary.label}
            </motion.span>
          </AnimatePresence>
        </MagneticButton>
      </div>
    </div>
  );
}

// --- Segmented progress (endowed — never starts empty) -------------------------------------------

export function SegmentedProgress({ fraction, segments }: { fraction: number; segments: number }) {
  const f = Math.max(0, Math.min(1, fraction));
  return (
    <div
      aria-hidden
      style={{ display: 'flex', gap: 4, flex: 1, alignItems: 'center', minWidth: 0 }}
    >
      {Array.from({ length: segments }, (_, i) => {
        const fill = Math.max(0, Math.min(1, f * segments - i));
        return (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: segments are positional by nature
            key={i}
            style={{ flex: 1, height: 3, background: 'var(--clss-ink-100)', overflow: 'hidden' }}
          >
            <motion.div
              animate={{ width: `${fill * 100}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 26 }}
              style={{ height: '100%', background: 'var(--clss-ink-900)' }}
            />
          </div>
        );
      })}
    </div>
  );
}

// --- The stage — every card's visual subject sits on one ------------------------------------------

/**
 * A subtly hue-tinted panel that holds a card's centerpiece: 3px radius, tonal fill of the
 * subject's hue, generous height. Tonal stages hold the boss door and the day sky — tension
 * comes from composition, never from darkness.
 */
export function Stage({
  hue = '#1F35E0',
  tint = 0.06,
  tonal = false,
  minHeight = 300,
  children,
  style,
}: {
  hue?: string;
  tint?: number;
  tonal?: boolean;
  minHeight?: number;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      style={{
        position: 'relative',
        width: '100%',
        minHeight,
        borderRadius: 3,
        background: tonal ? '#F1F1F5' : rgba(hue, tint),
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}

// --- The particle pop — a small burst for earned moments ------------------------------------------

export function ParticlePop({ hue = '#1F35E0', count = 12 }: { hue?: string; count?: number }) {
  const parts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + (i % 2) * 0.35;
        const d = 36 + (i % 3) * 18;
        return {
          id: `p${i}`,
          x: Math.cos(a) * d,
          y: Math.sin(a) * d,
          s: i % 3 === 0 ? 7 : 4,
          gold: i % 4 === 0,
        };
      }),
    [count],
  );
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        display: 'grid',
        placeItems: 'center',
        overflow: 'visible',
      }}
    >
      {parts.map((p, i) => (
        <motion.span
          key={p.id}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.3 }}
          transition={{ duration: 0.75, ease: [0.15, 0, 0.2, 1], delay: i * 0.014 }}
          style={{
            position: 'absolute',
            width: p.s,
            height: p.s,
            borderRadius: 999,
            background: p.gold ? GOLD : hue,
          }}
        />
      ))}
    </div>
  );
}

// --- The deck (horizontal slide-spring + stage crossfade) ------------------------------------------

export function Deck({ id, children }: { id: string; children: ReactNode }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={id}
        initial={{ x: 72, opacity: 0, scale: 0.99 }}
        animate={{
          x: 0,
          opacity: 1,
          scale: 1,
          transition: { type: 'spring', stiffness: 320, damping: 30 },
        }}
        exit={{
          x: -56,
          opacity: 0,
          scale: 0.985,
          transition: { duration: 0.18, ease: [0.4, 0, 1, 1] },
        }}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/** One idea per screen: a centered column that breathes. */
export function CardBody({
  children,
  center = true,
  maxWidth = 640,
}: {
  children: ReactNode;
  center?: boolean;
  maxWidth?: number;
}) {
  return (
    <div
      style={{
        flex: 1,
        width: '100%',
        maxWidth,
        margin: '0 auto',
        padding: '28px 24px 36px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: center ? 'center' : 'flex-start',
        gap: 18,
      }}
    >
      {children}
    </div>
  );
}

// --- Scrubber — a draggable number (what-if grammar: numericals are never static) -----------------

export function Scrubber({
  value,
  min,
  max,
  onChange,
  label,
  display,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
  /** Optional display override (e.g. magnitude while the sign renders as the operator). */
  display?: string;
}) {
  const start = useRef<{ x: number; v: number } | null>(null);

  const onPointerDown = (e: ReactPointerEvent<HTMLSpanElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, v: value };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLSpanElement>) => {
    const s = start.current;
    if (!s) return;
    const next = Math.max(min, Math.min(max, s.v + Math.round((e.clientX - s.x) / 16)));
    if (next !== value) onChange(next);
  };
  const onPointerUp = () => {
    start.current = null;
  };
  const onKeyDown = (e: KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault();
      onChange(Math.min(max, value + 1));
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault();
      onChange(Math.max(min, value - 1));
    }
  };

  return (
    <motion.span
      role="slider"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      whileTap={{ scale: 1.07 }}
      transition={{ type: 'spring', stiffness: 400, damping: 24 }}
      style={{
        display: 'inline-block',
        padding: '0 6px 2px',
        borderBottom: '2px dashed var(--clss-ink-500)',
        cursor: 'ew-resize',
        touchAction: 'none',
        userSelect: 'none',
        fontVariantNumeric: 'tabular-nums',
        color: 'var(--clss-ink-900)',
        outlineOffset: 3,
      }}
    >
      {display ?? String(value)}
    </motion.span>
  );
}
