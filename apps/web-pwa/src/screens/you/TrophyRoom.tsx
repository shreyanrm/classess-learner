'use client';

/**
 * The trophy room — not a list of past courses but a room you walk into. Every earned thing sits
 * on its own lit pedestal: a mastered concept's ignited sigil, a streak medallion, an XP medal.
 * Empty pedestals stand beside them, faint and dashed, naming exactly what earns the next one —
 * so the room is always half promise. Generative art, zero authored assets (DESIGN.md §2).
 */

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { chapterById } from '../../data/catalog';
import type { Topic } from '../../data/model';
import { BossSigil } from '../../ui/art';
import { toneForSubject } from '../../ui/hues';
import { fluidType } from '../../ui/kit';

const STREAK_HUE = '#66B300';
const XP_HUE = '#1F35E0';
const STREAK_TIERS = [3, 7, 14, 30, 60, 100];
const XP_TIERS = [250, 1000, 2500, 5000, 10000];

/** A struck medallion — a ringed medal with laurels and the milestone at its heart. */
function Medallion({ value, hue, earned }: { value: string; hue: string; earned: boolean }) {
  const stroke = earned ? hue : 'var(--clss-ink-300)';
  return (
    <svg viewBox="0 0 84 84" width={84} height={84} role="presentation" aria-hidden>
      <circle
        cx={42}
        cy={42}
        r={31}
        fill={earned ? hue : 'var(--clss-tonal)'}
        fillOpacity={earned ? 0.07 : 1}
      />
      <circle cx={42} cy={42} r={31} fill="none" stroke={stroke} strokeWidth={earned ? 2.4 : 1.4} />
      <circle
        cx={42}
        cy={42}
        r={24}
        fill="none"
        stroke={stroke}
        strokeWidth={0.8}
        strokeDasharray="2 4"
      />
      {/* two laurel arcs */}
      <path
        d="M24 60 A 22 22 0 0 1 24 24"
        fill="none"
        stroke={stroke}
        strokeWidth={earned ? 2 : 1.2}
        strokeLinecap="round"
      />
      <path
        d="M60 24 A 22 22 0 0 1 60 60"
        fill="none"
        stroke={stroke}
        strokeWidth={earned ? 2 : 1.2}
        strokeLinecap="round"
      />
      <text
        x={42}
        y={42}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={value.length > 3 ? 15 : 20}
        fontWeight={700}
        fill={earned ? hue : 'var(--clss-ink-300)'}
        style={{ fontFamily: 'inherit', letterSpacing: '-0.03em' }}
      >
        {value}
      </text>
    </svg>
  );
}

/** One pedestal: the object stands on a lit plinth, its name on a plate below. */
function Pedestal({
  art,
  title,
  sub,
  hue,
  earned,
}: {
  art: ReactNode;
  title: string;
  sub: string;
  hue: string;
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
          height: 132,
          borderRadius: 3,
          // gallery light: earned pedestals glow from above in their hue; empty ones stay flat tonal
          background: earned
            ? `linear-gradient(180deg, ${hue}1A 0%, ${hue}08 46%, ${hue}03 100%)`
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
        {/* the shelf light — a soft pool the object stands in, brightening as you lean in */}
        {earned && (
          <motion.div
            aria-hidden
            variants={{ rest: { opacity: 0.5 }, hover: { opacity: 0.9 } }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            style={{
              position: 'absolute',
              bottom: -10,
              width: 108,
              height: 84,
              borderRadius: '50%',
              background: `radial-gradient(ellipse at center bottom, ${hue}33, ${hue}00 70%)`,
              filter: 'blur(3px)',
              pointerEvents: 'none',
            }}
          />
        )}
        {/* locked objects are true silhouettes — the shape without the light, awaiting its moment */}
        <div
          style={{
            position: 'relative',
            opacity: earned ? 1 : 0.42,
            filter: earned ? undefined : 'grayscale(1) contrast(0) brightness(0.9)',
          }}
        >
          {art}
        </div>
        {/* the plinth — a thin lit base the object rests on */}
        <div
          style={{
            position: 'absolute',
            bottom: 14,
            width: 64,
            height: 3,
            borderRadius: 2,
            background: earned ? hue : 'var(--clss-hairline-on-paper-strong)',
            opacity: earned ? 0.55 : 1,
          }}
        />
      </div>
      <div style={{ textAlign: 'center', minHeight: 34 }}>
        <div
          style={{
            fontSize: fluidType.small,
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

export function TrophyRoom({
  mastered,
  xp,
  streakDays,
}: {
  mastered: Topic[];
  xp: number;
  streakDays: number;
}) {
  const earnedObjects: ReactNode[] = [];

  // mastered concepts — the core trophies, each its own ignited sigil
  for (const t of mastered) {
    const tone = toneForSubject(chapterById(t.chapterId)?.subjectId ?? 'math');
    earnedObjects.push(
      <Pedestal
        key={`t-${t.id}`}
        earned
        hue={tone.hue}
        art={<BossSigil id={t.id} size={92} mastered hue={tone.hue} />}
        title={t.name}
        sub="mastered"
      />,
    );
  }

  // streak medallions — every milestone the learner has reached
  for (const m of STREAK_TIERS.filter((m) => streakDays >= m)) {
    earnedObjects.push(
      <Pedestal
        key={`s-${m}`}
        earned
        hue={STREAK_HUE}
        art={<Medallion value={`${m}`} hue={STREAK_HUE} earned />}
        title={`${m}-day streak`}
        sub="kept coming back"
      />,
    );
  }

  // xp medals — the earned-currency milestones
  for (const m of XP_TIERS.filter((m) => xp >= m)) {
    earnedObjects.push(
      <Pedestal
        key={`x-${m}`}
        earned
        hue={XP_HUE}
        art={<Medallion value={m >= 1000 ? `${m / 1000}k` : `${m}`} hue={XP_HUE} earned />}
        title={`${m.toLocaleString('en-IN')} xp`}
        sub="earned in full"
      />,
    );
  }

  // empty pedestals — the very next thing each track earns, named exactly
  const ghosts: ReactNode[] = [];
  const nextStreak = STREAK_TIERS.find((m) => streakDays < m);
  if (nextStreak)
    ghosts.push(
      <Pedestal
        key="g-streak"
        earned={false}
        hue={STREAK_HUE}
        art={<Medallion value={`${nextStreak}`} hue={STREAK_HUE} earned={false} />}
        title={`${nextStreak}-day streak`}
        sub={`${nextStreak - streakDays} ${nextStreak - streakDays === 1 ? 'day' : 'days'} to go`}
      />,
    );
  const nextXp = XP_TIERS.find((m) => xp < m);
  if (nextXp)
    ghosts.push(
      <Pedestal
        key="g-xp"
        earned={false}
        hue={XP_HUE}
        art={
          <Medallion
            value={nextXp >= 1000 ? `${nextXp / 1000}k` : `${nextXp}`}
            hue={XP_HUE}
            earned={false}
          />
        }
        title={`${nextXp.toLocaleString('en-IN')} xp`}
        sub={`${(nextXp - xp).toLocaleString('en-IN')} xp to go`}
      />,
    );
  ghosts.push(
    <Pedestal
      key="g-concept"
      earned={false}
      hue={XP_HUE}
      art={<BossSigil id="next-concept" size={92} />}
      title="a concept you master next"
      sub="finish any course"
    />,
  );

  const objects = [...earnedObjects, ...ghosts];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: 14,
        }}
      >
        {objects}
      </div>
      {/* the room's floor — a single quiet line the pedestals stand on */}
      <div style={{ height: 1, background: 'var(--clss-card-border)', marginTop: 8 }} />
      <div style={{ fontSize: '0.8rem', color: 'var(--clss-ink-faint)', marginTop: 8 }}>
        {earnedObjects.length === 0
          ? 'the room is waiting — your first trophy takes one finished course.'
          : `${earnedObjects.length} on display · the dim pedestals name what comes next`}
      </div>
    </div>
  );
}
