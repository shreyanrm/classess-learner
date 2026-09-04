'use client';

/**
 * The chrome kit — the design system, second cut. Designed, not assembled:
 * a cool near-white canvas, white surfaces with soft 16px corners and real padding,
 * one button system (solid ink · tonal · ghost), one type scale, one spacing rhythm.
 * Every element sits on the same grid and the same baseline. No wireframe borders,
 * no floating fragments, no arbitrary gaps. Cool neutrals only — never warm.
 */

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from 'framer-motion';
import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useFidelity } from '../shell/resilience';
import { sfx } from './sound';

// --- The surface language (cool neutrals) ----------------------------------------------------------
// Theme-driven: light values live in the token layer, `[data-theme="dark"]` swaps graphite in.
export const surface = {
  page: 'var(--wobo-page)',
  card: 'var(--wobo-card)',
  cardHover: 'var(--wobo-card-hover)',
  tonal: 'var(--wobo-tonal)',
  tonalHover: 'var(--wobo-tonal-hover)',
  ink: 'var(--wobo-ink)',
  inkSoft: 'var(--wobo-ink-soft)',
  inkFaint: 'var(--wobo-ink-faint)',
  /**
   * DESIGN.md §Shape: `radius-s 10` buttons and inputs, chips are pills, `radius-m 16` cards and
   * sheets, `radius-l 24` the plane and modals — "nothing sharp, nothing 3 px". These three were
   * still the v3 register (3 px everywhere), and every legacy surface that reads them — the
   * discovery cards, the board search, the syllabus editor, the pickers — drew a 3 px corner on a
   * page whose own kit draws 10, 16 and 24.
   */
  radius: { card: 16, control: 10, pill: 999 },
} as const;

export const inkText: CSSProperties = { color: surface.ink };

/**
 * The fluid scale — every size breathes with the viewport (owner law: sizes adapt to
 * resolution everywhere). Use these, never fixed px, for type and rhythm.
 */
export const fluidType = {
  display: 'clamp(1.9rem, 1.3rem + 2.6vw, 3.2rem)',
  title: 'clamp(1.5rem, 1.15rem + 1.5vw, 2.1rem)',
  heading: 'clamp(1.15rem, 1rem + 0.7vw, 1.5rem)',
  body: 'clamp(0.92rem, 0.88rem + 0.2vw, 1.05rem)',
  small: 'clamp(0.8rem, 0.78rem + 0.1vw, 0.88rem)',
  eyebrow: 'clamp(0.68rem, 0.66rem + 0.08vw, 0.74rem)',
} as const;

export const fluidSpace = {
  xs: 'clamp(6px, 0.5vw, 10px)',
  sm: 'clamp(10px, 1vw, 16px)',
  md: 'clamp(16px, 2vw, 28px)',
  lg: 'clamp(28px, 3.5vw, 52px)',
  xl: 'clamp(44px, 6vw, 96px)',
  gutter: 'clamp(20px, 5vw, 72px)',
} as const;

/** Page titles: one committed scale. */
export const titleType: CSSProperties = {
  margin: 0,
  fontSize: '1.9rem',
  fontWeight: 650,
  letterSpacing: '-0.035em',
  color: surface.ink,
  lineHeight: 1.15,
};

export const subtitleType: CSSProperties = {
  fontSize: '0.95rem',
  color: surface.inkSoft,
  lineHeight: 1.55,
};

export function SectionLabel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        fontSize: '0.78rem',
        fontWeight: 550,
        letterSpacing: '0.01em',
        color: surface.inkFaint,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/**
 * A rule between two things, at the weight the reference draws one: 2 px of `paper-3`, the same
 * rule `.wk-toggle` carries in design/prototypes/app-v1.html. A 1 px line is a hairline, and
 * DESIGN.md's line clause has no hairlines in it.
 */
export function Hairline({ style }: { style?: CSSProperties }) {
  return <div style={{ height: 2, background: 'var(--paper-3)', ...style }} />;
}

// --- Frost — the one floating-chrome recipe (hoisted from the Expedition, DESIGN.md §2) -----------
/**
 * FROST: the single frosted-glass surface for ALL floating chrome — header, drawers, palettes,
 * scene chrome, glass cards. Theme-aware through the frost tokens (dark inverts to graphite glass),
 * sharp 3px corners, one hairline. Depth is frost + hairline, never a shadow. Spread it, never
 * re-mix a one-off blur: `style={{ ...FROST, padding: … }}`.
 */
export const FROST: CSSProperties = {
  background: 'var(--wobo-frost-on-paper)',
  backdropFilter: 'blur(var(--wobo-frost-blur)) saturate(1.2)',
  WebkitBackdropFilter: 'blur(var(--wobo-frost-blur)) saturate(1.2)',
  border: '0.5px solid color-mix(in srgb, var(--wobo-ink) 14%, transparent)',
  borderRadius: surface.radius.card,
};

// --- AmbientWash — one quiet atmospheric layer per surface (richness law §1: ambient depth) --------
/**
 * The single ambient-depth recipe: a soft radial wash in the surface's context hue, sitting behind
 * everything. Drop it as the first child of an `isolation: isolate; position: relative` root — it
 * paints above the root's own background and beneath every content element (z-index -1), never
 * intercepts the pointer, and rides both themes through whatever token-driven `gradient` you hand
 * it. One layer, never noise — richness from light and depth, not from spraying hue (DESIGN §4).
 */
export function AmbientWash({ gradient, style }: { gradient: string; style?: CSSProperties }) {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
        background: gradient,
        ...style,
      }}
    />
  );
}

// --- Pointer tilt (MOTION.md §1) -----------------------------------------------------------------
/**
 * Pointer parallax for hero art (MOTION.md §1): desktop only, ±`range`px, spring-lagged. Returns
 * motion values to bind to a `motion` element's `x`/`y`. Coarse pointers and reduced-motion get 0.
 */
export function usePointerTilt(range = 6) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 120, damping: 18 });
  const y = useSpring(my, { stiffness: 120, damping: 18 });
  const reduced = useReducedMotion() ?? false;
  // Family N: a continuous pointer-driven spring is exactly the grace a 2G-class link and a Data
  // Saver phone cannot afford. Reduced motion already turned it off; low fidelity does now too.
  const lowFi = useFidelity() === 'low';
  useEffect(() => {
    if (
      reduced ||
      lowFi ||
      (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches)
    )
      return;
    const on = (e: PointerEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      mx.set(Math.max(-range, Math.min(range, ((e.clientX - cx) / cx) * range)));
      my.set(Math.max(-range, Math.min(range, ((e.clientY - cy) / cy) * range)));
    };
    window.addEventListener('pointermove', on, { passive: true });
    return () => window.removeEventListener('pointermove', on);
  }, [mx, my, range, reduced, lowFi]);
  return { x, y };
}

// --- Cards ----------------------------------------------------------------------------------------
export function Card({
  children,
  style,
  onClick,
  interactive = Boolean(onClick),
}: {
  children: ReactNode;
  style?: CSSProperties;
  onClick?: () => void;
  interactive?: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <motion.div
      onClick={onClick}
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      whileHover={interactive ? { y: -2 } : undefined}
      whileTap={interactive ? { scale: 0.99 } : undefined}
      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
      style={{
        background: interactive && hover ? surface.cardHover : surface.card,
        borderRadius: surface.radius.card,
        cursor: interactive ? 'pointer' : 'default',
        transition: 'background 0.25s ease, border-color 0.25s ease',
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}

// --- The one button system -------------------------------------------------------------------------
export type ButtonVariant = 'primary' | 'quiet' | 'pigment' | 'ghost';

const BUTTON_LOOK: Record<ButtonVariant, { bg: string; bgHover: string; color: string }> = {
  // Primary inverts with the theme (dark button on light / light button on dark), so its text
  // must ride the ink surface via on-ink rather than a fixed white.
  primary: { bg: surface.ink, bgHover: 'var(--wobo-ink-hover)', color: 'var(--wobo-on-ink)' },
  quiet: { bg: surface.tonal, bgHover: surface.tonalHover, color: surface.ink },
  pigment: {
    bg: 'var(--wobo-ultramarine)',
    bgHover: 'var(--wobo-ultramarine-hover)',
    color: '#FFFFFF',
  },
  ghost: { bg: 'transparent', bgHover: surface.tonal, color: surface.inkSoft },
};

/**
 * MagneticButton — the house button. Solid, tonal, or ghost; a soft lift on hover, a tonal press.
 * Heights are fixed per size so rows of buttons always align.
 *
 * LAW v5 §8 (DESIGN.md §0, "Motion that never stutters"): this button used to translate ITSELF on
 * a spring that followed the pointer, which is the exact loop the law names — the box moves out
 * from under the pointer, the pointer leaves, the spring resets, the box comes back. The pull is
 * gone. The one magnetic control in the product is `.wk-mag` / `attachMagnet`
 * (src/ui/primitives/magnetic.ts), which moves an INNER element and leaves the hit area still; it
 * belongs on the marketing pages, where the cursor is Wobo's. Inside the app the cursor is native
 * because learners are working (DESIGN.md §2), so what a button owes a pointer here is a shadow.
 */
export function MagneticButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  style,
  disabled,
  ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  style?: CSSProperties;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const [hover, setHover] = useState(false);
  const onLeave = useCallback(() => setHover(false), []);

  const height = size === 'lg' ? 50 : size === 'sm' ? 34 : 42;
  const padX = size === 'lg' ? 28 : size === 'sm' ? 14 : 20;
  const font = size === 'lg' ? '1rem' : size === 'sm' ? '0.85rem' : '0.92rem';
  const look = BUTTON_LOOK[variant];

  return (
    <motion.button
      ref={ref}
      aria-label={ariaLabel}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={onLeave}
      onClick={
        disabled
          ? undefined
          : () => {
              sfx.tap();
              onClick?.();
            }
      }
      whileTap={disabled ? undefined : { scale: 0.97 }}
      style={{
        background: hover && !disabled ? look.bgHover : look.bg,
        color: look.color,
        border: 'none',
        // the one thing a hover moves is the light on the surface (DESIGN.md §2, shadow-lift);
        // nothing here transforms the box, so nothing can chase the pointer out of it.
        boxShadow: hover && !disabled ? 'var(--lift)' : 'none',
        height,
        padding: `0 ${padX}px`,
        fontSize: font,
        fontFamily: 'inherit',
        fontWeight: 550,
        borderRadius: surface.radius.control,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        lineHeight: 1,
        // LAW v5 §8: one owner per property. framer-motion owns `transform` here (whileTap), so
        // this transition names only what nothing else drives.
        transition: 'background 0.2s ease, box-shadow 0.2s ease',
        ...style,
      }}
    >
      {children}
    </motion.button>
  );
}

/** A quiet keyboard-hint chip. */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontSize: '0.7rem',
        fontWeight: 550,
        padding: '3px 7px',
        background: surface.tonal,
        borderRadius: 3,
        color: surface.inkSoft,
      }}
    >
      {children}
    </span>
  );
}

// --- TiltCard — spotlight + tilt, subtle -----------------------------------------------------------
export function TiltCard({
  children,
  onClick,
  style,
  spotlight = 'var(--wobo-spotlight)',
  ariaLabel,
  onLitChange,
}: {
  children: ReactNode;
  onClick?: () => void;
  style?: CSSProperties;
  spotlight?: string;
  ariaLabel?: string;
  /** Fires when the pointer arrives/leaves — lets a card swap its own accents in sync. */
  onLitChange?: (lit: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const sx = useMotionValue(50);
  const sy = useMotionValue(50);
  const rotateX = useSpring(rx, { stiffness: 260, damping: 26 });
  const rotateY = useSpring(ry, { stiffness: 260, damping: 26 });
  const [lit, setLit] = useState(false);

  const onMove = useCallback(
    (e: React.PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      // MOTION.md §3: content cards tilt max 1.2° toward the pointer — a whisper, never a wobble.
      ry.set((px - 0.5) * 2.4);
      rx.set((0.5 - py) * 2.4);
      sx.set(px * 100);
      sy.set(py * 100);
    },
    [rx, ry, sx, sy],
  );
  const onLeaveTilt = useCallback(() => {
    rx.set(0);
    ry.set(0);
    setLit(false);
    onLitChange?.(false);
  }, [rx, ry, onLitChange]);

  const spot = useMotionTemplate`radial-gradient(240px circle at ${sx}% ${sy}%, ${spotlight}, transparent 70%)`;

  return (
    <motion.div
      ref={ref}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      onPointerMove={onMove}
      onPointerEnter={() => {
        setLit(true);
        onLitChange?.(true);
      }}
      onPointerLeave={onLeaveTilt}
      onFocus={() => onLitChange?.(true)}
      onBlur={() => onLitChange?.(false)}
      onClick={onClick}
      whileTap={onClick ? { scale: 0.985 } : undefined}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 900,
        background: surface.card,
        borderRadius: surface.radius.card,
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      <motion.div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: spot,
          opacity: lit ? 1 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative' }}>{children}</div>
    </motion.div>
  );
}

// --- AuroraButton — hero doors only ----------------------------------------------------------------
export function AuroraButton({
  children,
  onClick,
  size = 'lg',
  style,
  flashDelay,
}: {
  children: ReactNode;
  onClick?: () => void;
  size?: 'md' | 'lg';
  style?: CSSProperties;
  /** One-shot aurora sweep on entrance (seconds); then it rests until hover. */
  flashDelay?: number;
}) {
  const [lit, setLit] = useState(false);
  const [flashing, setFlashing] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: one-shot on mount
  useEffect(() => {
    if (flashDelay === undefined) return;
    const t1 = setTimeout(() => setFlashing(true), flashDelay * 1000);
    const t2 = setTimeout(() => setFlashing(false), flashDelay * 1000 + 1400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);
  const height = size === 'lg' ? 54 : 42;
  const font = size === 'lg' ? '1.05rem' : '0.95rem';
  // Palette v4's own pigments, in a ring — the sweep is the effect, the colours are the palette's
  // (DESIGN.md §2: no colour outside the six, and night resolves each one a step lighter).
  const aurora =
    'conic-gradient(from 0deg, var(--pig), var(--violet), var(--rose), var(--marigold), var(--mint), var(--pig))';
  return (
    <motion.button
      onPointerEnter={() => setLit(true)}
      onPointerLeave={() => setLit(false)}
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      style={{
        position: 'relative',
        height,
        padding: '0 34px',
        fontSize: font,
        fontWeight: 600,
        fontFamily: 'inherit',
        color: surface.ink,
        background: surface.card,
        borderRadius: 3,
        cursor: 'pointer',
        overflow: 'hidden',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      <motion.span
        aria-hidden
        animate={lit || flashing ? { opacity: 1, rotate: 360 } : { opacity: 0, rotate: 0 }}
        transition={
          lit || flashing
            ? {
                opacity: { duration: 0.3 },
                rotate: {
                  duration: flashing ? 1.6 : 6,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: 'linear',
                },
              }
            : { duration: 0.5 }
        }
        style={{
          position: 'absolute',
          inset: -70,
          background: aurora,
          filter: 'blur(20px)',
          opacity: 0,
          pointerEvents: 'none',
        }}
      />
      <span
        aria-hidden
        style={{
          position: 'absolute',
          inset: 2,
          background: surface.card,
          borderRadius: 2,
          pointerEvents: 'none',
        }}
      />
      <span
        style={{
          position: 'relative',
          background: lit
            ? 'linear-gradient(90deg, var(--pig), var(--violet), var(--rose))'
            : 'none',
          WebkitBackgroundClip: lit ? 'text' : undefined,
          backgroundClip: lit ? 'text' : undefined,
          WebkitTextFillColor: lit ? 'transparent' : undefined,
          // LAW v5 §8: never `all` — it owns transform and opacity too, and framer drives both on
          // this button. Name the one property that changes.
          transition: 'background 0.25s ease',
        }}
      >
        {children}
      </span>
    </motion.button>
  );
}

// --- Entrance choreography ---------------------------------------------------------------------------
/** Parent variants: children cascade in on staggered springs. */
export const cascade = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
} as const;

/** Child variants: rise, settle, and come into focus. */
export const rise = {
  hidden: { opacity: 0, y: 22, filter: 'blur(6px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { type: 'spring', stiffness: 230, damping: 26, mass: 0.9 },
  },
} as const;

/** One-off reveal for elements outside a cascade. */
export function Reveal({
  children,
  delay = 0,
  style,
}: {
  children: ReactNode;
  delay?: number;
  style?: CSSProperties;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ type: 'spring', stiffness: 230, damping: 26, mass: 0.9, delay }}
      style={style}
    >
      {children}
    </motion.div>
  );
}
