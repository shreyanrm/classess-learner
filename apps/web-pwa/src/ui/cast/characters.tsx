'use client';

import type { ComponentType } from 'react';

/**
 * The cast — eight study buddies, one skeleton. Difference is paint, ears, and one idea;
 * the construction (round head, soft body, two-dot face, shared ground) never changes.
 * New character = new paint + new silhouette detail on the same rules.
 */

import { A_GROUND, Blink, CatalogFigure, Idle } from './animals';
import {
  Bob,
  type CastFigureProps,
  Cheeks,
  Eyes,
  FACE_INK,
  Figure,
  Float,
  Flutter,
  Ground,
  Mouth,
  PAINT,
  Spark,
  Sway,
} from './shared';

/** Pip — the curious cat. Silver, sitting, tail mid-flick. */
export function Pip({ size, mood = 'curious', animate = true, flip, seed = 0 }: CastFigureProps) {
  return (
    <Figure size={size} flip={flip} label="Pip the cat">
      <Ground rx={34} />
      <Bob animate={animate} delay={seed * 0.3}>
        {/* tail */}
        <path
          d="M82 112 q26 0 22 -28"
          fill="none"
          stroke={PAINT.silver}
          strokeWidth={9}
          strokeLinecap="round"
        />
        {/* body, sitting */}
        <path d="M36 118 C36 92 44 82 60 82 76 82 84 92 84 118 Z" fill={PAINT.silver} />
        <ellipse cx="60" cy="104" rx="11" ry="13" fill="#C7CBD2" />
        {/* front paws */}
        <ellipse cx="51" cy="117" rx="8" ry="4.5" fill="#878D97" />
        <ellipse cx="69" cy="117" rx="8" ry="4.5" fill="#878D97" />
        {/* ears */}
        <path d="M42 46 L38 26 L56 38 Z" fill={PAINT.silver} />
        <path d="M78 46 L82 26 L64 38 Z" fill={PAINT.silver} />
        <path d="M44 42 L42 32 L51 38 Z" fill="#F3C9D6" />
        <path d="M76 42 L78 32 L69 38 Z" fill="#F3C9D6" />
        {/* head */}
        <circle cx="60" cy="58" r="24" fill={PAINT.silver} />
        <ellipse cx="51" cy="49" rx="8" ry="6" fill="#FFFFFF" opacity=".14" />
        <Cheeks lx={46} rx={74} y={65} />
        <Eyes lx={51} rx={69} y={57} mood={mood} animate={animate} seed={seed} />
        {/* nose + mouth */}
        <path d="M60 63 l-3.4 3 3.4 2.4 3.4 -2.4 Z" fill={PAINT.rose} />
        <Mouth cx={60} y={70} mood={mood === 'curious' ? 'happy' : mood} color="#878D97" w={10} />
        {/* whiskers */}
        <g stroke="#C9CDD4" strokeWidth={1.3} strokeLinecap="round">
          <path d="M38 60 H26 M38 65 H27" />
          <path d="M82 60 H94 M82 65 H93" />
        </g>
      </Bob>
    </Figure>
  );
}

/** Sage — the wise owl. Warm browns, huge honest eyes. */
export function Sage({ size, mood = 'neutral', animate = true, flip, seed = 0 }: CastFigureProps) {
  return (
    <Figure size={size} flip={flip} label="Sage the owl">
      <Ground />
      <Bob animate={animate} delay={0.2 + seed * 0.3} duration={4.1}>
        {/* ear tufts, above the crown */}
        <path d="M30 52 L24 30 L48 40 Z" fill="#A9794A" />
        <path d="M90 52 L96 30 L72 40 Z" fill="#A9794A" />
        {/* body */}
        <path d="M30 70 q0 -34 30 -34 q30 0 30 34 q0 38 -30 38 q-30 0 -30 -38 Z" fill="#A9794A" />
        {/* belly */}
        <path d="M60 74 q-22 0 -22 18 q8 14 22 14 q14 0 22 -14 q0 -18 -22 -18 Z" fill="#C8A06A" />
        {/* eye discs */}
        <circle cx="48" cy="64" r="12" fill="#F7F2EA" />
        <circle cx="72" cy="64" r="12" fill="#F7F2EA" />
        <Eyes lx={48} rx={72} y={64} r={4.6} mood={mood} animate={animate} seed={seed} />
        {/* beak */}
        <path d="M60 70 l-5 6 h10 Z" fill="#F2A93B" />
        {/* feet */}
        <path
          d="M50 108 l-3 8 M70 108 l3 8"
          stroke="#F2A93B"
          strokeWidth={3}
          strokeLinecap="round"
        />
      </Bob>
    </Figure>
  );
}

/** Sprout — the new idea. A potted seedling with a face; it grows on you. */
export function Sprout({ size, mood = 'happy', animate = true, flip, seed = 0 }: CastFigureProps) {
  return (
    <Figure size={size} flip={flip} label="Sprout the seedling">
      <Ground rx={28} />
      {/* leaves sway from the pot rim */}
      <Sway animate={animate} origin="60px 86px" delay={seed * 0.4}>
        <path d="M60 84 C48 70 42 56 46 42 q14 8 16 30 Z" fill="#4CA268" />
        <path d="M60 84 C72 70 79 54 74 40 q-14 8 -16 32 Z" fill="#3E8E5A" />
        <path d="M60 86 C58 66 58 50 60 38 q4 16 1 48 Z" fill="#5AAE76" />
      </Sway>
      <Bob animate={animate} delay={0.1 + seed * 0.3} duration={4.4}>
        {/* pot, wearing the face */}
        <rect x="38" y="82" width="44" height="9" rx="3" fill="#D98A57" />
        <path d="M41 91 h38 l-5 30 H46 Z" fill="#C8794A" />
        <Cheeks lx={50} rx={70} y={104} r={3.4} />
        <Eyes lx={53} rx={67} y={100} r={2.6} mood={mood} animate={animate} seed={seed + 1} />
        <Mouth cx={60} y={106} mood={mood} color="#8D5731" w={9} />
      </Bob>
    </Figure>
  );
}

/** Volt — the robot. Slate and sky; runs on questions. */
export function Volt({ size, mood = 'happy', animate = true, flip, seed = 0 }: CastFigureProps) {
  return (
    <Figure size={size} flip={flip} label="Volt the robot">
      <Ground />
      <Bob animate={animate} delay={0.35 + seed * 0.3} duration={3.4}>
        {/* antenna */}
        <path d="M60 34 V22" stroke={PAINT.slate} strokeWidth={3} strokeLinecap="round" />
        <Float animate={animate} delay={seed * 0.5}>
          <circle cx="60" cy="18" r="4.5" fill={PAINT.gold} />
        </Float>
        {/* legs + feet */}
        <rect x="47" y="100" width="9" height="16" rx="4.5" fill="#4A5260" />
        <rect x="64" y="100" width="9" height="16" rx="4.5" fill="#4A5260" />
        <ellipse cx="51" cy="117" rx="9" ry="4.5" fill="#3C434F" />
        <ellipse cx="69" cy="117" rx="9" ry="4.5" fill="#3C434F" />
        {/* arms + round hands */}
        <rect x="26" y="72" width="10" height="26" rx="5" fill={PAINT.slate} />
        <circle cx="31" cy="100" r="5.5" fill="#7B8494" />
        <rect x="84" y="72" width="10" height="26" rx="5" fill={PAINT.slate} />
        <circle cx="89" cy="100" r="5.5" fill="#7B8494" />
        {/* body */}
        <rect x="38" y="68" width="44" height="36" rx="7" fill={PAINT.slate} />
        {/* chest bolt — one idea, one prop */}
        <path d="M62 76 l-7 10 h5 l-2 8 7 -10 h-5 Z" fill={PAINT.magenta} />
        {/* head + screen face */}
        <rect x="36" y="30" width="48" height="36" rx="9" fill="#6B7484" />
        <rect x="42" y="37" width="36" height="22" rx="5" fill={PAINT.sky} />
        <Eyes
          lx={53}
          rx={67}
          y={46}
          r={3}
          color="#FFFFFF"
          glint={false}
          mood={mood}
          animate={animate}
          seed={seed}
        />
        <Mouth cx={60} y={52} mood={mood} color="#FFFFFF" w={9} />
        {/* ear bolts */}
        <rect x="31" y="42" width="6" height="12" rx="3" fill="#4A5260" />
        <rect x="83" y="42" width="6" height="12" rx="3" fill="#4A5260" />
      </Bob>
    </Figure>
  );
}

/** Ember — the clever fox. Amber with a white bib and a big soft tail. */
export function Ember({ size, mood = 'happy', animate = true, flip, seed = 0 }: CastFigureProps) {
  return (
    <Figure size={size} flip={flip} label="Ember the fox">
      <Ground rx={34} />
      <Bob animate={animate} delay={0.15 + seed * 0.3}>
        {/* tail */}
        <path d="M84 112 q26 2 24 -24 q-4 2 -8 8 q-8 -2 -16 6 Z" fill={PAINT.amber} />
        <path d="M104 92 q4 -2 4 -4 q0 10 -8 14 Z" fill="#F7F2EA" />
        {/* body */}
        <path d="M38 118 C38 94 46 84 60 84 74 84 82 94 82 118 Z" fill={PAINT.amber} />
        {/* ears with dark tips */}
        <path d="M36 46 L30 22 L54 36 Z" fill={PAINT.amber} />
        <path d="M84 46 L90 22 L66 36 Z" fill={PAINT.amber} />
        <path d="M34 38 L31 26 L43 33 Z" fill="#3A2A22" />
        <path d="M86 38 L89 26 L77 33 Z" fill="#3A2A22" />
        {/* head */}
        <circle cx="60" cy="58" r="24" fill={PAINT.amber} />
        {/* muzzle */}
        <path
          d="M60 64 q-16 0 -16 9.5 q0 7.5 16 7.5 q16 0 16 -7.5 q0 -9.5 -16 -9.5 Z"
          fill="#F7F2EA"
        />
        <Eyes lx={49} rx={71} y={55} r={3.2} mood={mood} animate={animate} seed={seed} />
        <path d="M60 68 l-4 3.6 4 3 4 -3 Z" fill={FACE_INK} />
        <Mouth cx={60} y={77} mood={mood} color="#B9822F" w={8} />
      </Bob>
    </Figure>
  );
}

/** Pico — the little penguin. Dressed for every occasion. */
export function Pico({ size, mood = 'happy', animate = true, flip, seed = 0 }: CastFigureProps) {
  return (
    <Figure size={size} flip={flip} label="Pico the penguin">
      <Ground rx={28} />
      <Bob animate={animate} delay={0.45 + seed * 0.3} duration={3.2}>
        {/* feet */}
        <ellipse cx="50" cy="118" rx="9" ry="4" fill={PAINT.gold} />
        <ellipse cx="70" cy="118" rx="9" ry="4" fill={PAINT.gold} />
        {/* body */}
        <path
          d="M60 34 C40 34 32 52 32 82 32 106 44 117 60 117 76 117 88 106 88 82 88 52 80 34 60 34 Z"
          fill="#33343A"
        />
        {/* belly */}
        <path
          d="M60 58 C48 58 42 70 42 88 42 104 50 111 60 111 70 111 78 104 78 88 78 70 72 58 60 58 Z"
          fill="#FFFFFF"
        />
        {/* flippers */}
        <path d="M33 66 q-10 12 -2 26 q6 -2 8 -24 Z" fill="#26272C" />
        <path d="M87 66 q10 12 2 26 q-6 -2 -8 -24 Z" fill="#26272C" />
        {/* face */}
        <circle cx="50" cy="50" r="4.4" fill="#FFFFFF" />
        <circle cx="70" cy="50" r="4.4" fill="#FFFFFF" />
        <Eyes lx={50} rx={70} y={50} r={2.4} mood={mood} animate={animate} seed={seed} />
        <path d="M60 55 l-4.5 4 4.5 3 4.5 -3 Z" fill={PAINT.gold} />
        <Cheeks lx={44} rx={76} y={58} r={3.4} />
      </Bob>
    </Figure>
  );
}

/** Juni — the bee. Small, busy in the friendliest way, never in a straight line. */
export function Juni({ size, mood = 'happy', animate = true, flip, seed = 0 }: CastFigureProps) {
  return (
    <Figure size={size} flip={flip} label="Juni the bee">
      <Flutter animate={animate} delay={seed * 0.4}>
        {/* wings */}
        <ellipse
          cx="54"
          cy="52"
          rx="9"
          ry="14"
          fill="#FFFFFF"
          opacity=".85"
          transform="rotate(-18 54 52)"
        />
        <ellipse
          cx="74"
          cy="52"
          rx="9"
          ry="14"
          fill="#FFFFFF"
          opacity=".85"
          transform="rotate(18 74 52)"
        />
        {/* body */}
        <ellipse cx="64" cy="76" rx="20" ry="15" fill={PAINT.gold} />
        <path
          d="M58 62.5 q-2 13 0 27 M70 63.5 q3 12 0 25.5"
          stroke="#33343A"
          strokeWidth={5}
          fill="none"
          strokeLinecap="round"
        />
        {/* stinger */}
        <path d="M84 76 l8 3 -8 3 Z" fill="#33343A" />
        {/* head */}
        <circle cx="44" cy="73" r="11" fill="#33343A" />
        <path
          d="M38 63 q-4 -6 -9 -6 M48 61 q0 -7 4 -10"
          stroke="#33343A"
          strokeWidth={1.8}
          fill="none"
          strokeLinecap="round"
        />
        <Eyes
          lx={40}
          rx={48}
          y={72}
          r={1.9}
          color="#FFFFFF"
          glint={false}
          mood={mood}
          animate={animate}
          seed={seed}
        />
      </Flutter>
    </Figure>
  );
}

/** Torto — the steady turtle. Rest is part of learning; Torto has always known. */
export function Torto({ size, mood = 'sleepy', animate = true, flip, seed = 0 }: CastFigureProps) {
  return (
    <Figure size={size} flip={flip} label="Torto the turtle">
      <Ground rx={38} />
      <Bob animate={animate} delay={0.25 + seed * 0.3} duration={5.2}>
        {/* legs + tail */}
        <rect x="32" y="106" width="12" height="12" rx="5" fill="#82B23A" />
        <rect x="62" y="106" width="12" height="12" rx="5" fill="#82B23A" />
        <path d="M22 102 q-8 2 -10 8 q8 2 12 -2 Z" fill="#82B23A" />
        {/* shell */}
        <path d="M24 104 q0 -40 31 -40 q31 0 31 40 Z" fill={PAINT.mint} />
        <rect x="20" y="102" width="68" height="9" rx="4.5" fill="#0FA3A3" />
        {/* shell plates */}
        <g fill="#0FA3A3" opacity=".5">
          <circle cx="41" cy="90" r="5.5" />
          <circle cx="55" cy="78" r="6.5" />
          <circle cx="69" cy="90" r="5.5" />
        </g>
        {/* head, out for a look */}
        <path d="M86 106 q0 -10 8 -10 q8 0 8 10 Z" fill="#82B23A" />
        <circle cx="99" cy="93" r="10.5" fill="#82B23A" />
        <Eyes lx={96} rx={103} y={91} r={2} mood={mood} animate={animate} seed={seed} />
        <Mouth cx={100} y={97} mood={mood} color="#5E822A" w={6} />
      </Bob>
    </Figure>
  );
}

/** A tiny idea-spark hovering over a figure — compose sparingly. */
export function IdeaSpark({ size = 96, animate = true }: { size?: number; animate?: boolean }) {
  return (
    <Figure size={size}>
      <Spark cx={60} cy={60} s={9} animate={animate} />
    </Figure>
  );
}

// --- ported catalog kids -------------------------------------------------------------------------

/** Ace — The learner. */
export function Ace({ size, animate = true, flip, seed = 0 }: CastFigureProps) {
  return (
    <CatalogFigure
      viewBox="0 0 120 178"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="ace"
    >
      <ellipse cx="60" cy="173" rx="32" ry="5" fill={A_GROUND} />
      <Idle kind="float">
        <path d="M60 6l2.4 7 7 2.4-7 2.4L60 27l-2.4-7.2-7-2.4 7-2.4z" fill="#DFA21F" />
      </Idle>
      <Idle kind="bob">
        <rect x="49" y="142" width="10" height="28" rx="5" fill="#454953" />
        <rect x="61" y="142" width="10" height="28" rx="5" fill="#454953" />
        <ellipse cx="52" cy="170" rx="9" ry="5" fill="#2B2D33" />
        <ellipse cx="68" cy="170" rx="9" ry="5" fill="#2B2D33" />
        <path d="M34 146C34 116 42 104 60 104 78 104 86 116 86 146Z" fill="#2563EB" />
        <rect x="28" y="106" width="11" height="34" rx="5.5" fill="#2563EB" />
        <circle cx="33.5" cy="143" r="6" fill="#F2C9A0" />
        <rect x="81" y="106" width="11" height="34" rx="5.5" fill="#2563EB" />
        <circle cx="86.5" cy="143" r="6" fill="#F2C9A0" />
        <rect x="53" y="90" width="14" height="14" rx="6" fill="#F2C9A0" />
        <circle cx="37" cy="74" r="5" fill="#F2C9A0" />
        <circle cx="83" cy="74" r="5" fill="#F2C9A0" />
        <circle cx="60" cy="74" r="24" fill="#F2C9A0" />
        <ellipse cx="51" cy="65" rx="8" ry="6" fill="#FFFFFF" opacity=".12" />
        <path
          d="M36 74C36 54 47 46 60 46 73 46 84 54 84 74 84 66 78 60 60 60 42 60 36 66 36 74Z"
          fill="#2B2B30"
        />
        <circle cx="47" cy="81" r="4" fill="#E0518A" opacity=".16" />
        <circle cx="73" cy="81" r="4" fill="#E0518A" opacity=".16" />
        <Blink>
          <circle cx="52" cy="75" r="3" fill="#241F1B" />
          <circle cx="53.2" cy="73.8" r="1" fill="#fff" />
          <circle cx="68" cy="75" r="3" fill="#241F1B" />
          <circle cx="69.2" cy="73.8" r="1" fill="#fff" />
        </Blink>
        <path
          d="M54 84Q60 89 66 84"
          fill="none"
          stroke="#9C6B3F"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </Idle>
    </CatalogFigure>
  );
}

/** Iris — The teacher. */
export function Iris({ size, animate = true, flip, seed = 0 }: CastFigureProps) {
  return (
    <CatalogFigure
      viewBox="0 0 120 178"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="iris"
    >
      <ellipse cx="60" cy="173" rx="32" ry="5" fill={A_GROUND} />
      <Idle kind="bob2">
        <rect x="49" y="142" width="10" height="28" rx="5" fill="#454953" />
        <rect x="61" y="142" width="10" height="28" rx="5" fill="#454953" />
        <ellipse cx="52" cy="170" rx="9" ry="5" fill="#2B2D33" />
        <ellipse cx="68" cy="170" rx="9" ry="5" fill="#2B2D33" />
        <path d="M34 146C34 116 42 104 60 104 78 104 86 116 86 146Z" fill="#D6196F" />
        <rect x="28" y="106" width="11" height="34" rx="5.5" fill="#D6196F" />
        <circle cx="33.5" cy="143" r="6" fill="#C68642" />
        <rect x="81" y="106" width="11" height="34" rx="5.5" fill="#D6196F" />
        <circle cx="86.5" cy="143" r="6" fill="#C68642" />
        <rect x="53" y="90" width="14" height="14" rx="6" fill="#C68642" />
        <circle cx="37" cy="74" r="5" fill="#C68642" />
        <circle cx="83" cy="74" r="5" fill="#C68642" />
        <circle cx="60" cy="74" r="24" fill="#C68642" />
        <ellipse cx="51" cy="65" rx="8" ry="6" fill="#FFFFFF" opacity=".12" />
        <path
          d="M36 74C36 54 47 46 60 46 73 46 84 54 84 74 84 66 78 60 60 60 42 60 36 66 36 74Z"
          fill="#3A2A22"
        />
        <circle cx="60" cy="44" r="8" fill="#3A2A22" />
        <circle cx="47" cy="81" r="4" fill="#E0518A" opacity=".16" />
        <circle cx="73" cy="81" r="4" fill="#E0518A" opacity=".16" />
        <Blink>
          <circle cx="52" cy="75" r="3" fill="#241F1B" />
          <circle cx="53.2" cy="73.8" r="1" fill="#fff" />
          <circle cx="68" cy="75" r="3" fill="#241F1B" />
          <circle cx="69.2" cy="73.8" r="1" fill="#fff" />
        </Blink>
        <path
          d="M54 84Q60 89 66 84"
          fill="none"
          stroke="#7A4B28"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <rect
          x="60"
          y="112"
          width="42"
          height="28"
          rx="4"
          fill="#FFFFFF"
          stroke="#0E0E10"
          strokeWidth="2"
        />
        <path
          d="M68 122h26M68 130h17"
          stroke="var(--ink-3)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </Idle>
    </CatalogFigure>
  );
}

/** Theo — The explorer. */
export function Theo({ size, animate = true, flip, seed = 0 }: CastFigureProps) {
  return (
    <CatalogFigure
      viewBox="0 0 120 178"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="theo"
    >
      <ellipse cx="60" cy="173" rx="32" ry="5" fill={A_GROUND} />
      <Idle kind="bob3">
        <rect x="49" y="142" width="10" height="28" rx="5" fill="#454953" />
        <rect x="61" y="142" width="10" height="28" rx="5" fill="#454953" />
        <ellipse cx="52" cy="170" rx="9" ry="5" fill="#2B2D33" />
        <ellipse cx="68" cy="170" rx="9" ry="5" fill="#2B2D33" />
        <path d="M34 146C34 116 42 104 60 104 78 104 86 116 86 146Z" fill="#13B5A0" />
        <rect x="28" y="106" width="11" height="34" rx="5.5" fill="#13B5A0" />
        <circle cx="33.5" cy="143" r="6" fill="#F2C9A0" />
        <Idle kind="wave">
          <rect x="83" y="80" width="11" height="34" rx="5.5" fill="#13B5A0" />
          <circle cx="88.5" cy="79" r="6" fill="#F2C9A0" />
        </Idle>
        <rect x="53" y="90" width="14" height="14" rx="6" fill="#F2C9A0" />
        <circle cx="37" cy="74" r="5" fill="#F2C9A0" />
        <circle cx="83" cy="74" r="5" fill="#F2C9A0" />
        <circle cx="60" cy="74" r="24" fill="#F2C9A0" />
        <ellipse cx="51" cy="65" rx="8" ry="6" fill="#FFFFFF" opacity=".12" />
        <g fill="#5A3A22">
          <circle cx="42" cy="60" r="7.5" />
          <circle cx="50" cy="51" r="8" />
          <circle cx="60" cy="48" r="8.5" />
          <circle cx="70" cy="51" r="8" />
          <circle cx="78" cy="60" r="7.5" />
        </g>
        <circle cx="47" cy="81" r="4" fill="#E0518A" opacity=".16" />
        <circle cx="73" cy="81" r="4" fill="#E0518A" opacity=".16" />
        <Blink>
          <circle cx="52" cy="75" r="3" fill="#241F1B" />
          <circle cx="53.2" cy="73.8" r="1" fill="#fff" />
          <circle cx="68" cy="75" r="3" fill="#241F1B" />
          <circle cx="69.2" cy="73.8" r="1" fill="#fff" />
        </Blink>
        <path
          d="M54 84Q60 89 66 84"
          fill="none"
          stroke="#9C6B3F"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </Idle>
    </CatalogFigure>
  );
}

/** Maya — The builder. */
export function Maya({ size, animate = true, flip, seed = 0 }: CastFigureProps) {
  return (
    <CatalogFigure
      viewBox="0 0 120 178"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="maya"
    >
      <ellipse cx="60" cy="173" rx="32" ry="5" fill={A_GROUND} />
      <Idle kind="bob">
        <rect x="49" y="142" width="10" height="28" rx="5" fill="#454953" />
        <rect x="61" y="142" width="10" height="28" rx="5" fill="#454953" />
        <ellipse cx="52" cy="170" rx="9" ry="5" fill="#2B2D33" />
        <ellipse cx="68" cy="170" rx="9" ry="5" fill="#2B2D33" />
        <path d="M34 146C34 116 42 104 60 104 78 104 86 116 86 146Z" fill="#8E6FC4" />
        <rect x="28" y="106" width="11" height="34" rx="5.5" fill="#8E6FC4" />
        <circle cx="33.5" cy="143" r="6" fill="#9C6B3F" />
        <rect x="81" y="106" width="11" height="34" rx="5.5" fill="#8E6FC4" />
        <circle cx="86.5" cy="143" r="6" fill="#9C6B3F" />
        <rect x="53" y="90" width="14" height="14" rx="6" fill="#9C6B3F" />
        <circle cx="37" cy="74" r="5" fill="#9C6B3F" />
        <circle cx="83" cy="74" r="5" fill="#9C6B3F" />
        <circle cx="60" cy="74" r="24" fill="#9C6B3F" />
        <ellipse cx="51" cy="65" rx="8" ry="6" fill="#FFFFFF" opacity=".12" />
        <path
          d="M36 72C36 52 47 46 60 46 73 46 84 52 84 72 84 64 78 59 60 59 42 59 36 64 36 72Z"
          fill="#2B2B30"
        />
        <path d="M36 70 q-4 28 1 48 l9 0 q-4 -24 1 -46Z" fill="#2B2B30" />
        <path d="M84 70 q4 28 -1 48 l-9 0 q4 -24 -1 -46Z" fill="#2B2B30" />
        <circle cx="47" cy="81" r="4" fill="#E0518A" opacity=".16" />
        <circle cx="73" cy="81" r="4" fill="#E0518A" opacity=".16" />
        <Blink>
          <circle cx="52" cy="75" r="3" fill="#241F1B" />
          <circle cx="53.2" cy="73.8" r="1" fill="#fff" />
          <circle cx="68" cy="75" r="3" fill="#241F1B" />
          <circle cx="69.2" cy="73.8" r="1" fill="#fff" />
        </Blink>
        <path
          d="M54 84Q60 89 66 84"
          fill="none"
          stroke="#6B4A2C"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path d="M40 118h40v24H40z" fill="#FFFFFF" stroke="#0E0E10" strokeWidth="2" />
        <path d="M60 118v24" stroke="#0E0E10" strokeWidth="2" />
      </Idle>
    </CatalogFigure>
  );
}

/** Sol — The achiever. */
export function Sol({ size, animate = true, flip, seed = 0 }: CastFigureProps) {
  return (
    <CatalogFigure
      viewBox="0 0 120 178"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="sol"
    >
      <ellipse cx="60" cy="173" rx="32" ry="5" fill={A_GROUND} />
      <Idle kind="float">
        <path
          d="M60 5l2.3 5.1 5.6.7-4.1 3.8 1 5.5L60 23.4 55.2 20.1l1-5.5L52 10.8l5.6-.7z"
          fill="#DFA21F"
        />
      </Idle>
      <Idle kind="sway">
        <rect x="49" y="142" width="10" height="28" rx="5" fill="#454953" />
        <rect x="61" y="142" width="10" height="28" rx="5" fill="#454953" />
        <ellipse cx="52" cy="170" rx="9" ry="5" fill="#2B2D33" />
        <ellipse cx="68" cy="170" rx="9" ry="5" fill="#2B2D33" />
        <path d="M34 146C34 116 42 104 60 104 78 104 86 116 86 146Z" fill="#DFA21F" />
        <rect x="28" y="106" width="11" height="34" rx="5.5" fill="#DFA21F" />
        <circle cx="33.5" cy="143" r="6" fill="#E3A977" />
        <rect x="81" y="106" width="11" height="34" rx="5.5" fill="#DFA21F" />
        <circle cx="86.5" cy="143" r="6" fill="#E3A977" />
        <rect x="53" y="90" width="14" height="14" rx="6" fill="#E3A977" />
        <circle cx="37" cy="74" r="5" fill="#E3A977" />
        <circle cx="83" cy="74" r="5" fill="#E3A977" />
        <circle cx="60" cy="74" r="24" fill="#E3A977" />
        <ellipse cx="51" cy="65" rx="8" ry="6" fill="#FFFFFF" opacity=".12" />
        <path
          d="M36 74C36 54 47 46 60 46 73 46 84 54 84 74 84 66 78 60 60 60 42 60 36 66 36 74Z"
          fill="#6B4A2C"
        />
        <circle cx="47" cy="81" r="4" fill="#E0518A" opacity=".16" />
        <circle cx="73" cy="81" r="4" fill="#E0518A" opacity=".16" />
        <Blink>
          <circle cx="52" cy="75" r="3" fill="#241F1B" />
          <circle cx="53.2" cy="73.8" r="1" fill="#fff" />
          <circle cx="68" cy="75" r="3" fill="#241F1B" />
          <circle cx="69.2" cy="73.8" r="1" fill="#fff" />
        </Blink>
        <path
          d="M54 84Q60 89 66 84"
          fill="none"
          stroke="#9C6B3F"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </Idle>
    </CatalogFigure>
  );
}

/** Nova — The scientist. */
export function Nova({ size, animate = true, flip, seed = 0 }: CastFigureProps) {
  return (
    <CatalogFigure
      viewBox="0 0 120 178"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="nova"
    >
      <ellipse cx="60" cy="173" rx="32" ry="5" fill={A_GROUND} />
      <Idle kind="bob2">
        <circle cx="60" cy="68" r="32" fill="#1C1C20" />
        <rect x="49" y="142" width="10" height="28" rx="5" fill="#454953" />
        <rect x="61" y="142" width="10" height="28" rx="5" fill="#454953" />
        <ellipse cx="52" cy="170" rx="9" ry="5" fill="#2B2D33" />
        <ellipse cx="68" cy="170" rx="9" ry="5" fill="#2B2D33" />
        <path d="M34 146C34 116 42 104 60 104 78 104 86 116 86 146Z" fill="#6D4AE0" />
        <rect x="28" y="106" width="11" height="34" rx="5.5" fill="#6D4AE0" />
        <circle cx="33.5" cy="143" r="6" fill="#7A4B28" />
        <rect x="81" y="106" width="11" height="34" rx="5.5" fill="#6D4AE0" />
        <circle cx="86.5" cy="143" r="6" fill="#7A4B28" />
        <rect x="53" y="90" width="14" height="14" rx="6" fill="#7A4B28" />
        <circle cx="37" cy="74" r="5" fill="#7A4B28" />
        <circle cx="83" cy="74" r="5" fill="#7A4B28" />
        <circle cx="60" cy="74" r="24" fill="#7A4B28" />
        <ellipse cx="51" cy="65" rx="8" ry="6" fill="#FFFFFF" opacity=".12" />
        <circle cx="47" cy="81" r="4" fill="#E0518A" opacity=".16" />
        <circle cx="73" cy="81" r="4" fill="#E0518A" opacity=".16" />
        <Blink>
          <circle cx="52" cy="75" r="3" fill="#241F1B" />
          <circle cx="53.2" cy="73.8" r="1" fill="#fff" />
          <circle cx="68" cy="75" r="3" fill="#241F1B" />
          <circle cx="69.2" cy="73.8" r="1" fill="#fff" />
        </Blink>
        <path
          d="M54 84Q60 89 66 84"
          fill="none"
          stroke="#5A3A22"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M51 118h18M55 118v11l-9 17a3.4 3.4 0 0 0 3 5h18a3.4 3.4 0 0 0 3 -5l-9 -17v-11"
          fill="color-mix(in srgb,#13B5A0 22%,#fff)"
          stroke="#13B5A0"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M48 140h24" stroke="#13B5A0" strokeWidth="2" />
      </Idle>
    </CatalogFigure>
  );
}

/** Indi — The artist. */
export function Indi({ size, animate = true, flip, seed = 0 }: CastFigureProps) {
  return (
    <CatalogFigure
      viewBox="0 0 120 178"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="indi"
    >
      <ellipse cx="60" cy="173" rx="32" ry="5" fill={A_GROUND} />
      <Idle kind="bob3">
        <rect x="49" y="142" width="10" height="28" rx="5" fill="#454953" />
        <rect x="61" y="142" width="10" height="28" rx="5" fill="#454953" />
        <ellipse cx="52" cy="170" rx="9" ry="5" fill="#2B2D33" />
        <ellipse cx="68" cy="170" rx="9" ry="5" fill="#2B2D33" />
        <path d="M34 146C34 116 42 104 60 104 78 104 86 116 86 146Z" fill="#C026A6" />
        <rect x="28" y="106" width="11" height="34" rx="5.5" fill="#C026A6" />
        <circle cx="33.5" cy="143" r="6" fill="#E3A977" />
        <rect x="81" y="106" width="11" height="34" rx="5.5" fill="#C026A6" />
        <circle cx="86.5" cy="143" r="6" fill="#E3A977" />
        <rect x="53" y="90" width="14" height="14" rx="6" fill="#E3A977" />
        <circle cx="37" cy="74" r="5" fill="#E3A977" />
        <circle cx="83" cy="74" r="5" fill="#E3A977" />
        <circle cx="60" cy="74" r="24" fill="#E3A977" />
        <ellipse cx="51" cy="65" rx="8" ry="6" fill="#FFFFFF" opacity=".12" />
        <path
          d="M36 74C36 54 47 46 60 46 73 46 84 54 84 74 84 66 78 60 60 60 42 60 36 66 36 74Z"
          fill="#2B2B30"
        />
        <circle cx="40" cy="54" r="7" fill="#2B2B30" />
        <circle cx="80" cy="54" r="7" fill="#2B2B30" />
        <circle cx="47" cy="81" r="4" fill="#E0518A" opacity=".16" />
        <circle cx="73" cy="81" r="4" fill="#E0518A" opacity=".16" />
        <Blink>
          <circle cx="52" cy="75" r="3" fill="#241F1B" />
          <circle cx="53.2" cy="73.8" r="1" fill="#fff" />
          <circle cx="68" cy="75" r="3" fill="#241F1B" />
          <circle cx="69.2" cy="73.8" r="1" fill="#fff" />
        </Blink>
        <path
          d="M54 84Q60 89 66 84"
          fill="none"
          stroke="#9C6B3F"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <g transform="translate(44 122)">
          <path
            d="M2 4C-7 6 -10 18 0 24c6 4 8 -1 12 -1 4 0 4 5 10 2 10 -6 6 -22 -4 -24 -6 -1 -8 2 -16 3Z"
            fill="#FFFFFF"
            stroke="#0E0E10"
            strokeWidth="1.6"
          />
          <circle cx="2" cy="9" r="2.2" fill="#D6196F" />
          <circle cx="11" cy="7" r="2.2" fill="#2563EB" />
          <circle cx="16" cy="14" r="2.2" fill="#DFA21F" />
        </g>
      </Idle>
    </CatalogFigure>
  );
}

/** Robin — The helper. */
export function Robin({ size, animate = true, flip, seed = 0 }: CastFigureProps) {
  return (
    <CatalogFigure
      viewBox="0 0 120 178"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="robin"
    >
      <ellipse cx="60" cy="173" rx="32" ry="5" fill={A_GROUND} />
      <Idle kind="bob2">
        <rect x="49" y="142" width="10" height="28" rx="5" fill="#454953" />
        <rect x="61" y="142" width="10" height="28" rx="5" fill="#454953" />
        <ellipse cx="52" cy="170" rx="9" ry="5" fill="#2B2D33" />
        <ellipse cx="68" cy="170" rx="9" ry="5" fill="#2B2D33" />
        <path d="M34 146C34 116 42 104 60 104 78 104 86 116 86 146Z" fill="#0FA3A3" />
        <rect x="28" y="106" width="11" height="34" rx="5.5" fill="#0FA3A3" />
        <circle cx="33.5" cy="143" r="6" fill="#F7D7B5" />
        <Idle kind="wave">
          <rect x="83" y="80" width="11" height="34" rx="5.5" fill="#0FA3A3" />
          <circle cx="88.5" cy="79" r="6" fill="#F7D7B5" />
        </Idle>
        <rect x="53" y="90" width="14" height="14" rx="6" fill="#F7D7B5" />
        <circle cx="37" cy="74" r="5" fill="#F7D7B5" />
        <circle cx="83" cy="74" r="5" fill="#F7D7B5" />
        <circle cx="60" cy="74" r="24" fill="#F7D7B5" />
        <ellipse cx="51" cy="65" rx="8" ry="6" fill="#FFFFFF" opacity=".12" />
        <path
          d="M36 74C36 54 47 46 60 46 73 46 84 54 84 74 84 66 78 60 60 60 42 60 36 66 36 74Z"
          fill="#8C5A2B"
        />
        <path d="M37 66 q14 -16 34 -12 q-20 0 -34 12Z" fill="#8C5A2B" />
        <circle cx="47" cy="81" r="4" fill="#E0518A" opacity=".16" />
        <circle cx="73" cy="81" r="4" fill="#E0518A" opacity=".16" />
        <Blink>
          <circle cx="52" cy="75" r="3" fill="#241F1B" />
          <circle cx="53.2" cy="73.8" r="1" fill="#fff" />
          <circle cx="68" cy="75" r="3" fill="#241F1B" />
          <circle cx="69.2" cy="73.8" r="1" fill="#fff" />
        </Blink>
        <path
          d="M54 84Q60 89 66 84"
          fill="none"
          stroke="#9C6B3F"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </Idle>
    </CatalogFigure>
  );
}

// ponytail: the ten below repeat one kid skeleton (legs/arms/head/face) with different paint +
// one accessory — same shape the catalog ships and the eight above already follow. A shared <Kid>
// base would cut the repetition but would also mean refactoring the working eight; kept additive.

/** Wren — The dreamer. Sky blue, a thought bubble drifting overhead. */
export function Wren({ size, animate = true, flip, seed = 0 }: CastFigureProps) {
  return (
    <CatalogFigure
      viewBox="0 0 120 178"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="wren"
    >
      <ellipse cx="60" cy="173" rx="32" ry="5" fill={A_GROUND} />
      <Idle kind="float">
        <path
          d="M55 9v15M55 9l11-2v13"
          stroke="#8E6FC4"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="52" cy="24.5" r="3.6" fill="#8E6FC4" />
        <circle cx="63" cy="22.5" r="3.6" fill="#8E6FC4" />
      </Idle>
      <Idle kind="bob2">
        <rect x="49" y="142" width="10" height="28" rx="5" fill="#454953" />
        <rect x="61" y="142" width="10" height="28" rx="5" fill="#454953" />
        <ellipse cx="52" cy="170" rx="9" ry="5" fill="#2B2D33" />
        <ellipse cx="68" cy="170" rx="9" ry="5" fill="#2B2D33" />
        <path d="M34 146C34 116 42 104 60 104 78 104 86 116 86 146Z" fill="#39A0DE" />
        <rect x="28" y="106" width="11" height="34" rx="5.5" fill="#39A0DE" />
        <circle cx="33.5" cy="143" r="6" fill="#F2C9A0" />
        <rect x="81" y="106" width="11" height="34" rx="5.5" fill="#39A0DE" />
        <circle cx="86.5" cy="143" r="6" fill="#F2C9A0" />
        <rect x="53" y="90" width="14" height="14" rx="6" fill="#F2C9A0" />
        <circle cx="37" cy="74" r="5" fill="#F2C9A0" />
        <circle cx="83" cy="74" r="5" fill="#F2C9A0" />
        <circle cx="60" cy="74" r="24" fill="#F2C9A0" />
        <ellipse cx="51" cy="65" rx="8" ry="6" fill="#FFFFFF" opacity=".12" />
        <path
          d="M36 74C36 54 47 46 60 46 73 46 84 54 84 74 84 66 78 60 60 60 42 60 36 66 36 74Z"
          fill="#6B4A2C"
        />
        <path d="M37 66 q14 -16 34 -12 q-20 0 -34 12Z" fill="#6B4A2C" />
        <circle cx="47" cy="81" r="4" fill="#E0518A" opacity=".16" />
        <circle cx="73" cy="81" r="4" fill="#E0518A" opacity=".16" />
        <Blink>
          <circle cx="52" cy="75" r="3" fill="#241F1B" />
          <circle cx="53.2" cy="73.8" r="1" fill="#fff" />
          <circle cx="68" cy="75" r="3" fill="#241F1B" />
          <circle cx="69.2" cy="73.8" r="1" fill="#fff" />
        </Blink>
        <path
          d="M54 84Q60 89 66 84"
          fill="none"
          stroke="#9C6B3F"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </Idle>
    </CatalogFigure>
  );
}

/** Juno — The captain. Coral with a dark cape and a raised flag. */
export function Juno({ size, animate = true, flip, seed = 0 }: CastFigureProps) {
  return (
    <CatalogFigure
      viewBox="0 0 120 178"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="juno"
    >
      <ellipse cx="60" cy="173" rx="32" ry="5" fill={A_GROUND} />
      <Idle kind="bob">
        <path d="M80 58 q21 4 17 37 q-2 11 -12 7 q8 -25 -9 -42Z" fill="#2B2B30" />
        <rect x="49" y="142" width="10" height="28" rx="5" fill="#454953" />
        <rect x="61" y="142" width="10" height="28" rx="5" fill="#454953" />
        <ellipse cx="52" cy="170" rx="9" ry="5" fill="#2B2D33" />
        <ellipse cx="68" cy="170" rx="9" ry="5" fill="#2B2D33" />
        <path d="M34 146C34 116 42 104 60 104 78 104 86 116 86 146Z" fill="#E2674A" />
        <rect x="28" y="106" width="11" height="34" rx="5.5" fill="#E2674A" />
        <circle cx="33.5" cy="143" r="6" fill="#C68642" />
        <rect x="81" y="106" width="11" height="34" rx="5.5" fill="#E2674A" />
        <circle cx="86.5" cy="143" r="6" fill="#C68642" />
        <rect x="53" y="90" width="14" height="14" rx="6" fill="#C68642" />
        <circle cx="37" cy="74" r="5" fill="#C68642" />
        <circle cx="83" cy="74" r="5" fill="#C68642" />
        <circle cx="60" cy="74" r="24" fill="#C68642" />
        <ellipse cx="51" cy="65" rx="8" ry="6" fill="#FFFFFF" opacity=".12" />
        <path
          d="M36 74C36 54 47 46 60 46 73 46 84 54 84 74 84 66 78 60 60 60 42 60 36 66 36 74Z"
          fill="#2B2B30"
        />
        <circle cx="47" cy="81" r="4" fill="#E0518A" opacity=".16" />
        <circle cx="73" cy="81" r="4" fill="#E0518A" opacity=".16" />
        <Blink>
          <circle cx="52" cy="75" r="3" fill="#241F1B" />
          <circle cx="53.2" cy="73.8" r="1" fill="#fff" />
          <circle cx="68" cy="75" r="3" fill="#241F1B" />
          <circle cx="69.2" cy="73.8" r="1" fill="#fff" />
        </Blink>
        <path
          d="M54 84Q60 89 66 84"
          fill="none"
          stroke="#7A4B28"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <rect x="91" y="92" width="3" height="56" rx="1.5" fill="#6A6C75" />
        <path d="M94 95h22l-6 8 6 8H94z" fill="#2563EB" />
      </Idle>
    </CatalogFigure>
  );
}

/** Pax — The friend. Grass green, a mandarin scarf, one arm waving. */
export function Pax({ size, animate = true, flip, seed = 0 }: CastFigureProps) {
  return (
    <CatalogFigure
      viewBox="0 0 120 178"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="pax"
    >
      <ellipse cx="60" cy="173" rx="32" ry="5" fill={A_GROUND} />
      <Idle kind="bob3">
        <rect x="49" y="142" width="10" height="28" rx="5" fill="#454953" />
        <rect x="61" y="142" width="10" height="28" rx="5" fill="#454953" />
        <ellipse cx="52" cy="170" rx="9" ry="5" fill="#2B2D33" />
        <ellipse cx="68" cy="170" rx="9" ry="5" fill="#2B2D33" />
        <path d="M34 146C34 116 42 104 60 104 78 104 86 116 86 146Z" fill="#1CA363" />
        <rect x="28" y="106" width="11" height="34" rx="5.5" fill="#1CA363" />
        <circle cx="33.5" cy="143" r="6" fill="#E3A977" />
        <Idle kind="wave">
          <rect x="83" y="80" width="11" height="34" rx="5.5" fill="#1CA363" />
          <circle cx="88.5" cy="79" r="6" fill="#E3A977" />
        </Idle>
        <rect x="53" y="90" width="14" height="14" rx="6" fill="#E3A977" />
        <circle cx="37" cy="74" r="5" fill="#E3A977" />
        <circle cx="83" cy="74" r="5" fill="#E3A977" />
        <circle cx="60" cy="74" r="24" fill="#E3A977" />
        <ellipse cx="51" cy="65" rx="8" ry="6" fill="#FFFFFF" opacity=".12" />
        <path
          d="M36 74C36 54 47 46 60 46 73 46 84 54 84 74 84 66 78 60 60 60 42 60 36 66 36 74Z"
          fill="#5A3A22"
        />
        <path d="M34 64 q26 -25 52 -2 q-26 -11 -52 2Z" fill="#F26A38" />
        <path d="M83 62 q13 -1 13 6 q-9 -2 -15 1Z" fill="#F26A38" />
        <circle cx="47" cy="81" r="4" fill="#E0518A" opacity=".16" />
        <circle cx="73" cy="81" r="4" fill="#E0518A" opacity=".16" />
        <Blink>
          <circle cx="52" cy="75" r="3" fill="#241F1B" />
          <circle cx="53.2" cy="73.8" r="1" fill="#fff" />
          <circle cx="68" cy="75" r="3" fill="#241F1B" />
          <circle cx="69.2" cy="73.8" r="1" fill="#fff" />
        </Blink>
        <path
          d="M54 84Q60 89 66 84"
          fill="none"
          stroke="#9C6B3F"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </Idle>
    </CatalogFigure>
  );
}

/** Remy — The tinkerer. Amber, spiky hair, a wrench in hand. */
export function Remy({ size, animate = true, flip, seed = 0 }: CastFigureProps) {
  return (
    <CatalogFigure
      viewBox="0 0 120 178"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="remy"
    >
      <ellipse cx="60" cy="173" rx="32" ry="5" fill={A_GROUND} />
      <Idle kind="bob">
        <rect x="49" y="142" width="10" height="28" rx="5" fill="#454953" />
        <rect x="61" y="142" width="10" height="28" rx="5" fill="#454953" />
        <ellipse cx="52" cy="170" rx="9" ry="5" fill="#2B2D33" />
        <ellipse cx="68" cy="170" rx="9" ry="5" fill="#2B2D33" />
        <path d="M34 146C34 116 42 104 60 104 78 104 86 116 86 146Z" fill="#E8881A" />
        <rect x="28" y="106" width="11" height="34" rx="5.5" fill="#E8881A" />
        <circle cx="33.5" cy="143" r="6" fill="#F2C9A0" />
        <rect x="81" y="106" width="11" height="34" rx="5.5" fill="#E8881A" />
        <circle cx="86.5" cy="143" r="6" fill="#F2C9A0" />
        <rect x="53" y="90" width="14" height="14" rx="6" fill="#F2C9A0" />
        <circle cx="37" cy="74" r="5" fill="#F2C9A0" />
        <circle cx="83" cy="74" r="5" fill="#F2C9A0" />
        <circle cx="60" cy="74" r="24" fill="#F2C9A0" />
        <ellipse cx="51" cy="65" rx="8" ry="6" fill="#FFFFFF" opacity=".12" />
        <path
          d="M36 74C36 54 47 46 60 46 73 46 84 54 84 74 84 66 78 60 60 60 42 60 36 66 36 74Z"
          fill="#6B4A2C"
        />
        <path d="M45 49l3 -8 4 8zM57 46l3 -9 4 9zM69 49l3 -8 4 8z" fill="#6B4A2C" />
        <circle cx="47" cy="81" r="4" fill="#E0518A" opacity=".16" />
        <circle cx="73" cy="81" r="4" fill="#E0518A" opacity=".16" />
        <Blink>
          <circle cx="52" cy="75" r="3" fill="#241F1B" />
          <circle cx="53.2" cy="73.8" r="1" fill="#fff" />
          <circle cx="68" cy="75" r="3" fill="#241F1B" />
          <circle cx="69.2" cy="73.8" r="1" fill="#fff" />
        </Blink>
        <path
          d="M54 84Q60 89 66 84"
          fill="none"
          stroke="#9C6B3F"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <g transform="rotate(16 88 128)">
          <rect x="84" y="116" width="7" height="30" rx="3.5" fill="#5B6473" />
          <circle cx="87.5" cy="114" r="7.5" fill="none" stroke="#5B6473" strokeWidth="3.4" />
        </g>
      </Idle>
    </CatalogFigure>
  );
}

/** Bo — The little one. Lime, a balloon on a string, a curl of hair. */
export function Bo({ size, animate = true, flip, seed = 0 }: CastFigureProps) {
  return (
    <CatalogFigure
      viewBox="0 0 120 178"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="bo"
    >
      <ellipse cx="60" cy="173" rx="32" ry="5" fill={A_GROUND} />
      <Idle kind="float">
        <circle cx="60" cy="15" r="11" fill="#E0518A" />
        <path d="M60 26v16" stroke="#6A6C75" strokeWidth="1.4" fill="none" />
      </Idle>
      <Idle kind="bob">
        <rect x="49" y="142" width="10" height="28" rx="5" fill="#454953" />
        <rect x="61" y="142" width="10" height="28" rx="5" fill="#454953" />
        <ellipse cx="52" cy="170" rx="9" ry="5" fill="#2B2D33" />
        <ellipse cx="68" cy="170" rx="9" ry="5" fill="#2B2D33" />
        <path d="M34 146C34 116 42 104 60 104 78 104 86 116 86 146Z" fill="#82B23A" />
        <rect x="28" y="106" width="11" height="34" rx="5.5" fill="#82B23A" />
        <circle cx="33.5" cy="143" r="6" fill="#F7D7B5" />
        <rect x="81" y="106" width="11" height="34" rx="5.5" fill="#82B23A" />
        <circle cx="86.5" cy="143" r="6" fill="#F7D7B5" />
        <rect x="53" y="90" width="14" height="14" rx="6" fill="#F7D7B5" />
        <circle cx="37" cy="74" r="5" fill="#F7D7B5" />
        <circle cx="83" cy="74" r="5" fill="#F7D7B5" />
        <circle cx="60" cy="74" r="24" fill="#F7D7B5" />
        <ellipse cx="51" cy="65" rx="8" ry="6" fill="#FFFFFF" opacity=".12" />
        <path
          d="M36 74C36 54 47 46 60 46 73 46 84 54 84 74 84 66 78 60 60 60 42 60 36 66 36 74Z"
          fill="#8C5A2B"
        />
        <path d="M53 48 q7 -11 14 0 q-7 -4 -14 0Z" fill="#8C5A2B" />
        <circle cx="47" cy="81" r="4" fill="#E0518A" opacity=".16" />
        <circle cx="73" cy="81" r="4" fill="#E0518A" opacity=".16" />
        <Blink>
          <circle cx="52" cy="75" r="3" fill="#241F1B" />
          <circle cx="53.2" cy="73.8" r="1" fill="#fff" />
          <circle cx="68" cy="75" r="3" fill="#241F1B" />
          <circle cx="69.2" cy="73.8" r="1" fill="#fff" />
        </Blink>
        <path
          d="M54 84Q60 89 66 84"
          fill="none"
          stroke="#9C6B3F"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </Idle>
    </CatalogFigure>
  );
}

/** Vera — The guide. Rose, side braids, a clipboard. */
export function Vera({ size, animate = true, flip, seed = 0 }: CastFigureProps) {
  return (
    <CatalogFigure
      viewBox="0 0 120 178"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="vera"
    >
      <ellipse cx="60" cy="173" rx="32" ry="5" fill={A_GROUND} />
      <Idle kind="bob2">
        <rect x="49" y="142" width="10" height="28" rx="5" fill="#454953" />
        <rect x="61" y="142" width="10" height="28" rx="5" fill="#454953" />
        <ellipse cx="52" cy="170" rx="9" ry="5" fill="#2B2D33" />
        <ellipse cx="68" cy="170" rx="9" ry="5" fill="#2B2D33" />
        <path d="M34 146C34 116 42 104 60 104 78 104 86 116 86 146Z" fill="#E0518A" />
        <rect x="28" y="106" width="11" height="34" rx="5.5" fill="#E0518A" />
        <circle cx="33.5" cy="143" r="6" fill="#E3A977" />
        <rect x="81" y="106" width="11" height="34" rx="5.5" fill="#E0518A" />
        <circle cx="86.5" cy="143" r="6" fill="#E3A977" />
        <rect x="53" y="90" width="14" height="14" rx="6" fill="#E3A977" />
        <circle cx="37" cy="74" r="5" fill="#E3A977" />
        <circle cx="83" cy="74" r="5" fill="#E3A977" />
        <circle cx="60" cy="74" r="24" fill="#E3A977" />
        <ellipse cx="51" cy="65" rx="8" ry="6" fill="#FFFFFF" opacity=".12" />
        <path
          d="M36 74C36 54 47 46 60 46 73 46 84 54 84 74 84 66 78 60 60 60 42 60 36 66 36 74Z"
          fill="#2B2B30"
        />
        <g fill="#2B2B30">
          <rect x="31" y="76" width="6" height="28" rx="3" />
          <circle cx="34" cy="106" r="5" />
          <rect x="83" y="76" width="6" height="28" rx="3" />
          <circle cx="86" cy="106" r="5" />
        </g>
        <circle cx="47" cy="81" r="4" fill="#E0518A" opacity=".16" />
        <circle cx="73" cy="81" r="4" fill="#E0518A" opacity=".16" />
        <Blink>
          <circle cx="52" cy="75" r="3" fill="#241F1B" />
          <circle cx="53.2" cy="73.8" r="1" fill="#fff" />
          <circle cx="68" cy="75" r="3" fill="#241F1B" />
          <circle cx="69.2" cy="73.8" r="1" fill="#fff" />
        </Blink>
        <path
          d="M54 84Q60 89 66 84"
          fill="none"
          stroke="#9C6B3F"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <rect
          x="60"
          y="112"
          width="42"
          height="28"
          rx="4"
          fill="#FFFFFF"
          stroke="#0E0E10"
          strokeWidth="2"
        />
        <path d="M68 122h26M68 130h17" stroke="#6A6C75" strokeWidth="2" strokeLinecap="round" />
      </Idle>
    </CatalogFigure>
  );
}

/** Otis — The maker. Slate, a mandarin cap, a wrench in hand. */
export function Otis({ size, animate = true, flip, seed = 0 }: CastFigureProps) {
  return (
    <CatalogFigure
      viewBox="0 0 120 178"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="otis"
    >
      <ellipse cx="60" cy="173" rx="32" ry="5" fill={A_GROUND} />
      <Idle kind="bob">
        <rect x="49" y="142" width="10" height="28" rx="5" fill="#454953" />
        <rect x="61" y="142" width="10" height="28" rx="5" fill="#454953" />
        <ellipse cx="52" cy="170" rx="9" ry="5" fill="#2B2D33" />
        <ellipse cx="68" cy="170" rx="9" ry="5" fill="#2B2D33" />
        <path d="M34 146C34 116 42 104 60 104 78 104 86 116 86 146Z" fill="#5B6473" />
        <rect x="28" y="106" width="11" height="34" rx="5.5" fill="#5B6473" />
        <circle cx="33.5" cy="143" r="6" fill="#9C6B3F" />
        <rect x="81" y="106" width="11" height="34" rx="5.5" fill="#5B6473" />
        <circle cx="86.5" cy="143" r="6" fill="#9C6B3F" />
        <rect x="53" y="90" width="14" height="14" rx="6" fill="#9C6B3F" />
        <circle cx="37" cy="74" r="5" fill="#9C6B3F" />
        <circle cx="83" cy="74" r="5" fill="#9C6B3F" />
        <circle cx="60" cy="74" r="24" fill="#9C6B3F" />
        <ellipse cx="51" cy="65" rx="8" ry="6" fill="#FFFFFF" opacity=".12" />
        <path d="M35 74q0 -29 25 -29 q25 0 25 29Z" fill="#F26A38" />
        <rect x="33" y="69" width="54" height="9" rx="4.5" fill="#F26A38" />
        <circle cx="60" cy="43" r="4.5" fill="#F26A38" />
        <circle cx="47" cy="81" r="4" fill="#E0518A" opacity=".16" />
        <circle cx="73" cy="81" r="4" fill="#E0518A" opacity=".16" />
        <Blink>
          <circle cx="52" cy="75" r="3" fill="#241F1B" />
          <circle cx="53.2" cy="73.8" r="1" fill="#fff" />
          <circle cx="68" cy="75" r="3" fill="#241F1B" />
          <circle cx="69.2" cy="73.8" r="1" fill="#fff" />
        </Blink>
        <path
          d="M54 84Q60 89 66 84"
          fill="none"
          stroke="#6B4A2C"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <g transform="rotate(16 88 128)">
          <rect x="84" y="116" width="7" height="30" rx="3.5" fill="#5B6473" />
          <circle cx="87.5" cy="114" r="7.5" fill="none" stroke="#5B6473" strokeWidth="3.4" />
        </g>
      </Idle>
    </CatalogFigure>
  );
}

/** Lumi — The spark. Mandarin, spiky hair, a magenta star overhead. */
export function Lumi({ size, animate = true, flip, seed = 0 }: CastFigureProps) {
  return (
    <CatalogFigure
      viewBox="0 0 120 178"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="lumi"
    >
      <ellipse cx="60" cy="173" rx="32" ry="5" fill={A_GROUND} />
      <Idle kind="float">
        <path d="M60 6l2.4 7 7 2.4-7 2.4L60 27l-2.4-7.2-7-2.4 7-2.4z" fill="#D6196F" />
      </Idle>
      <Idle kind="bob3">
        <rect x="49" y="142" width="10" height="28" rx="5" fill="#454953" />
        <rect x="61" y="142" width="10" height="28" rx="5" fill="#454953" />
        <ellipse cx="52" cy="170" rx="9" ry="5" fill="#2B2D33" />
        <ellipse cx="68" cy="170" rx="9" ry="5" fill="#2B2D33" />
        <path d="M34 146C34 116 42 104 60 104 78 104 86 116 86 146Z" fill="#F26A38" />
        <rect x="28" y="106" width="11" height="34" rx="5.5" fill="#F26A38" />
        <circle cx="33.5" cy="143" r="6" fill="#F2C9A0" />
        <rect x="81" y="106" width="11" height="34" rx="5.5" fill="#F26A38" />
        <circle cx="86.5" cy="143" r="6" fill="#F2C9A0" />
        <rect x="53" y="90" width="14" height="14" rx="6" fill="#F2C9A0" />
        <circle cx="37" cy="74" r="5" fill="#F2C9A0" />
        <circle cx="83" cy="74" r="5" fill="#F2C9A0" />
        <circle cx="60" cy="74" r="24" fill="#F2C9A0" />
        <ellipse cx="51" cy="65" rx="8" ry="6" fill="#FFFFFF" opacity=".12" />
        <path
          d="M36 74C36 54 47 46 60 46 73 46 84 54 84 74 84 66 78 60 60 60 42 60 36 66 36 74Z"
          fill="#2B2B30"
        />
        <path d="M45 49l3 -8 4 8zM57 46l3 -9 4 9zM69 49l3 -8 4 8z" fill="#2B2B30" />
        <circle cx="47" cy="81" r="4" fill="#E0518A" opacity=".16" />
        <circle cx="73" cy="81" r="4" fill="#E0518A" opacity=".16" />
        <Blink>
          <circle cx="52" cy="75" r="3" fill="#241F1B" />
          <circle cx="53.2" cy="73.8" r="1" fill="#fff" />
          <circle cx="68" cy="75" r="3" fill="#241F1B" />
          <circle cx="69.2" cy="73.8" r="1" fill="#fff" />
        </Blink>
        <path
          d="M54 84Q60 89 66 84"
          fill="none"
          stroke="#9C6B3F"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </Idle>
    </CatalogFigure>
  );
}

/** Dev — The coder. Cobalt, a laptop with glowing code. */
export function Dev({ size, animate = true, flip, seed = 0 }: CastFigureProps) {
  return (
    <CatalogFigure
      viewBox="0 0 120 178"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="dev"
    >
      <ellipse cx="60" cy="173" rx="32" ry="5" fill={A_GROUND} />
      <Idle kind="bob">
        <rect x="49" y="142" width="10" height="28" rx="5" fill="#454953" />
        <rect x="61" y="142" width="10" height="28" rx="5" fill="#454953" />
        <ellipse cx="52" cy="170" rx="9" ry="5" fill="#2B2D33" />
        <ellipse cx="68" cy="170" rx="9" ry="5" fill="#2B2D33" />
        <path d="M34 146C34 116 42 104 60 104 78 104 86 116 86 146Z" fill="#1F4FD8" />
        <rect x="28" y="106" width="11" height="34" rx="5.5" fill="#1F4FD8" />
        <circle cx="33.5" cy="143" r="6" fill="#C68642" />
        <rect x="81" y="106" width="11" height="34" rx="5.5" fill="#1F4FD8" />
        <circle cx="86.5" cy="143" r="6" fill="#C68642" />
        <rect x="53" y="90" width="14" height="14" rx="6" fill="#C68642" />
        <circle cx="37" cy="74" r="5" fill="#C68642" />
        <circle cx="83" cy="74" r="5" fill="#C68642" />
        <circle cx="60" cy="74" r="24" fill="#C68642" />
        <ellipse cx="51" cy="65" rx="8" ry="6" fill="#FFFFFF" opacity=".12" />
        <path
          d="M36 74C36 54 47 46 60 46 73 46 84 54 84 74 84 66 78 60 60 60 42 60 36 66 36 74Z"
          fill="#2B2B30"
        />
        <circle cx="47" cy="81" r="4" fill="#E0518A" opacity=".16" />
        <circle cx="73" cy="81" r="4" fill="#E0518A" opacity=".16" />
        <Blink>
          <circle cx="52" cy="75" r="3" fill="#241F1B" />
          <circle cx="53.2" cy="73.8" r="1" fill="#fff" />
          <circle cx="68" cy="75" r="3" fill="#241F1B" />
          <circle cx="69.2" cy="73.8" r="1" fill="#fff" />
        </Blink>
        <path
          d="M54 84Q60 89 66 84"
          fill="none"
          stroke="#7A4B28"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <rect x="44" y="116" width="32" height="26" rx="3" fill="#141418" />
        <path d="M50 124h20M50 130h14" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
      </Idle>
    </CatalogFigure>
  );
}

/** Suri — The performer. Gold, arms up, a rose star, mid-sway. */
export function Suri({ size, animate = true, flip, seed = 0 }: CastFigureProps) {
  return (
    <CatalogFigure
      viewBox="0 0 120 178"
      size={size}
      animate={animate}
      seed={seed}
      flip={flip}
      label="suri"
    >
      <ellipse cx="60" cy="173" rx="32" ry="5" fill={A_GROUND} />
      <Idle kind="float">
        <path
          d="M60 5l2.3 5.1 5.6.7-4.1 3.8 1 5.5L60 23.4 55.2 20.1l1-5.5L52 10.8l5.6-.7z"
          fill="#E0518A"
        />
      </Idle>
      <Idle kind="sway">
        <rect x="49" y="142" width="10" height="28" rx="5" fill="#454953" />
        <rect x="61" y="142" width="10" height="28" rx="5" fill="#454953" />
        <ellipse cx="52" cy="170" rx="9" ry="5" fill="#2B2D33" />
        <ellipse cx="68" cy="170" rx="9" ry="5" fill="#2B2D33" />
        <path d="M34 146C34 116 42 104 60 104 78 104 86 116 86 146Z" fill="#DFA21F" />
        <rect
          x="22"
          y="78"
          width="11"
          height="34"
          rx="5.5"
          fill="#DFA21F"
          transform="rotate(-28 33 110)"
        />
        <circle cx="17" cy="80" r="6" fill="#E3A977" />
        <rect
          x="87"
          y="78"
          width="11"
          height="34"
          rx="5.5"
          fill="#DFA21F"
          transform="rotate(28 87 110)"
        />
        <circle cx="103" cy="80" r="6" fill="#E3A977" />
        <rect x="53" y="90" width="14" height="14" rx="6" fill="#E3A977" />
        <circle cx="37" cy="74" r="5" fill="#E3A977" />
        <circle cx="83" cy="74" r="5" fill="#E3A977" />
        <circle cx="60" cy="74" r="24" fill="#E3A977" />
        <ellipse cx="51" cy="65" rx="8" ry="6" fill="#FFFFFF" opacity=".12" />
        <path
          d="M36 74C36 54 47 46 60 46 73 46 84 54 84 74 84 66 78 60 60 60 42 60 36 66 36 74Z"
          fill="#3A2A22"
        />
        <circle cx="60" cy="44" r="8" fill="#3A2A22" />
        <circle cx="47" cy="81" r="4" fill="#E0518A" opacity=".16" />
        <circle cx="73" cy="81" r="4" fill="#E0518A" opacity=".16" />
        <Blink>
          <circle cx="52" cy="75" r="3" fill="#241F1B" />
          <circle cx="53.2" cy="73.8" r="1" fill="#fff" />
          <circle cx="68" cy="75" r="3" fill="#241F1B" />
          <circle cx="69.2" cy="73.8" r="1" fill="#fff" />
        </Blink>
        <path
          d="M54 84Q60 89 66 84"
          fill="none"
          stroke="#9C6B3F"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </Idle>
    </CatalogFigure>
  );
}

// --- the buddies: eighteen kids ported from the character catalog ---------------------------------
// Full-figure companions on their own 120x178 canvas; the avatar system crops to the head. They
// carry a fixed catalog expression, so mood is accepted for cast-compatibility but not used.
export const BUDDIES = {
  ace: { name: 'Ace', role: 'the learner', Component: Ace },
  iris: { name: 'Iris', role: 'the teacher', Component: Iris },
  theo: { name: 'Theo', role: 'the explorer', Component: Theo },
  maya: { name: 'Maya', role: 'the builder', Component: Maya },
  sol: { name: 'Sol', role: 'the achiever', Component: Sol },
  wren: { name: 'Wren', role: 'the dreamer', Component: Wren },
  juno: { name: 'Juno', role: 'the captain', Component: Juno },
  pax: { name: 'Pax', role: 'the friend', Component: Pax },
  remy: { name: 'Remy', role: 'the tinkerer', Component: Remy },
  nova: { name: 'Nova', role: 'the scientist', Component: Nova },
  indi: { name: 'Indi', role: 'the artist', Component: Indi },
  bo: { name: 'Bo', role: 'the little one', Component: Bo },
  vera: { name: 'Vera', role: 'the guide', Component: Vera },
  otis: { name: 'Otis', role: 'the maker', Component: Otis },
  lumi: { name: 'Lumi', role: 'the spark', Component: Lumi },
  dev: { name: 'Dev', role: 'the coder', Component: Dev },
  robin: { name: 'Robin', role: 'the helper', Component: Robin },
  suri: { name: 'Suri', role: 'the performer', Component: Suri },
} satisfies Record<
  string,
  { name: string; role: string; Component: ComponentType<CastFigureProps> }
>;

export type BuddyId = keyof typeof BUDDIES;
