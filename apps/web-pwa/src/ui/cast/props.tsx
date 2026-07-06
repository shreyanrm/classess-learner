'use client';

/**
 * The world — nature and objects the cast lives among. Same fills, same radius language,
 * same shared baseline, same slow idle. One prop carries one idea.
 */

import { Bob, Figure, Float, Ground, PAINT, Sway, type WorldPropProps } from './shared';

/** A stack of three well-loved books. */
export function Books({ size, animate = true, seed = 0 }: WorldPropProps) {
  return (
    <Figure size={size} label="a stack of books">
      <Ground rx={34} />
      <Bob animate={animate} delay={0.2 + seed * 0.3} duration={4.6}>
        <rect x="28" y="104" width="64" height="14" rx="2.5" fill={PAINT.violet} />
        <rect x="82" y="107" width="7" height="8" rx="1.5" fill="#F4F1EA" />
        <rect x="34" y="90" width="56" height="14" rx="2.5" fill={PAINT.magenta} />
        <rect x="36" y="93" width="7" height="8" rx="1.5" fill="#F4F1EA" />
        <rect x="31" y="76" width="58" height="14" rx="2.5" fill={PAINT.gold} />
        <rect x="80" y="79" width="7" height="8" rx="1.5" fill="#F4F1EA" />
        {/* bookmark */}
        <path d="M70 76 v-10 l4 4 4 -4 v10 Z" fill={PAINT.mint} />
      </Bob>
    </Figure>
  );
}

/** A conical flask, mid-experiment. */
export function Beaker({ size, animate = true, seed = 0 }: WorldPropProps) {
  return (
    <Figure size={size} label="a flask">
      <Ground rx={30} />
      <Bob animate={animate} delay={0.1 + seed * 0.3} duration={4.2}>
        <path
          d="M52 44 V64 L36 96 C33.4 102 37 108 43 108 H77 C83 108 86.6 102 84 96 L68 64 V44 Z"
          fill="#F7FBFC"
          stroke={PAINT.slate}
          strokeWidth={3}
          strokeLinejoin="round"
        />
        <path
          d="M45.5 82 h29 L84 96 C86.6 102 83 108 77 108 H43 C37 108 33.4 102 36 96 Z"
          fill={PAINT.mint}
        />
        <rect x="48" y="38" width="24" height="7" rx="3.5" fill={PAINT.slate} />
        <circle cx="52" cy="96" r="3.2" fill="#FFFFFF" opacity=".85" />
        <circle cx="63" cy="100" r="2.2" fill="#FFFFFF" opacity=".7" />
        <Float animate={animate} delay={seed * 0.4}>
          <circle cx="66" cy="56" r="3.4" fill={PAINT.mint} />
          <circle cx="74" cy="44" r="2.2" fill={PAINT.gold} />
        </Float>
      </Bob>
    </Figure>
  );
}

/** A ringed planet — for the ones who ask "but why?" about the sky. */
export function Planet({ size, animate = true, seed = 0 }: WorldPropProps) {
  return (
    <Figure size={size} label="a ringed planet">
      <ellipse cx="60" cy="122" rx="20" ry="4" fill="rgba(18,19,22,0.045)" />
      <Float animate={animate} delay={seed * 0.5} duration={5}>
        {/* ring, far side */}
        <path
          d="M24 66 A36 12 0 0 1 96 66"
          fill="none"
          stroke={PAINT.gold}
          strokeWidth={4.5}
          strokeLinecap="round"
          transform="rotate(-16 60 66)"
        />
        <circle cx="60" cy="66" r="23" fill={PAINT.violet} />
        <g fill="#8E6FC4">
          <circle cx="51" cy="59" r="5.5" />
          <circle cx="68" cy="72" r="4" />
          <circle cx="61" cy="50" r="2.6" />
        </g>
        {/* ring, near side */}
        <path
          d="M96 66 A36 12 0 0 1 24 66"
          fill="none"
          stroke={PAINT.gold}
          strokeWidth={4.5}
          strokeLinecap="round"
          transform="rotate(-16 60 66)"
        />
      </Float>
    </Figure>
  );
}

/** A potted plant — quiet company. */
export function Plant({ size, animate = true, seed = 0 }: WorldPropProps) {
  return (
    <Figure size={size} label="a potted plant">
      <Ground rx={26} />
      <Sway animate={animate} origin="60px 88px" delay={seed * 0.4} duration={5}>
        <path d="M60 88 C45 68 36 50 42 32 q14 8 19 32 Z" fill="#4CA268" />
        <path d="M60 88 C75 68 85 48 78 30 q-14 8 -19 34 Z" fill="#3E8E5A" />
        <path d="M60 90 C57 66 57 46 60 32 q4 18 1 58 Z" fill="#5AAE76" />
      </Sway>
      <path d="M42 88 h36 l-4 26 H46 Z" fill="#C8794A" />
      <rect x="40" y="84" width="40" height="8" rx="3" fill="#D98A57" />
    </Figure>
  );
}

/** A flag planted on the summit of something just finished. */
export function Flag({ size, animate = true, seed = 0 }: WorldPropProps) {
  return (
    <Figure size={size} label="a flag">
      <Ground rx={22} />
      <path d="M46 118 V26" stroke={PAINT.slate} strokeWidth={4} strokeLinecap="round" />
      <circle cx="46" cy="23" r="3.5" fill={PAINT.gold} />
      <Sway animate={animate} origin="48px 30px" delay={seed * 0.3} duration={3.8}>
        <path d="M50 30 H92 L82 42 L92 54 H50 Z" fill={PAINT.magenta} />
      </Sway>
    </Figure>
  );
}

/** A pencil at the ready. */
export function Pencil({ size, animate = true, seed = 0 }: WorldPropProps) {
  return (
    <Figure size={size} label="a pencil">
      <Ground rx={24} />
      <Bob animate={animate} delay={0.3 + seed * 0.3} duration={4.4}>
        <g transform="rotate(9 60 80)">
          <rect x="53" y="52" width="15" height="10" rx="3" fill={PAINT.rose} />
          <rect x="53" y="60" width="15" height="6" fill="#B9BEC7" />
          <rect x="53" y="66" width="15" height="36" fill={PAINT.gold} />
          <path d="M53 102 h15 L60.5 118 Z" fill="#E3A977" />
          <path d="M57 110 L60.5 118 64 110 Z" fill="#33343A" />
        </g>
      </Bob>
    </Figure>
  );
}

/** A lightbulb, freshly lit. */
export function Bulb({ size, animate = true, seed = 0 }: WorldPropProps) {
  return (
    <Figure size={size} label="a lightbulb">
      <ellipse cx="60" cy="122" rx="18" ry="4" fill="rgba(18,19,22,0.045)" />
      <Float animate={animate} delay={seed * 0.4}>
        <path
          d="M60 34 a23 23 0 0 1 15 39.5 q-4 4 -4 9 H49 q0 -5 -4 -9 A23 23 0 0 1 60 34 Z"
          fill="#F4D87A"
        />
        <circle cx="60" cy="59" r="13" fill="#FBEFB0" />
        <rect x="49" y="86" width="22" height="6" rx="2.5" fill={PAINT.silver} />
        <rect x="51" y="94" width="18" height="5" rx="2.5" fill={PAINT.silver} />
        <path
          d="M60 28 v-8 M82 42 l6 -5 M38 42 l-6 -5"
          stroke="#F2B33A"
          strokeWidth={3}
          strokeLinecap="round"
        />
      </Float>
    </Figure>
  );
}

/** The trophy — earned, never given. */
export function Trophy({ size, animate = true, seed = 0 }: WorldPropProps) {
  return (
    <Figure size={size} label="a trophy">
      <Ground rx={26} />
      <Bob animate={animate} delay={0.15 + seed * 0.3} duration={4}>
        <path d="M41 34 h38 v22 a19 19 0 0 1 -38 0 Z" fill="#F2C53D" />
        <path
          d="M41 40 h-10 a10 10 0 0 0 10 14 M79 40 h10 a10 10 0 0 1 -10 14"
          fill="none"
          stroke="#F2C53D"
          strokeWidth={4}
        />
        <rect x="53" y="74" width="14" height="12" fill="#E0A91F" />
        <rect x="51" y="86" width="18" height="16" rx="2" fill="#C8924F" />
        <rect x="45" y="102" width="30" height="8" rx="2" fill="#9C6431" />
        <path
          d="M60 42 l2.6 5 5.4 .6 -4 3.8 1 5.4 -5 -2.8 -5 2.8 1 -5.4 -4 -3.8 5.4 -.6 Z"
          fill="#FFFFFF"
          opacity=".72"
        />
      </Bob>
    </Figure>
  );
}
