'use client';

/**
 * The menagerie — twenty-seven animals, faithfully ported from the character catalog.
 * Same rules as the cast (see shared.tsx): flat fills, soft radii, one idle life. Each keeps
 * its native catalog viewBox; the CSS idle classes (bob/hop/swim/flutter/blink) become cheap
 * framer-motion groups that halt for prefers-reduced-motion. Difference is paint and silhouette.
 *
 * <Animal kind="fox" size={64} animate /> — or import a single species by name.
 */

import { motion, useReducedMotion } from 'framer-motion';
import { type ComponentType, createContext, type ReactNode, useContext } from 'react';

/** The catalog's contact-shadow fill, kept exact. */
export const A_GROUND = 'rgba(14,14,16,0.06)';

export interface AnimalProps {
  size?: number;
  animate?: boolean;
  flip?: boolean;
  /** Stagger seed so no two figures blink or bob in sync. */
  seed?: number;
}

// --- idle life: the catalog keyframes, one motion group each ------------------------------------
type IdleSpec = {
  dur: number;
  delay?: number;
  keyframes: Record<string, number[]>;
  times?: number[];
  origin?: string;
};

const IDLE = {
  bob: { dur: 3.4, keyframes: { y: [0, -5, 0] } },
  bob2: { dur: 4.1, keyframes: { y: [0, -5, 0] } },
  bob3: { dur: 3.8, delay: 0.3, keyframes: { y: [0, -5, 0] } },
  hop: { dur: 2.6, keyframes: { y: [0, 0, -10, 0] }, times: [0, 0.7, 0.82, 1] },
  swim: { dur: 4, keyframes: { x: [0, 6, 0], rotate: [-2, 2, -2] }, origin: 'center' },
  flutter: { dur: 1.8, keyframes: { y: [0, -6, 0], rotate: [-4, 4, -4] }, origin: 'center' },
  float: { dur: 4, keyframes: { y: [0, -7, 0], rotate: [0, 10, 0] }, origin: 'center' },
  sway: { dur: 4.4, keyframes: { rotate: [-2.5, 2.5, -2.5] }, origin: 'center' },
  wave: { dur: 2.4, keyframes: { rotate: [10, -16, 10] }, origin: '80% 90%' },
} satisfies Record<string, IdleSpec>;

type IdleKind = keyof typeof IDLE;

/** animate + seed flow down to every Idle/Blink so a figure's whole body shares one clock. */
const FigCtx = createContext<{ animate: boolean; seed: number }>({ animate: true, seed: 0 });

/** One catalog idle group (bob / hop / swim / flutter / float / sway / wave). */
export function Idle({ kind, children }: { kind: IdleKind; children: ReactNode }) {
  const { animate, seed } = useContext(FigCtx);
  const spec: IdleSpec = IDLE[kind];
  const still = useReducedMotion() || !animate;
  return (
    <motion.g
      animate={still ? undefined : spec.keyframes}
      transition={{
        duration: spec.dur,
        times: spec.times,
        repeat: Number.POSITIVE_INFINITY,
        ease: 'easeInOut',
        delay: (spec.delay ?? 0) + seed * 0.3,
      }}
      style={spec.origin ? { transformBox: 'fill-box', transformOrigin: spec.origin } : undefined}
    >
      {children}
    </motion.g>
  );
}

/** The eye-blink group — a quick squash every few seconds. */
export function Blink({ children }: { children: ReactNode }) {
  const { animate, seed } = useContext(FigCtx);
  const still = useReducedMotion() || !animate;
  return (
    <motion.g
      animate={still ? undefined : { scaleY: [1, 1, 0.1, 1] }}
      transition={{
        duration: 4.2,
        times: [0, 0.92, 0.96, 1],
        repeat: Number.POSITIVE_INFINITY,
        delay: 0.4 + seed * 0.7,
      }}
      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
    >
      {children}
    </motion.g>
  );
}

/** The shared canvas — each figure keeps its own catalog viewBox; size drives width. */
export function CatalogFigure({
  viewBox,
  size = 96,
  animate = true,
  seed = 0,
  flip,
  label,
  children,
}: {
  viewBox: string;
  size?: number;
  animate?: boolean;
  seed?: number;
  flip?: boolean;
  label?: string;
  children: ReactNode;
}) {
  const [, , vwStr, vhStr] = viewBox.split(' ');
  const vw = Number(vwStr);
  const vh = Number(vhStr);
  return (
    <FigCtx.Provider value={{ animate, seed }}>
      <svg
        viewBox={viewBox}
        width={size}
        height={(size * vh) / vw}
        role={label ? 'img' : 'presentation'}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        style={{ display: 'block', overflow: 'visible' }}
      >
        <g transform={flip ? `translate(${vw} 0) scale(-1 1)` : undefined}>{children}</g>
      </svg>
    </FigCtx.Provider>
  );
}

// --- the twenty-seven ----------------------------------------------------------------------------

/** Dog. */
export function Dog({ size, animate = true, flip, seed = 0 }: AnimalProps) {
  return (
    <CatalogFigure
      viewBox="0 0 150 120"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="dog"
    >
      <ellipse cx="78" cy="112" rx="48" ry="6" fill={A_GROUND} />
      <Idle kind="bob">
        <path
          d="M118 70q18 -6 15 -22"
          fill="none"
          stroke="#D9A368"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <ellipse cx="80" cy="78" rx="40" ry="23" fill="#D9A368" />
        <rect x="52" y="92" width="9" height="20" rx="4.5" fill="#C8924F" />
        <rect x="68" y="94" width="9" height="18" rx="4.5" fill="#C8924F" />
        <rect x="92" y="94" width="9" height="18" rx="4.5" fill="#C8924F" />
        <rect x="104" y="92" width="9" height="20" rx="4.5" fill="#C8924F" />
        <circle cx="44" cy="58" r="22" fill="#D9A368" />
        <path d="M27 44q-11 4 -6 24 q9 -7 13 -16Z" fill="#C8924F" />
        <path d="M61 44q11 4 6 24 q-9 -7 -13 -16Z" fill="#C8924F" />
        <ellipse cx="40" cy="66" rx="12" ry="9" fill="#F2DCBC" />
        <circle cx="33" cy="63" r="3.2" fill="#241F1B" />
        <Blink>
          <circle cx="42" cy="54" r="2.4" fill="#241F1B" />
          <circle cx="53" cy="54" r="2.4" fill="#241F1B" />
        </Blink>
      </Idle>
    </CatalogFigure>
  );
}

/** Cat. */
export function Cat({ size, animate = true, flip, seed = 0 }: AnimalProps) {
  return (
    <CatalogFigure
      viewBox="0 0 150 120"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="cat"
    >
      <ellipse cx="76" cy="112" rx="46" ry="6" fill={A_GROUND} />
      <Idle kind="bob2">
        <path
          d="M116 80q22 0 18 -26"
          fill="none"
          stroke="#9AA0AA"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <ellipse cx="78" cy="80" rx="38" ry="22" fill="#9AA0AA" />
        <rect x="54" y="94" width="8" height="18" rx="4" fill="#878D97" />
        <rect x="70" y="96" width="8" height="16" rx="4" fill="#878D97" />
        <rect x="90" y="96" width="8" height="16" rx="4" fill="#878D97" />
        <rect x="102" y="94" width="8" height="18" rx="4" fill="#878D97" />
        <circle cx="46" cy="60" r="21" fill="#9AA0AA" />
        <path d="M30 44l-2 -16 16 10Z" fill="#9AA0AA" />
        <path d="M62 44l2 -16 -16 10Z" fill="#9AA0AA" />
        <Blink>
          <path
            d="M37 60q4 4 8 0"
            stroke="#241F1B"
            strokeWidth="2.2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M49 60q4 4 8 0"
            stroke="#241F1B"
            strokeWidth="2.2"
            fill="none"
            strokeLinecap="round"
          />
        </Blink>
        <path d="M47 67l-3 3 3 2 3 -2Z" fill="#E0518A" />
        <path d="M44 72v3M50 72v3" stroke="#878D97" strokeWidth="1.4" />
        <path
          d="M30 66h-12M30 70h-11M64 66h12M64 70h11"
          stroke="#C9CDD4"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </Idle>
    </CatalogFigure>
  );
}

/** Rabbit. */
export function Rabbit({ size, animate = true, flip, seed = 0 }: AnimalProps) {
  return (
    <CatalogFigure
      viewBox="0 0 130 130"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="rabbit"
    >
      <ellipse cx="64" cy="120" rx="38" ry="5" fill={A_GROUND} />
      <Idle kind="hop">
        <ellipse cx="64" cy="90" rx="30" ry="26" fill="#EDEDF0" />
        <ellipse cx="50" cy="40" rx="8" ry="26" fill="#EDEDF0" />
        <ellipse cx="50" cy="42" rx="3.5" ry="18" fill="#F3C9D6" />
        <ellipse cx="72" cy="40" rx="8" ry="26" fill="#EDEDF0" />
        <ellipse cx="72" cy="42" rx="3.5" ry="18" fill="#F3C9D6" />
        <circle cx="64" cy="74" r="18" fill="#EDEDF0" />
        <Blink>
          <circle cx="57" cy="72" r="2.4" fill="#241F1B" />
          <circle cx="71" cy="72" r="2.4" fill="#241F1B" />
        </Blink>
        <path d="M62 79l2 2 2 -2Z" fill="#E0518A" />
        <circle cx="90" cy="100" r="9" fill="#fff" />
      </Idle>
    </CatalogFigure>
  );
}

/** Sheep. */
export function Sheep({ size, animate = true, flip, seed = 0 }: AnimalProps) {
  return (
    <CatalogFigure
      viewBox="0 0 150 120"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="sheep"
    >
      <ellipse cx="74" cy="112" rx="44" ry="6" fill={A_GROUND} />
      <Idle kind="bob">
        <g fill="#F4F4F2">
          <circle cx="56" cy="74" r="16" />
          <circle cx="74" cy="68" r="18" />
          <circle cx="92" cy="74" r="16" />
          <circle cx="64" cy="86" r="16" />
          <circle cx="86" cy="86" r="16" />
        </g>
        <rect x="58" y="96" width="7" height="16" rx="3.5" fill="#3A3A40" />
        <rect x="86" y="96" width="7" height="16" rx="3.5" fill="#3A3A40" />
        <ellipse cx="42" cy="78" rx="14" ry="13" fill="#3A3A40" />
        <path d="M30 70q-7 -2 -7 6 q5 1 8 -2Z" fill="#3A3A40" />
        <path
          d="M44 66q4 -7 10 -3"
          stroke="#F4F4F2"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />
        <Blink>
          <circle cx="40" cy="76" r="2.4" fill="#fff" />
          <circle cx="48" cy="76" r="2.4" fill="#fff" />
        </Blink>
      </Idle>
    </CatalogFigure>
  );
}

/** Goat. */
export function Goat({ size, animate = true, flip, seed = 0 }: AnimalProps) {
  return (
    <CatalogFigure
      viewBox="0 0 150 120"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="goat"
    >
      <ellipse cx="74" cy="112" rx="44" ry="6" fill={A_GROUND} />
      <Idle kind="bob2">
        <ellipse cx="78" cy="80" rx="36" ry="21" fill="#E8E3DA" />
        <rect x="58" y="94" width="8" height="18" rx="4" fill="#CFC8BB" />
        <rect x="92" y="94" width="8" height="18" rx="4" fill="#CFC8BB" />
        <rect x="74" y="96" width="8" height="16" rx="4" fill="#CFC8BB" />
        <path
          d="M110 74q20 -2 14 -22"
          fill="none"
          stroke="#E8E3DA"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <ellipse cx="46" cy="64" rx="18" ry="15" fill="#E8E3DA" />
        <path
          d="M38 50q-3 -16 -10 -18 M54 50q3 -16 10 -18"
          stroke="#A99E8C"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
        <path d="M30 66q-9 1 -9 8 q6 0 10 -3Z" fill="#E8E3DA" />
        <Blink>
          <circle cx="40" cy="62" r="2.4" fill="#241F1B" />
          <circle cx="52" cy="62" r="2.4" fill="#241F1B" />
        </Blink>
        <path
          d="M44 72v8q2 2 4 0"
          stroke="#CFC8BB"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      </Idle>
    </CatalogFigure>
  );
}

/** Cow. */
export function Cow({ size, animate = true, flip, seed = 0 }: AnimalProps) {
  return (
    <CatalogFigure
      viewBox="0 0 160 120"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="cow"
    >
      <ellipse cx="82" cy="112" rx="50" ry="6" fill={A_GROUND} />
      <Idle kind="bob">
        <ellipse cx="86" cy="78" rx="44" ry="25" fill="#F4F4F2" />
        <ellipse cx="74" cy="70" rx="13" ry="10" fill="#3A3A40" />
        <ellipse cx="104" cy="84" rx="11" ry="9" fill="#3A3A40" />
        <rect x="58" y="96" width="9" height="18" rx="4.5" fill="#D9D9D6" />
        <rect x="74" y="98" width="9" height="16" rx="4.5" fill="#D9D9D6" />
        <rect x="96" y="98" width="9" height="16" rx="4.5" fill="#D9D9D6" />
        <rect x="110" y="96" width="9" height="18" rx="4.5" fill="#D9D9D6" />
        <path
          d="M126 64q16 0 12 -18"
          fill="none"
          stroke="#F4F4F2"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <circle cx="138" cy="48" r="4" fill="#3A3A40" />
        <ellipse cx="44" cy="62" rx="20" ry="17" fill="#F4F4F2" />
        <path d="M26 50q-8 -10 -2 -16 q8 4 8 14Z" fill="#CFC8BB" />
        <path d="M62 50q8 -10 2 -16 q-8 4 -8 14Z" fill="#CFC8BB" />
        <ellipse cx="22" cy="60" rx="8" ry="9" fill="#E0E0DD" />
        <ellipse cx="66" cy="60" rx="8" ry="9" fill="#E0E0DD" />
        <Blink>
          <circle cx="38" cy="60" r="2.6" fill="#241F1B" />
          <circle cx="52" cy="60" r="2.6" fill="#241F1B" />
        </Blink>
        <ellipse cx="45" cy="72" rx="13" ry="9" fill="#F3C9D6" />
        <circle cx="40" cy="72" r="2" fill="#C98BA0" />
        <circle cx="50" cy="72" r="2" fill="#C98BA0" />
      </Idle>
    </CatalogFigure>
  );
}

/** Horse. */
export function Horse({ size, animate = true, flip, seed = 0 }: AnimalProps) {
  return (
    <CatalogFigure
      viewBox="0 0 160 130"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="horse"
    >
      <ellipse cx="82" cy="122" rx="50" ry="6" fill={A_GROUND} />
      <Idle kind="bob2">
        <ellipse cx="84" cy="78" rx="42" ry="24" fill="#B5773F" />
        <rect x="56" y="96" width="9" height="24" rx="4.5" fill="#9C6431" />
        <rect x="72" y="98" width="9" height="22" rx="4.5" fill="#9C6431" />
        <rect x="98" y="98" width="9" height="22" rx="4.5" fill="#9C6431" />
        <rect x="112" y="96" width="9" height="24" rx="4.5" fill="#9C6431" />
        <path
          d="M122 66q20 6 16 38"
          fill="none"
          stroke="#7C4E26"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path d="M40 78 L34 40 q-2 -10 8 -14 l14 8 q8 6 6 22Z" fill="#B5773F" />
        <path
          d="M38 40q-8 8 -6 36 M46 34q-6 10 -4 38 M54 32q-4 12 -2 36"
          stroke="#7C4E26"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
        <path d="M34 40q-4 -6 0 -12 q5 3 6 10Z" fill="#B5773F" />
        <Blink>
          <circle cx="40" cy="52" r="2.6" fill="#241F1B" />
        </Blink>
        <ellipse cx="40" cy="66" rx="6" ry="8" fill="#9C6431" />
        <circle cx="40" cy="68" r="2" fill="#241F1B" />
      </Idle>
    </CatalogFigure>
  );
}

/** Pig. */
export function Pig({ size, animate = true, flip, seed = 0 }: AnimalProps) {
  return (
    <CatalogFigure
      viewBox="0 0 150 120"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="pig"
    >
      <ellipse cx="74" cy="112" rx="44" ry="6" fill={A_GROUND} />
      <Idle kind="bob">
        <path d="M110 82q14 2 12 -10 q-6 6 -12 4Z" fill="#F3B3C0" />
        <ellipse cx="78" cy="80" rx="38" ry="23" fill="#F3B3C0" />
        <rect x="56" y="96" width="9" height="16" rx="4.5" fill="#E095A6" />
        <rect x="90" y="96" width="9" height="16" rx="4.5" fill="#E095A6" />
        <circle cx="46" cy="64" r="21" fill="#F3B3C0" />
        <path d="M34 48l-4 -10 12 4Z" fill="#E095A6" />
        <path d="M58 48l4 -10 -12 4Z" fill="#E095A6" />
        <Blink>
          <circle cx="40" cy="62" r="2.4" fill="#241F1B" />
          <circle cx="52" cy="62" r="2.4" fill="#241F1B" />
        </Blink>
        <ellipse cx="46" cy="72" rx="10" ry="7" fill="#E095A6" />
        <circle cx="43" cy="72" r="1.8" fill="#C2718A" />
        <circle cx="49" cy="72" r="1.8" fill="#C2718A" />
      </Idle>
    </CatalogFigure>
  );
}

/** Bird. */
export function Bird({ size, animate = true, flip, seed = 0 }: AnimalProps) {
  return (
    <CatalogFigure
      viewBox="0 0 120 120"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="bird"
    >
      <ellipse cx="60" cy="112" rx="30" ry="5" fill={A_GROUND} />
      <Idle kind="bob3">
        <ellipse cx="60" cy="72" rx="26" ry="30" fill="#39A0DE" />
        <ellipse cx="60" cy="80" rx="16" ry="20" fill="#CDEBFA" />
        <path d="M40 64q-16 4 -10 24 q10 -4 14 -16Z" fill="#2E86BE" />
        <path d="M82 76l16 -4 -12 10Z" fill="#F2A93B" />
        <Blink>
          <circle cx="54" cy="58" r="2.6" fill="#241F1B" />
          <circle cx="68" cy="58" r="2.6" fill="#241F1B" />
        </Blink>
        <path d="M76 62l10 -2 -8 6Z" fill="#F2A93B" />
        <path d="M52 102v8M68 102v8" stroke="#F2A93B" strokeWidth="3" strokeLinecap="round" />
      </Idle>
    </CatalogFigure>
  );
}

/** Duck. */
export function Duck({ size, animate = true, flip, seed = 0 }: AnimalProps) {
  return (
    <CatalogFigure
      viewBox="0 0 130 120"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="duck"
    >
      <ellipse cx="66" cy="112" rx="34" ry="5" fill={A_GROUND} />
      <Idle kind="bob">
        <ellipse cx="68" cy="78" rx="34" ry="22" fill="#F2C53D" />
        <path d="M96 70q12 -2 12 8 q-7 2 -12 -2Z" fill="#EBB81F" />
        <circle cx="42" cy="58" r="19" fill="#F2C53D" />
        <path d="M24 58l-14 2 14 6Z" fill="#F2862E" />
        <Blink>
          <circle cx="40" cy="54" r="2.6" fill="#241F1B" />
        </Blink>
        <path d="M58 98l-3 8M70 98l3 8" stroke="#F2862E" strokeWidth="3" strokeLinecap="round" />
      </Idle>
    </CatalogFigure>
  );
}

/** Hen. */
export function Hen({ size, animate = true, flip, seed = 0 }: AnimalProps) {
  return (
    <CatalogFigure
      viewBox="0 0 130 120"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="hen"
    >
      <ellipse cx="64" cy="112" rx="32" ry="5" fill={A_GROUND} />
      <Idle kind="bob2">
        <ellipse cx="66" cy="80" rx="30" ry="22" fill="#F4F4F2" />
        <path d="M92 76q12 0 10 10 q-6 1 -10 -3Z" fill="#E2E2DF" />
        <circle cx="46" cy="60" r="17" fill="#F4F4F2" />
        <path d="M40 44q3 -8 8 -4 q-2 4 1 7Z" fill="#E0518A" />
        <path d="M48 42q4 -7 9 -2 q-3 3 -1 7Z" fill="#E0518A" />
        <path d="M30 60l-12 2 12 5Z" fill="#F2862E" />
        <path
          d="M44 70q3 5 8 1"
          fill="none"
          stroke="#E0518A"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <Blink>
          <circle cx="42" cy="57" r="2.4" fill="#241F1B" />
        </Blink>
        <path d="M58 100l-3 8M70 100l3 8" stroke="#F2862E" strokeWidth="3" strokeLinecap="round" />
      </Idle>
    </CatalogFigure>
  );
}

/** Koi. */
export function Koi({ size, animate = true, flip, seed = 0 }: AnimalProps) {
  return (
    <CatalogFigure
      viewBox="0 0 150 110"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="koi"
    >
      <Idle kind="swim">
        <path
          d="M30 55C30 35 60 32 86 42 q14 -16 28 -14 q-8 12 -2 22 q6 10 2 22 q-6 -2 -28 -14 C60 78 30 75 30 55Z"
          fill="#F4F4F2"
        />
        <path d="M52 44q14 -8 30 -2 q-4 8 -2 13 q-16 4 -28 -4Z" fill="#F2862E" />
        <ellipse cx="44" cy="62" rx="12" ry="7" fill="#D6196F" />
        <path d="M30 55q-14 -8 -22 -4 q6 4 6 4 q-6 2 -6 4 q8 4 22 -4Z" fill="#F2862E" />
        <Blink>
          <circle cx="40" cy="50" r="2.4" fill="#241F1B" />
        </Blink>
      </Idle>
    </CatalogFigure>
  );
}

/** Butterfly. */
export function Butterfly({ size, animate = true, flip, seed = 0 }: AnimalProps) {
  return (
    <CatalogFigure
      viewBox="0 0 120 110"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="butterfly"
    >
      <Idle kind="flutter">
        <path d="M58 55q-22 -28 -40 -14 q-6 16 8 24 q18 8 32 -10Z" fill="#8E6FC4" />
        <path d="M62 55q22 -28 40 -14 q6 16 -8 24 q-18 8 -32 -10Z" fill="#A57FE6" />
        <path d="M58 60q-18 22 -34 12 q-2 -14 12 -20 q14 -4 22 8Z" fill="#6D4AE0" />
        <path d="M62 60q18 22 34 12 q2 -14 -12 -20 q-14 -4 -22 8Z" fill="#8E6FC4" />
        <rect x="58" y="42" width="4" height="34" rx="2" fill="#241F1B" />
        <path
          d="M58 42q-4 -8 -10 -8M62 42q4 -8 10 -8"
          stroke="#241F1B"
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
        />
      </Idle>
    </CatalogFigure>
  );
}

/** Bee. */
export function Bee({ size, animate = true, flip, seed = 0 }: AnimalProps) {
  return (
    <CatalogFigure
      viewBox="0 0 120 110"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="bee"
    >
      <Idle kind="flutter">
        <ellipse cx="58" cy="60" rx="13" ry="22" fill="#A0A4AD" opacity=".5" />
        <ellipse cx="74" cy="60" rx="13" ry="22" fill="#A0A4AD" opacity=".5" />
        <ellipse cx="60" cy="62" rx="26" ry="18" fill="#F2C53D" />
        <path d="M52 48q4 28 16 28M62 46q4 28 16 28" stroke="#2B2B30" strokeWidth="5" fill="none" />
        <circle cx="40" cy="58" r="11" fill="#2B2B30" />
        <Blink>
          <circle cx="37" cy="56" r="2" fill="#fff" />
          <circle cx="44" cy="56" r="2" fill="#fff" />
        </Blink>
        <path d="M34 48l-4 -8M44 46l2 -8" stroke="#2B2B30" strokeWidth="2" strokeLinecap="round" />
      </Idle>
    </CatalogFigure>
  );
}

/** Turtle. */
export function Turtle({ size, animate = true, flip, seed = 0 }: AnimalProps) {
  return (
    <CatalogFigure
      viewBox="0 0 150 110"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="turtle"
    >
      <ellipse cx="74" cy="100" rx="44" ry="5" fill={A_GROUND} />
      <Idle kind="bob">
        <ellipse cx="74" cy="66" rx="40" ry="26" fill="#3E8E5A" />
        <path d="M74 40a26 26 0 0 1 0 52a26 26 0 0 1 0 -52Z" fill="#5AAE76" />
        <path d="M74 44v44M54 52l40 28M94 52l-40 28" stroke="#3E8E5A" strokeWidth="2.5" />
        <rect x="48" y="84" width="10" height="12" rx="5" fill="#2E6E45" />
        <rect x="92" y="84" width="10" height="12" rx="5" fill="#2E6E45" />
        <circle cx="32" cy="62" r="13" fill="#5AAE76" />
        <Blink>
          <circle cx="28" cy="60" r="2.2" fill="#241F1B" />
        </Blink>
      </Idle>
    </CatalogFigure>
  );
}

/** Fox. */
export function Fox({ size, animate = true, flip, seed = 0 }: AnimalProps) {
  return (
    <CatalogFigure
      viewBox="0 0 120 120"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="fox"
    >
      <ellipse cx="60" cy="112" rx="34" ry="5" fill={A_GROUND} />
      <Idle kind="bob">
        <ellipse cx="60" cy="92" rx="26" ry="17" fill="#E8843C" />
        <path d="M30 38l8 26 18 -12Z" fill="#E8843C" />
        <path d="M90 38l-8 26 -18 -12Z" fill="#E8843C" />
        <path d="M35 44l4 14 9 -6Z" fill="#3A2A22" />
        <path d="M85 44l-4 14 -9 -6Z" fill="#3A2A22" />
        <circle cx="60" cy="56" r="26" fill="#E8843C" />
        <path d="M60 60q-22 0 -22 13 q0 11 22 11 q22 0 22 -11 q0 -13 -22 -13Z" fill="#F7F2EA" />
        <Blink>
          <circle cx="50" cy="54" r="2.8" fill="#241F1B" />
          <circle cx="70" cy="54" r="2.8" fill="#241F1B" />
        </Blink>
        <path d="M60 64l-4 4h8Z" fill="#241F1B" />
        <path d="M60 68v4" stroke="#9C6B3F" strokeWidth="1.6" />
      </Idle>
    </CatalogFigure>
  );
}

/** Bear. */
export function Bear({ size, animate = true, flip, seed = 0 }: AnimalProps) {
  return (
    <CatalogFigure
      viewBox="0 0 120 120"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="bear"
    >
      <ellipse cx="60" cy="112" rx="34" ry="5" fill={A_GROUND} />
      <Idle kind="bob2">
        <ellipse cx="60" cy="92" rx="27" ry="18" fill="#9C6B45" />
        <circle cx="60" cy="96" r="9" fill="#C39A6E" />
        <circle cx="38" cy="38" r="11" fill="#9C6B45" />
        <circle cx="82" cy="38" r="11" fill="#9C6B45" />
        <circle cx="38" cy="38" r="5" fill="#7C5436" />
        <circle cx="82" cy="38" r="5" fill="#7C5436" />
        <circle cx="60" cy="56" r="27" fill="#9C6B45" />
        <ellipse cx="60" cy="66" rx="14" ry="11" fill="#D8BF9C" />
        <ellipse cx="60" cy="62" rx="4.5" ry="3.5" fill="#241F1B" />
        <Blink>
          <circle cx="50" cy="52" r="2.8" fill="#241F1B" />
          <circle cx="70" cy="52" r="2.8" fill="#241F1B" />
        </Blink>
      </Idle>
    </CatalogFigure>
  );
}

/** Panda. */
export function Panda({ size, animate = true, flip, seed = 0 }: AnimalProps) {
  return (
    <CatalogFigure
      viewBox="0 0 120 120"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="panda"
    >
      <ellipse cx="60" cy="112" rx="34" ry="5" fill={A_GROUND} />
      <Idle kind="bob">
        <ellipse cx="60" cy="92" rx="27" ry="18" fill="#F4F4F2" />
        <ellipse cx="42" cy="98" rx="8" ry="6" fill="#2B2B30" />
        <ellipse cx="78" cy="98" rx="8" ry="6" fill="#2B2B30" />
        <circle cx="40" cy="38" r="10" fill="#2B2B30" />
        <circle cx="80" cy="38" r="10" fill="#2B2B30" />
        <circle cx="60" cy="56" r="27" fill="#F4F4F2" />
        <ellipse cx="49" cy="56" rx="6.5" ry="8.5" fill="#2B2B30" transform="rotate(-18 49 56)" />
        <ellipse cx="71" cy="56" rx="6.5" ry="8.5" fill="#2B2B30" transform="rotate(18 71 56)" />
        <Blink>
          <circle cx="49" cy="56" r="2.6" fill="#fff" />
          <circle cx="71" cy="56" r="2.6" fill="#fff" />
        </Blink>
        <ellipse cx="60" cy="66" rx="3.6" ry="2.8" fill="#2B2B30" />
      </Idle>
    </CatalogFigure>
  );
}

/** Owl. */
export function Owl({ size, animate = true, flip, seed = 0 }: AnimalProps) {
  return (
    <CatalogFigure
      viewBox="0 0 120 120"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="owl"
    >
      <ellipse cx="60" cy="112" rx="32" ry="5" fill={A_GROUND} />
      <Idle kind="bob3">
        <path d="M30 60q0 -34 30 -34 q30 0 30 34 q0 38 -30 38 q-30 0 -30 -38Z" fill="#A9794A" />
        <path d="M34 34l8 16 -16 2Z" fill="#A9794A" />
        <path d="M86 34l-8 16 16 2Z" fill="#A9794A" />
        <path d="M60 64q-22 0 -22 18 q8 14 22 14 q14 0 22 -14 q0 -18 -22 -18Z" fill="#C8A06A" />
        <circle cx="48" cy="54" r="12" fill="#F7F2EA" />
        <circle cx="72" cy="54" r="12" fill="#F7F2EA" />
        <Blink>
          <circle cx="48" cy="54" r="5" fill="#241F1B" />
          <circle cx="72" cy="54" r="5" fill="#241F1B" />
          <circle cx="49.5" cy="52.5" r="1.6" fill="#fff" />
          <circle cx="73.5" cy="52.5" r="1.6" fill="#fff" />
        </Blink>
        <path d="M60 60l-5 6h10Z" fill="#F2A93B" />
        <path d="M50 98l-3 8M70 98l3 8" stroke="#F2A93B" strokeWidth="3" strokeLinecap="round" />
      </Idle>
    </CatalogFigure>
  );
}

/** Frog. */
export function Frog({ size, animate = true, flip, seed = 0 }: AnimalProps) {
  return (
    <CatalogFigure
      viewBox="0 0 120 110"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="frog"
    >
      <ellipse cx="60" cy="102" rx="36" ry="5" fill={A_GROUND} />
      <Idle kind="bob">
        <ellipse cx="60" cy="74" rx="34" ry="26" fill="#5DBB63" />
        <path d="M30 96q-6 6 0 8h10q-2 -6 -10 -8ZM90 96q6 6 0 8h-10q2 -6 10 -8Z" fill="#4CA255" />
        <circle cx="42" cy="42" r="13" fill="#5DBB63" />
        <circle cx="78" cy="42" r="13" fill="#5DBB63" />
        <Blink>
          <circle cx="42" cy="42" r="6" fill="#fff" />
          <circle cx="78" cy="42" r="6" fill="#fff" />
          <circle cx="42" cy="43" r="3" fill="#241F1B" />
          <circle cx="78" cy="43" r="3" fill="#241F1B" />
        </Blink>
        <path
          d="M40 76q20 14 40 0"
          fill="none"
          stroke="#3C8746"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <circle cx="52" cy="66" r="1.6" fill="#3C8746" />
        <circle cx="68" cy="66" r="1.6" fill="#3C8746" />
      </Idle>
    </CatalogFigure>
  );
}

/** Penguin. */
export function Penguin({ size, animate = true, flip, seed = 0 }: AnimalProps) {
  return (
    <CatalogFigure
      viewBox="0 0 110 120"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="penguin"
    >
      <ellipse cx="55" cy="112" rx="30" ry="5" fill={A_GROUND} />
      <Idle kind="bob2">
        <ellipse cx="55" cy="70" rx="30" ry="40" fill="#33343A" />
        <ellipse cx="55" cy="76" rx="20" ry="30" fill="#F4F4F2" />
        <ellipse cx="28" cy="70" rx="7" ry="20" fill="#2B2B30" />
        <ellipse cx="82" cy="70" rx="7" ry="20" fill="#2B2B30" />
        <path d="M40 40q15 -10 30 0 q-2 16 -15 16 q-13 0 -15 -16Z" fill="#F4F4F2" />
        <Blink>
          <circle cx="48" cy="44" r="2.6" fill="#241F1B" />
          <circle cx="62" cy="44" r="2.6" fill="#241F1B" />
        </Blink>
        <path d="M55 49l-5 5h10Z" fill="#F2A93B" />
        <ellipse cx="46" cy="110" rx="8" ry="4" fill="#F2A93B" />
        <ellipse cx="64" cy="110" rx="8" ry="4" fill="#F2A93B" />
      </Idle>
    </CatalogFigure>
  );
}

/** Deer. */
export function Deer({ size, animate = true, flip, seed = 0 }: AnimalProps) {
  return (
    <CatalogFigure
      viewBox="0 0 120 130"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="deer"
    >
      <ellipse cx="60" cy="120" rx="32" ry="5" fill={A_GROUND} />
      <Idle kind="bob">
        <g stroke="#9C6431" strokeWidth="3.4" fill="none" strokeLinecap="round">
          <path d="M44 30q-4 -16 -10 -20M44 30q-10 -2 -16 -10M76 30q4 -16 10 -20M76 30q10 -2 16 -10" />
        </g>
        <ellipse cx="60" cy="96" rx="24" ry="17" fill="#C58A4E" />
        <path d="M30 50l6 16 12 -8Z" fill="#C58A4E" />
        <path d="M90 50l-6 16 -12 -8Z" fill="#C58A4E" />
        <circle cx="60" cy="60" r="24" fill="#C58A4E" />
        <ellipse cx="60" cy="70" rx="12" ry="9" fill="#EAD2B0" />
        <Blink>
          <circle cx="51" cy="58" r="2.6" fill="#241F1B" />
          <circle cx="69" cy="58" r="2.6" fill="#241F1B" />
        </Blink>
        <ellipse cx="60" cy="67" rx="3.4" ry="2.6" fill="#241F1B" />
        <circle cx="46" cy="50" r="2" fill="#EAD2B0" />
        <circle cx="74" cy="50" r="2" fill="#EAD2B0" />
      </Idle>
    </CatalogFigure>
  );
}

/** Elephant. */
export function Elephant({ size, animate = true, flip, seed = 0 }: AnimalProps) {
  return (
    <CatalogFigure
      viewBox="0 0 140 120"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="elephant"
    >
      <ellipse cx="68" cy="112" rx="38" ry="5" fill={A_GROUND} />
      <Idle kind="bob2">
        <ellipse cx="70" cy="86" rx="30" ry="22" fill="#A7AEB8" />
        <rect x="56" y="100" width="11" height="12" rx="4" fill="#969DA8" />
        <rect x="74" y="100" width="11" height="12" rx="4" fill="#969DA8" />
        <circle cx="62" cy="56" r="26" fill="#A7AEB8" />
        <ellipse cx="36" cy="58" rx="16" ry="20" fill="#969DA8" />
        <ellipse cx="88" cy="58" rx="16" ry="20" fill="#969DA8" />
        <path
          d="M58 70q-4 18 -16 22 q-8 2 -8 -6 q8 0 10 -10"
          fill="none"
          stroke="#A7AEB8"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <Blink>
          <circle cx="54" cy="52" r="2.6" fill="#241F1B" />
          <circle cx="72" cy="52" r="2.6" fill="#241F1B" />
        </Blink>
      </Idle>
    </CatalogFigure>
  );
}

/** Squirrel. */
export function Squirrel({ size, animate = true, flip, seed = 0 }: AnimalProps) {
  return (
    <CatalogFigure
      viewBox="0 0 130 120"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="squirrel"
    >
      <ellipse cx="58" cy="112" rx="32" ry="5" fill={A_GROUND} />
      <Idle kind="bob">
        <path d="M86 100q34 -2 30 -44 q-4 -22 -22 -16 q14 6 12 28 q-2 22 -20 32Z" fill="#B5814E" />
        <ellipse cx="56" cy="88" rx="22" ry="20" fill="#C5915A" />
        <circle cx="38" cy="42" r="8" fill="#C5915A" />
        <circle cx="62" cy="40" r="8" fill="#C5915A" />
        <circle cx="50" cy="56" r="20" fill="#C5915A" />
        <Blink>
          <circle cx="43" cy="54" r="2.6" fill="#241F1B" />
          <circle cx="57" cy="54" r="2.6" fill="#241F1B" />
        </Blink>
        <path d="M50 60l-3 3 3 2 3 -2Z" fill="#241F1B" />
        <ellipse cx="50" cy="96" rx="8" ry="9" fill="#8C5A2B" />
        <path d="M50 90v12" stroke="#6B4A2C" strokeWidth="2" />
      </Idle>
    </CatalogFigure>
  );
}

/** Hedgehog. */
export function Hedgehog({ size, animate = true, flip, seed = 0 }: AnimalProps) {
  return (
    <CatalogFigure
      viewBox="0 0 130 100"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="hedgehog"
    >
      <ellipse cx="64" cy="92" rx="36" ry="5" fill={A_GROUND} />
      <Idle kind="bob3">
        <g fill="#7C5436">
          <path d="M28 70 l6 -34 l12 0Z" />
          <path d="M38 70 l6 -34 l12 0Z" />
          <path d="M48 70 l6 -34 l12 0Z" />
          <path d="M58 70 l6 -34 l12 0Z" />
          <path d="M68 70 l6 -34 l12 0Z" />
          <path d="M78 70 l6 -34 l12 0Z" />
          <path d="M88 70 l6 -34 l12 0Z" />
        </g>
        <path d="M30 72q4 -20 36 -20 q34 0 38 20 q-38 12 -74 0Z" fill="#7C5436" />
        <ellipse cx="32" cy="66" rx="18" ry="14" fill="#D8B98C" />
        <Blink>
          <circle cx="28" cy="62" r="2.4" fill="#241F1B" />
        </Blink>
        <circle cx="18" cy="68" r="3" fill="#241F1B" />
        <rect x="44" y="76" width="6" height="10" rx="3" fill="#A9794A" />
        <rect x="78" y="76" width="6" height="10" rx="3" fill="#A9794A" />
      </Idle>
    </CatalogFigure>
  );
}

/** Snail. */
export function Snail({ size, animate = true, flip, seed = 0 }: AnimalProps) {
  return (
    <CatalogFigure
      viewBox="0 0 140 100"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="snail"
    >
      <ellipse cx="70" cy="92" rx="40" ry="5" fill={A_GROUND} />
      <Idle kind="bob2">
        <path
          d="M24 86q-2 -14 16 -16 l40 0 q10 0 10 8 q0 6 -10 6 l-40 0 q-6 0 -6 4Z"
          fill="#C8A06A"
        />
        <circle cx="84" cy="58" r="26" fill="#E0843C" />
        <circle cx="84" cy="58" r="18" fill="none" stroke="#C26A24" strokeWidth="3" />
        <circle cx="84" cy="58" r="9" fill="none" stroke="#C26A24" strokeWidth="3" />
        <path d="M30 78v-16M40 78v-18" stroke="#B58A52" strokeWidth="3" strokeLinecap="round" />
        <circle cx="30" cy="60" r="3" fill="#241F1B" />
        <circle cx="40" cy="58" r="3" fill="#241F1B" />
        <path
          d="M28 84q8 4 16 0"
          fill="none"
          stroke="#B58A52"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </Idle>
    </CatalogFigure>
  );
}

/** Ladybug. */
export function Ladybug({ size, animate = true, flip, seed = 0 }: AnimalProps) {
  return (
    <CatalogFigure
      viewBox="0 0 120 110"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="ladybug"
    >
      <ellipse cx="60" cy="100" rx="34" ry="5" fill={A_GROUND} />
      <Idle kind="bob">
        <g stroke="#241F1B" strokeWidth="2.4" strokeLinecap="round">
          <path d="M30 74l-12 6M30 64l-14 0M34 56l-10 -8M90 74l12 6M90 64l14 0M86 56l10 -8" />
        </g>
        <path d="M28 70a32 26 0 0 1 64 0Z" fill="#E23B3B" />
        <path d="M60 44v26" stroke="#241F1B" strokeWidth="2.6" />
        <g fill="#241F1B">
          <circle cx="44" cy="58" r="4" />
          <circle cx="76" cy="58" r="4" />
          <circle cx="40" cy="68" r="3.4" />
          <circle cx="80" cy="68" r="3.4" />
        </g>
        <path d="M28 70q4 -16 16 -22 q-14 -6 -26 4 q-6 8 0 18Z" fill="#241F1B" />
        <Blink>
          <circle cx="26" cy="56" r="2" fill="#fff" />
          <circle cx="33" cy="52" r="2" fill="#fff" />
        </Blink>
      </Idle>
    </CatalogFigure>
  );
}

// --- the registry --------------------------------------------------------------------------------
export const ANIMALS = {
  dog: { name: 'dog', Component: Dog },
  cat: { name: 'cat', Component: Cat },
  rabbit: { name: 'rabbit', Component: Rabbit },
  sheep: { name: 'sheep', Component: Sheep },
  goat: { name: 'goat', Component: Goat },
  cow: { name: 'cow', Component: Cow },
  horse: { name: 'horse', Component: Horse },
  pig: { name: 'pig', Component: Pig },
  bird: { name: 'bird', Component: Bird },
  duck: { name: 'duck', Component: Duck },
  hen: { name: 'hen', Component: Hen },
  koi: { name: 'koi', Component: Koi },
  butterfly: { name: 'butterfly', Component: Butterfly },
  bee: { name: 'bee', Component: Bee },
  turtle: { name: 'turtle', Component: Turtle },
  fox: { name: 'fox', Component: Fox },
  bear: { name: 'bear', Component: Bear },
  panda: { name: 'panda', Component: Panda },
  owl: { name: 'owl', Component: Owl },
  frog: { name: 'frog', Component: Frog },
  penguin: { name: 'penguin', Component: Penguin },
  deer: { name: 'deer', Component: Deer },
  elephant: { name: 'elephant', Component: Elephant },
  squirrel: { name: 'squirrel', Component: Squirrel },
  hedgehog: { name: 'hedgehog', Component: Hedgehog },
  snail: { name: 'snail', Component: Snail },
  ladybug: { name: 'ladybug', Component: Ladybug },
} satisfies Record<string, { name: string; Component: ComponentType<AnimalProps> }>;

export type AnimalKind = keyof typeof ANIMALS;

/** The dispatcher — one animal by name. */
export function Animal({ kind, ...props }: AnimalProps & { kind: AnimalKind }) {
  const Species = ANIMALS[kind].Component;
  return <Species {...props} />;
}
