'use client';

/**
 * The cast — eight study buddies, one skeleton. Difference is paint, ears, and one idea;
 * the construction (round head, soft body, two-dot face, shared ground) never changes.
 * New character = new paint + new silhouette detail on the same rules.
 */

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
          d="M86 106 q22 -2 18 -26"
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
        {/* body */}
        <path
          d="M30 70 q0 -34 30 -34 q30 0 30 34 q0 38 -30 38 q-30 0 -30 -38 Z"
          fill="#A9794A"
        />
        {/* ear tufts */}
        <path d="M34 44 L42 60 L26 62 Z" fill="#A9794A" />
        <path d="M86 44 L78 60 L94 62 Z" fill="#A9794A" />
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
        <path d="M60 62 q-20 0 -20 12 q0 9 20 9 q20 0 20 -9 q0 -12 -20 -12 Z" fill="#F7F2EA" />
        <Eyes lx={50} rx={70} y={56} r={2.8} mood={mood} animate={animate} seed={seed} />
        <path d="M60 66 l-4 4 h8 Z" fill={FACE_INK} />
        <Mouth cx={60} y={74} mood={mood} color="#B9822F" w={9} />
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
        <path d="M60 34 C40 34 32 52 32 82 32 106 44 117 60 117 76 117 88 106 88 82 88 52 80 34 60 34 Z" fill="#33343A" />
        {/* belly */}
        <path d="M60 58 C48 58 42 70 42 88 42 104 50 111 60 111 70 111 78 104 78 88 78 70 72 58 60 58 Z" fill="#FFFFFF" />
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
      {/* she hovers — a smaller, fainter shadow */}
      <ellipse cx="60" cy="122" rx="18" ry="4" fill="rgba(18,19,22,0.045)" />
      <Flutter animate={animate} delay={seed * 0.4}>
        {/* wings */}
        <ellipse cx="52" cy="52" rx="9" ry="14" fill="#FFFFFF" opacity=".75" transform="rotate(-18 52 52)" />
        <ellipse cx="72" cy="52" rx="9" ry="14" fill="#FFFFFF" opacity=".75" transform="rotate(18 72 52)" />
        {/* body */}
        <ellipse cx="62" cy="76" rx="20" ry="15" fill={PAINT.gold} />
        <path d="M56 62.5 q-2 13 0 27 M68 63.5 q3 12 0 25.5" stroke="#33343A" strokeWidth={5} fill="none" strokeLinecap="round" />
        {/* stinger */}
        <path d="M82 76 l8 3 -8 3 Z" fill="#33343A" />
        {/* head */}
        <circle cx="40" cy="72" r="11" fill="#33343A" />
        <path d="M34 62 q-4 -6 -9 -6 M44 60 q0 -7 4 -10" stroke="#33343A" strokeWidth={1.8} fill="none" strokeLinecap="round" />
        <Eyes lx={36} rx={44} y={71} r={1.9} color="#FFFFFF" glint={false} mood={mood} animate={animate} seed={seed} />
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
        {/* head */}
        <circle cx="97" cy="94" r="11" fill="#82B23A" />
        <Eyes lx={95} rx={101} y={92} r={1.9} mood={mood} animate={animate} seed={seed} />
        <Mouth cx={99} y={98} mood={mood} color="#5E822A" w={6} />
        {/* legs + tail */}
        <rect x="34" y="106" width="12" height="12" rx="5" fill="#82B23A" />
        <rect x="66" y="106" width="12" height="12" rx="5" fill="#82B23A" />
        <path d="M24 102 q-8 2 -10 8 q8 2 12 -2 Z" fill="#82B23A" />
        {/* shell */}
        <path d="M26 104 q0 -40 32 -40 q32 0 32 40 Z" fill={PAINT.mint} />
        <rect x="22" y="102" width="72" height="9" rx="4.5" fill="#0FA3A3" />
        {/* shell plates */}
        <g fill="#0FA3A3" opacity=".5">
          <circle cx="44" cy="90" r="5.5" />
          <circle cx="58" cy="78" r="6.5" />
          <circle cx="72" cy="90" r="5.5" />
        </g>
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
