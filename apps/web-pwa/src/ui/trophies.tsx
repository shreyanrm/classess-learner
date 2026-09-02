'use client';

/**
 * The trophy objects (Fable's ceremony spec) — legit awards, not glyphs: cups with handles,
 * medals on ribbons, crest shields, laurel plinths. Each is layered SVG metalwork — a vertical
 * light→base→dark gradient with a specular highlight and a rim — struck in bronze, silver, gold,
 * or prismatic, with an engraved Caveat base plate and a subject-hue gem. Zero authored assets
 * (DESIGN.md §2). The shelf presentation (spotlight cone + soft under-reflection, dark silhouette
 * when locked) lives in `TrophyPlinth`, so the trophy object itself is pure and reusable by the
 * ceremony overlay.
 */

import { motion } from 'framer-motion';
import { type CSSProperties, useId } from 'react';

export type MetalTier = 'bronze' | 'silver' | 'gold' | 'prismatic';
export type TrophyForm = 'cup' | 'medal' | 'shield' | 'laurel';

// The milestone ladders — single source of truth, shared by the trophy room and the ceremony
// trigger in the progress store (so the room and the award moment can never drift apart).
export const STREAK_TIERS = [3, 7, 14, 30, 60, 100] as const;
export const XP_TIERS = [250, 1000, 2500, 5000, 10000] as const;

interface Metal {
  light: string;
  base: string;
  dark: string;
  rim: string;
}
const METALS: Record<Exclude<MetalTier, 'prismatic'>, Metal> = {
  bronze: { light: '#F1C79A', base: '#C67B3C', dark: '#7C4A22', rim: '#9A6230' },
  silver: { light: '#F7F9FC', base: '#C6CBD4', dark: '#818794', rim: '#A6ACB8' },
  gold: { light: '#FFEEAF', base: '#EBB63F', dark: '#A5771A', rim: '#CE9A28' },
};

/** The tier a milestone earns — magnitude buys a better metal. */
export function tierForStreak(days: number): MetalTier {
  if (days >= 100) return 'prismatic';
  if (days >= 30) return 'gold';
  if (days >= 14) return 'silver';
  return 'bronze';
}
export function tierForXp(xp: number): MetalTier {
  if (xp >= 10000) return 'prismatic';
  if (xp >= 2500) return 'gold';
  if (xp >= 1000) return 'silver';
  return 'bronze';
}

/** The layered metal + gem + plate gradients for one instance, keyed off a unique id. */
function Defs({ uid, tier, hue }: { uid: string; tier: MetalTier; hue: string }) {
  const m = tier === 'prismatic' ? METALS.silver : METALS[tier];
  return (
    <defs>
      <linearGradient id={`${uid}-m`} x1="0.15" y1="0" x2="0.4" y2="1">
        {tier === 'prismatic' ? (
          <>
            <stop offset="0%" stopColor="#C3B4FF" />
            <stop offset="28%" stopColor="#82E6D6" />
            <stop offset="54%" stopColor="#FFE6A0" />
            <stop offset="78%" stopColor="#FF9ED0" />
            <stop offset="100%" stopColor="#9AA6FF" />
          </>
        ) : (
          <>
            <stop offset="0%" stopColor={m.light} />
            <stop offset="44%" stopColor={m.base} />
            <stop offset="100%" stopColor={m.dark} />
          </>
        )}
      </linearGradient>
      {/* the specular sheen laid over the body */}
      <linearGradient id={`${uid}-spec`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.72" />
        <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0.08" />
        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
      </linearGradient>
      {/* the subject-hue gem — a lit facet */}
      <radialGradient id={`${uid}-gem`} cx="0.38" cy="0.32" r="0.85">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
        <stop offset="26%" stopColor={hue} stopOpacity="0.95" />
        <stop offset="100%" stopColor={hue} />
      </radialGradient>
      {/* the engraved plate — a darker struck bar */}
      <linearGradient id={`${uid}-plate`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={tier === 'prismatic' ? '#8E8AA8' : m.base} />
        <stop offset="100%" stopColor={tier === 'prismatic' ? '#4E4A66' : m.dark} />
      </linearGradient>
    </defs>
  );
}

/** The engraved name plate under the trophy — Caveat, cut into the metal (a lit twin behind). */
function Plate({ uid, tier, text }: { uid: string; tier: MetalTier; text: string }) {
  const rim = tier === 'prismatic' ? 'rgba(255,255,255,0.55)' : METALS[tier].rim;
  return (
    <g>
      <rect
        x={22}
        y={102}
        width={56}
        height={18}
        rx={2}
        fill={`url(#${uid}-plate)`}
        stroke={rim}
        strokeWidth={0.6}
      />
      {/* a hairline of light along the plate's top edge */}
      <line
        x1={24}
        y1={103.2}
        x2={76}
        y2={103.2}
        stroke="#FFFFFF"
        strokeOpacity={0.35}
        strokeWidth={0.6}
      />
      {text && (
        <g fontFamily="'Caveat', cursive" fontWeight={600} textAnchor="middle">
          {/* the lit twin, offset — the engraved-into-metal depth */}
          <text x={50} y={116.4} fontSize={11} fill="#FFFFFF" fillOpacity={0.28}>
            {text}
          </text>
          <text
            x={50}
            y={115.8}
            fontSize={11}
            fill={tier === 'prismatic' ? '#3A3652' : METALS[tier].dark}
          >
            {text}
          </text>
        </g>
      )}
    </g>
  );
}

/** The subject-hue gem — a faceted stone with a white specular glint. */
function Gem({ uid, cx, cy, r }: { uid: string; cx: number; cy: number; r: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={`url(#${uid}-gem)`} />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity={0.5}
        strokeWidth={0.5}
      />
      <circle
        cx={cx - r * 0.34}
        cy={cy - r * 0.36}
        r={r * 0.24}
        fill="#FFFFFF"
        fillOpacity={0.85}
      />
    </g>
  );
}

function CupBody({ uid, tier }: { uid: string; tier: MetalTier }) {
  const fill = `url(#${uid}-m)`;
  const rim = tier === 'prismatic' ? 'rgba(255,255,255,0.5)' : METALS[tier].rim;
  return (
    <g stroke={rim} strokeWidth={0.7}>
      {/* handles */}
      <path d="M30 34 C16 34 16 54 32 56" fill="none" strokeWidth={3.2} stroke={rim} />
      <path d="M70 34 C84 34 84 54 68 56" fill="none" strokeWidth={3.2} stroke={rim} />
      {/* the bowl */}
      <path d="M28 30 H72 L64 62 Q50 72 36 62 Z" fill={fill} />
      <ellipse cx={50} cy={30} rx={22} ry={5} fill={fill} />
      {/* stem + foot */}
      <rect x={46.5} y={66} width={7} height={12} fill={fill} />
      <path d="M38 90 L42 78 H58 L62 90 Z" fill={fill} />
      <rect x={34} y={90} width={32} height={5} rx={1.5} fill={fill} />
      {/* specular sheen + gem */}
      <path d="M31 31 H49 L44 60 Q39 62 35 58 Z" fill={`url(#${uid}-spec)`} stroke="none" />
      <Gem uid={uid} cx={50} cy={46} r={7} />
    </g>
  );
}

function MedalBody({ uid, tier, hue }: { uid: string; tier: MetalTier; hue: string }) {
  const fill = `url(#${uid}-m)`;
  const rim = tier === 'prismatic' ? 'rgba(255,255,255,0.5)' : METALS[tier].rim;
  return (
    <g>
      {/* the ribbon */}
      <path d="M38 8 L46 12 L46 52 L34 46 Z" fill={hue} opacity={0.92} />
      <path d="M62 8 L54 12 L54 52 L66 46 Z" fill={hue} opacity={0.78} />
      {/* the struck disc */}
      <circle cx={50} cy={70} r={26} fill={fill} stroke={rim} strokeWidth={0.8} />
      <circle
        cx={50}
        cy={70}
        r={20}
        fill="none"
        stroke={rim}
        strokeWidth={0.7}
        strokeDasharray="1.5 3"
      />
      {/* sheen + gem */}
      <path d="M32 60 A26 26 0 0 1 58 47 A20 20 0 0 0 37 66 Z" fill={`url(#${uid}-spec)`} />
      <Gem uid={uid} cx={50} cy={70} r={9} />
    </g>
  );
}

function ShieldBody({ uid, tier }: { uid: string; tier: MetalTier }) {
  const fill = `url(#${uid}-m)`;
  const rim = tier === 'prismatic' ? 'rgba(255,255,255,0.5)' : METALS[tier].rim;
  return (
    <g>
      {/* laurel flanks hugging the crest */}
      <path
        d="M22 34 Q9 60 24 86"
        fill="none"
        stroke={rim}
        strokeWidth={2.8}
        strokeLinecap="round"
      />
      <path
        d="M78 34 Q91 60 76 86"
        fill="none"
        stroke={rim}
        strokeWidth={2.8}
        strokeLinecap="round"
      />
      {/* the crest — a broad award shield */}
      <path
        d="M24 20 H76 V50 Q76 80 50 94 Q24 80 24 50 Z"
        fill={fill}
        stroke={rim}
        strokeWidth={0.8}
      />
      <path d="M29 24 H49 V88 Q34 78 29 52 Z" fill={`url(#${uid}-spec)`} />
      <Gem uid={uid} cx={50} cy={52} r={10} />
    </g>
  );
}

function LaurelBody({ uid, tier }: { uid: string; tier: MetalTier }) {
  const fill = `url(#${uid}-m)`;
  const rim = tier === 'prismatic' ? 'rgba(255,255,255,0.5)' : METALS[tier].rim;
  return (
    <g>
      {/* the wreath */}
      <path
        d="M50 24 Q22 34 26 70 Q30 90 50 94"
        fill="none"
        stroke={fill}
        strokeWidth={5}
        strokeLinecap="round"
      />
      <path
        d="M50 24 Q78 34 74 70 Q70 90 50 94"
        fill="none"
        stroke={fill}
        strokeWidth={5}
        strokeLinecap="round"
      />
      <path d="M50 24 Q22 34 26 70 Q30 90 50 94" fill="none" stroke={rim} strokeWidth={0.7} />
      <path d="M50 24 Q78 34 74 70 Q70 90 50 94" fill="none" stroke={rim} strokeWidth={0.7} />
      <Gem uid={uid} cx={50} cy={58} r={10} />
    </g>
  );
}

export function Trophy({
  form,
  tier,
  hue,
  size = 96,
  engrave,
  plate = true,
  style,
}: {
  form: TrophyForm;
  tier: MetalTier;
  hue: string;
  size?: number;
  engrave?: string;
  plate?: boolean;
  style?: CSSProperties;
}) {
  const uid = useId().replace(/:/g, '');
  return (
    <svg
      viewBox="0 0 100 124"
      width={size}
      height={size * 1.24}
      role="presentation"
      aria-hidden
      style={{ display: 'block', ...style }}
    >
      <Defs uid={uid} tier={tier} hue={hue} />
      {form === 'cup' && <CupBody uid={uid} tier={tier} />}
      {form === 'medal' && <MedalBody uid={uid} tier={tier} hue={hue} />}
      {form === 'shield' && <ShieldBody uid={uid} tier={tier} />}
      {form === 'laurel' && <LaurelBody uid={uid} tier={tier} />}
      {plate && <Plate uid={uid} tier={tier} text={engrave ?? ''} />}
    </svg>
  );
}

/**
 * One shelf position: the trophy stands in a spotlight cone with a soft under-reflection, its name
 * and one quiet line beneath. Locked positions are dark silhouettes — the shape without the light,
 * naming exactly what earns it next.
 */
export function TrophyPlinth({
  form,
  tier,
  hue,
  engrave,
  title,
  sub,
  earned,
}: {
  form: TrophyForm;
  tier: MetalTier;
  hue: string;
  engrave?: string;
  title: string;
  sub: string;
  earned: boolean;
}) {
  return (
    <motion.div
      initial="rest"
      animate="rest"
      whileHover={earned ? 'hover' : undefined}
      variants={{ rest: { y: 0 }, hover: { y: -5 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 24 }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}
    >
      <div
        style={{
          width: '100%',
          height: 168,
          borderRadius: 3,
          background: earned
            ? `linear-gradient(180deg, ${hue}14 0%, ${hue}06 46%, transparent 100%)`
            : 'var(--clss-tonal)',
          border: earned
            ? '1px solid var(--clss-card-border)'
            : '1px dashed var(--clss-hairline-on-paper-strong)',
          display: 'grid',
          placeItems: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* the spotlight cone falling from above the shelf */}
        {earned && (
          <motion.div
            aria-hidden
            variants={{ rest: { opacity: 0.55 }, hover: { opacity: 0.95 } }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            style={{
              position: 'absolute',
              top: -18,
              width: 92,
              height: 150,
              clipPath: 'polygon(38% 0, 62% 0, 100% 100%, 0% 100%)',
              background: `linear-gradient(180deg, ${hue}30, ${hue}00 78%)`,
              filter: 'blur(4px)',
              pointerEvents: 'none',
            }}
          />
        )}
        {/* the trophy, and its soft reflection on the shelf */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            filter: earned ? undefined : 'grayscale(1) brightness(0.42) contrast(0.7)',
            opacity: earned ? 1 : 0.6,
          }}
        >
          <Trophy form={form} tier={tier} hue={hue} size={92} engrave={engrave} />
          {earned && (
            <div
              aria-hidden
              style={{
                marginTop: -6,
                transform: 'scaleY(-0.42)',
                opacity: 0.16,
                filter: 'blur(1.5px)',
                maskImage: 'linear-gradient(180deg, #000 0%, transparent 70%)',
                WebkitMaskImage: 'linear-gradient(180deg, #000 0%, transparent 70%)',
              }}
            >
              <Trophy form={form} tier={tier} hue={hue} size={92} plate={false} />
            </div>
          )}
        </div>
        {/* the shelf line the trophy stands on */}
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            width: 74,
            height: 2,
            borderRadius: 2,
            background: earned ? hue : 'var(--clss-hairline-on-paper-strong)',
            opacity: earned ? 0.5 : 1,
          }}
        />
      </div>
      <div style={{ textAlign: 'center', minHeight: 34 }}>
        <div
          style={{
            fontSize: '0.9rem',
            fontWeight: 550,
            color: earned ? 'var(--clss-ink-900)' : 'var(--clss-ink-faint)',
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: '0.72rem',
            color: earned ? 'var(--clss-ink-soft)' : 'var(--clss-ink-300)',
            marginTop: 2,
          }}
        >
          {sub}
        </div>
      </div>
    </motion.div>
  );
}

// --- The award model + the honest superlatives ---------------------------------------------------

/**
 * A trophy the learner just earned, everything the ceremony needs. `standingLine` is always an
 * HONEST self-superlative drawn from real data — crossing a new tier genuinely IS the longest
 * streak / highest total yet. `cohortPercentile` is a reserved slot: rendered ONLY when real
 * cohort data exists someday, never fabricated.
 */
export interface TrophyAward {
  id: number;
  form: TrophyForm;
  tier: MetalTier;
  /** Concrete hex (the track hue) — the ceremony's confetti mixes it with gold and paper-white. */
  hue: string;
  title: string;
  engrave: string;
  standingLine: string;
  woboLine: string;
  cohortPercentile?: number;
}

const STREAK_HUE = '#66B300';
const XP_HUE = '#1F35E0';

const fmtXp = (n: number) => n.toLocaleString('en-IN');
const shortXp = (n: number) => (n >= 1000 ? `${n / 1000}k` : `${n}`);

/**
 * Build the award for a milestone key (`streak:30`, `xp:1000`) — the single place trophy identity,
 * metal, and copy are decided. Returns everything but the id (the store stamps it).
 */
export function trophyAwardFor(key: string): Omit<TrophyAward, 'id'> {
  const [kind, raw] = key.split(':');
  const n = Number(raw);
  if (kind === 'streak') {
    return {
      form: 'medal',
      tier: tierForStreak(n),
      hue: STREAK_HUE,
      title: `${n}-day streak`,
      engrave: `${n} days`,
      standingLine: 'your longest streak yet',
      woboLine: `${n} days in a row — you keep showing up, and it shows.`,
    };
  }
  return {
    form: 'cup',
    tier: tierForXp(n),
    hue: XP_HUE,
    title: `${fmtXp(n)} xp`,
    engrave: `${shortXp(n)} xp`,
    standingLine: 'more xp than you have ever earned',
    woboLine: 'look how far you have come — this is real ground you have covered.',
  };
}

/** Every milestone the learner has earned at this xp + streak, as stable keys. */
export function earnedTrophyKeys(xp: number, streakDays: number): string[] {
  return [
    ...STREAK_TIERS.filter((t) => streakDays >= t).map((t) => `streak:${t}`),
    ...XP_TIERS.filter((t) => xp >= t).map((t) => `xp:${t}`),
  ];
}

/** The most significant of several fresh keys — the scarce ceremony shows one, the biggest. */
export function topTrophyKey(keys: string[]): string {
  return [...keys].sort((a, b) => Number(b.split(':')[1]) - Number(a.split(':')[1]))[0] as string;
}

// ponytail: one runnable check — the ladders and superlatives must line up with the room.
if (import.meta.env.DEV) {
  console.assert(earnedTrophyKeys(1200, 8).includes('xp:1000'), 'xp:1000 earned at 1200');
  console.assert(!earnedTrophyKeys(900, 8).includes('xp:1000'), 'xp:1000 not earned at 900');
  console.assert(topTrophyKey(['streak:7', 'xp:1000']) === 'xp:1000', 'biggest wins');
  console.assert(tierForStreak(100) === 'prismatic' && tierForXp(250) === 'bronze', 'tiers');
}
