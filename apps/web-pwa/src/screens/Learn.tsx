'use client';

/**
 * Learn — the subjects door (DESIGN.md §8), second cut. Every subject card is a mini-poster:
 * the bold subject glyph LARGE on a hue-washed stage band with a layered scene breathing
 * behind it — chunky shapes, ink outlines, one golden accent. Prompt type large, support
 * quiet, nothing bare, nothing floating. End-to-end layout, cascade entrance.
 */

import { useRegisterTarget, useWoboBus } from '@classess/wobo';
import { motion } from 'framer-motion';
import { type CSSProperties, type ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { chaptersBySubject, type DisplaySubject, displaySubjects } from '../data/catalog';
import { canonicalSubjectId } from '../data/frame';
import { useRouter } from '../shell/router';
import { SubjectGlyph } from '../ui/art';
import { Scene } from '../ui/cast';
import { toneForSubject } from '../ui/hues';
import { BackIcon } from '../ui/icons';
import { AmbientWash, cascade, rise, TiltCard } from '../ui/kit';

// The subjects door's atmospheric layer — a quiet brand dawn (§1 ambient depth): ultramarine
// soft at the crown, a faint warm bloom below it. Token-driven, so dark theme lifts it a touch.
const LEARN_WASH =
  'radial-gradient(64% 40% at 50% -6%, var(--clss-ultramarine-soft) 0%, transparent 68%),' +
  ' radial-gradient(48% 26% at 50% 30%, rgba(255,201,60,0.045) 0%, transparent 72%)';

const INK = 'var(--clss-ink-900)';
const GOLD = '#FFC93C';

/** A whisper-quiet fixed affordance, top left — the register of home's "◦ you". */
export function Whisper({
  children,
  onClick,
  style,
}: {
  children: ReactNode;
  onClick: () => void;
  style?: CSSProperties;
}) {
  // String(array) inserts commas ("◦ ,learn") — join keeps the accessible name honest.
  const label = Array.isArray(children) ? children.join('') : String(children);
  const button = (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={`Back — ${label}`}
      title={label}
      whileHover={{ x: -3 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 380, damping: 24 }}
      style={{
        position: 'fixed',
        top: 74,
        left: 24,
        zIndex: 10,
        display: 'grid',
        placeItems: 'center',
        // owner law: the arrow alone — the destination lives in aria-label/title, never on screen
        padding: 9,
        background: 'var(--clss-paper)',
        border: '0.5px solid var(--clss-hairline-on-paper-strong)',
        borderRadius: 3,
        color: 'var(--clss-ink-700)',
        cursor: 'pointer',
        ...style,
      }}
    >
      <BackIcon size={17} />
    </motion.button>
  );
  // Portal to <body>: every screen renders inside Screen()'s page-transition motion.div, which
  // keeps a transform/filter even at rest — that turns position:fixed into position:absolute
  // relative to the wrapper, so the back pill scrolled away with the page. Body escapes it, and
  // the pill is now truly viewport-fixed on every scrolling screen (the owner's complaint).
  return typeof document === 'undefined' ? button : createPortal(button, document.body);
}

/** One drifting accent per scene — the stage reads alive, never static. */
function drift(duration: number, dy = 6) {
  return {
    animate: { y: [0, -dy, 0] },
    transition: { duration, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' as const },
  };
}

/**
 * The layered scene behind a subject's stage — graph paper and constructions for math,
 * orbits and molecules for science, journeys and latitudes for social science. Drawn in
 * the bold glyph register: chunky shapes, ink outlines, one golden accent. `wide` widens
 * the viewBox for poster bands so the scene stays fine-grained instead of blowing up.
 */
export function SubjectSceneBackdrop({
  subjectId,
  wide = false,
}: {
  subjectId: string;
  wide?: boolean;
}) {
  const w = wide ? 760 : 400;
  // A board's own subject id resolves to its canonical family's scene (physical_science → the
  // sciences' orbit-and-molecule, history_civics → the map).
  const sid = canonicalSubjectId(subjectId);
  return (
    <svg
      viewBox={`0 0 ${w} 210`}
      preserveAspectRatio="xMidYMid slice"
      role="presentation"
      aria-hidden
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    >
      {sid === 'math' && (
        <g>
          {/* graph paper, whispered — drawn full-bleed; the card view clips the rest */}
          <path
            d={`M0 52 H${w} M0 104 H${w} M0 156 H${w} M66 0 V210 M133 0 V210 M200 0 V210 M266 0 V210 M333 0 V210 M400 0 V210 M466 0 V210 M533 0 V210 M600 0 V210 M666 0 V210 M733 0 V210`}
            stroke="var(--clss-ultramarine)"
            strokeOpacity={0.07}
            strokeWidth={1}
          />
          {/* a ghost square, tilted off the grid */}
          <rect
            x={276}
            y={36}
            width={116}
            height={116}
            rx={10}
            fill="var(--clss-ultramarine)"
            opacity={0.07}
            transform="rotate(12 334 94)"
          />
          {/* a dashed construction arc */}
          <path
            d="M18 178 A 132 132 0 0 1 150 46"
            fill="none"
            stroke="var(--clss-ultramarine)"
            strokeOpacity={0.3}
            strokeWidth={1.6}
            strokeDasharray="2 7"
            strokeLinecap="round"
          />
          {/* the chunky triangle, ink-outlined */}
          <motion.g {...drift(7)}>
            <polygon
              points="52,66 78,24 104,66"
              fill="#FFFFFF"
              stroke={INK}
              strokeWidth={2.6}
              strokeLinejoin="round"
              transform="rotate(-7 78 48)"
            />
          </motion.g>
          {/* the golden point */}
          <motion.g {...drift(5.4, 5)}>
            <circle cx={344} cy={42} r={7} fill={GOLD} stroke={INK} strokeWidth={2} />
          </motion.g>
          <path
            d="M56 158 v20 M46 168 h20"
            stroke="var(--clss-ultramarine)"
            strokeOpacity={0.5}
            strokeWidth={2.4}
            strokeLinecap="round"
          />
        </g>
      )}
      {/* ponytail: the sciences share one scene — orbit (physics), molecule (chemistry), bubbles (biology) */}
      {['science', 'physics', 'chemistry', 'biology'].includes(sid) && (
        <g>
          {/* an orbit, tilted */}
          <ellipse
            cx={318}
            cy={66}
            rx={94}
            ry={34}
            fill="none"
            stroke="#0FA3B1"
            strokeOpacity={0.22}
            strokeWidth={1.4}
            transform="rotate(-18 318 66)"
          />
          {/* rising bubbles */}
          <circle cx={352} cy={152} r={10} fill="#0FA3B1" opacity={0.14} />
          <motion.circle {...drift(6)} cx={330} cy={122} r={5} fill="#0FA3B1" opacity={0.3} />
          <circle cx={368} cy={104} r={3.4} fill="#0FA3B1" opacity={0.4} />
          {/* the molecule — hexagon, nodes, one golden atom */}
          <motion.g {...drift(7.2, 5)}>
            <polygon
              points="64,36 88,22 112,36 112,64 88,78 64,64"
              fill="#FFFFFF"
              stroke={INK}
              strokeWidth={2.4}
              strokeLinejoin="round"
            />
            <circle cx={64} cy={36} r={4} fill="#0FA3B1" />
            <circle cx={112} cy={64} r={4} fill={INK} />
            <circle cx={88} cy={78} r={4.6} fill={GOLD} stroke={INK} strokeWidth={1.6} />
          </motion.g>
          {/* a standing wave along the floor — full-bleed; the card view clips the rest */}
          <path
            d={`M0 180 q 25 -14 50 0 ${'t 50 0 '.repeat(15)}`}
            fill="none"
            stroke="#0FA3B1"
            strokeOpacity={0.18}
            strokeWidth={1.6}
          />
        </g>
      )}
      {sid === 'cs' && (
        <g>
          {/* a ghost column of code tokens, indented like real code */}
          <path
            d="M280 36 h72 M304 60 h110 M304 84 h64 M328 108 h96 M304 132 h84 M280 156 h56"
            stroke="#D6196F"
            strokeOpacity={0.14}
            strokeWidth={7}
            strokeLinecap="round"
          />
          {/* a dashed execution line along the floor */}
          <path
            d={`M0 184 H${w}`}
            stroke="#D6196F"
            strokeOpacity={0.2}
            strokeWidth={1.6}
            strokeDasharray="2 7"
            strokeLinecap="round"
          />
          {/* the chunky prompt card */}
          <motion.g {...drift(7)}>
            <rect
              x={40}
              y={30}
              width={92}
              height={56}
              rx={8}
              fill="#FFFFFF"
              stroke={INK}
              strokeWidth={2.6}
            />
            <path
              d="M54 48 L64 56 L54 64"
              fill="none"
              stroke={INK}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect x={72} y={52} width={26} height={7} rx={2} fill="#D6196F" opacity={0.85} />
          </motion.g>
          {/* the golden cursor block */}
          <motion.g {...drift(5.4, 5)}>
            <rect
              x={352}
              y={42}
              width={10}
              height={20}
              rx={2}
              fill={GOLD}
              stroke={INK}
              strokeWidth={2}
            />
          </motion.g>
        </g>
      )}
      {sid === 'social' && (
        <g>
          {/* latitudes, whispered — drawn to the live width so they never stop mid-band */}
          <path
            d={`M-20 60 Q ${w / 2} 12 ${w + 20} 60 M-20 112 Q ${w / 2} 62 ${w + 20} 112 M-20 164 Q ${w / 2} 114 ${w + 20} 164`}
            fill="none"
            stroke="#B26A00"
            strokeOpacity={0.13}
            strokeWidth={1.4}
          />
          {/* a dashed journey across the map */}
          <path
            d="M40 168 C 120 122 180 190 250 122 S 360 62 384 46"
            fill="none"
            stroke="#B26A00"
            strokeOpacity={0.45}
            strokeWidth={1.8}
            strokeDasharray="1 8"
            strokeLinecap="round"
          />
          <circle cx={40} cy={168} r={4.4} fill="#B26A00" opacity={0.7} />
          {/* the destination, golden with an ink ring */}
          <motion.g {...drift(5.8, 5)}>
            <circle cx={384} cy={46} r={7} fill={GOLD} stroke={INK} strokeWidth={2} />
          </motion.g>
          {/* a chunky pennant claiming the spot */}
          <motion.g {...drift(7.4, 4)}>
            <line
              x1={70}
              y1={26}
              x2={70}
              y2={64}
              stroke={INK}
              strokeWidth={2.6}
              strokeLinecap="round"
            />
            <path
              d="M70 28 L98 34 L70 44 Z"
              fill="#CC1E7A"
              stroke={INK}
              strokeWidth={2}
              strokeLinejoin="round"
            />
          </motion.g>
        </g>
      )}
    </svg>
  );
}

/** The hue-washed stage band a subject poses on — scene behind, glyph in front. */
function SubjectStage({
  subject,
  lit,
  height = 172,
  glyph = 96,
}: {
  subject: DisplaySubject;
  lit: boolean;
  height?: number;
  glyph?: number;
}) {
  const tone = toneForSubject(subject.id);
  return (
    <div
      style={{
        position: 'relative',
        height,
        background: tone.wash,
        overflow: 'hidden',
      }}
    >
      <SubjectSceneBackdrop subjectId={subject.id} />
      <motion.div
        animate={lit ? { scale: 1.08, rotate: -3, y: -3 } : { scale: 1, rotate: 0, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}
      >
        <SubjectGlyph subjectId={subject.id} size={glyph} accent={lit} />
      </motion.div>
    </div>
  );
}

function SubjectCard({ subject, onOpen }: { subject: DisplaySubject; onOpen: () => void }) {
  const [lit, setLit] = useState(false);
  const tone = toneForSubject(subject.id);
  // a clubbed door counts every chapter behind it
  const chapterCount = subject.subjectIds.reduce(
    (n, id) => n + (chaptersBySubject[id] ?? []).length,
    0,
  );
  // Each card is its own target — she can circle "Physics" specifically, not the whole grid.
  const cardRef = useRegisterTarget<HTMLDivElement>(`learn-subject-${subject.id}`, {
    kind: 'subject',
    label: `the ${subject.name} subject card`,
    getSceneState: () => ({ subject: subject.name, chapters: chapterCount }),
  });
  return (
    <div ref={cardRef}>
      <TiltCard
        onClick={onOpen}
        ariaLabel={`${subject.name} — open the subject`}
        onLitChange={setLit}
        spotlight={tone.wash}
        style={{ padding: 0 }}
      >
        <SubjectStage subject={subject} lit={lit} />
        <div
          style={{ padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', gap: 7 }}
        >
          <span
            style={{
              fontSize: '1.35rem',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: 'var(--clss-ink-900)',
            }}
          >
            {subject.name}
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--clss-ink-500)', lineHeight: 1.5 }}>
            {subject.line}
          </span>
          <span
            style={{
              marginTop: 9,
              alignSelf: 'flex-start',
              padding: '5px 11px',
              borderRadius: 3,
              background: tone.wash,
              color: tone.hue,
              fontSize: '0.75rem',
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {chapterCount} chapters
          </span>
        </div>
      </TiltCard>
    </div>
  );
}

/** The tactile subject grid — shared by learn and practice, differing only in intent. */
export function SubjectGrid({ intent }: { intent: 'learn' | 'practice' }) {
  const router = useRouter();
  // the board's doors over the canonical six — CBSE ≤10 clubs the sciences into one "Science"
  const doors = displaySubjects();
  return (
    <motion.div
      variants={cascade}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: 18,
      }}
    >
      {doors.map((s) => (
        <motion.div key={s.id} variants={rise}>
          <SubjectCard
            subject={s}
            onOpen={() => router.navigate({ name: 'subject', subjectId: s.id, intent })}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}

/** The quiet hero line a grid sits under — prompt large, support small. */
export function GridHero({ prompt, support }: { prompt: string; support?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
      <span
        style={{
          fontSize: '1.5rem',
          fontWeight: 600,
          letterSpacing: '-0.025em',
          color: 'var(--clss-ink-900)',
        }}
      >
        {prompt}
      </span>
      {support && (
        <span style={{ fontSize: '0.85rem', color: 'var(--clss-ink-300)' }}>{support}</span>
      )}
    </div>
  );
}

export function Learn() {
  const router = useRouter();
  const { publishPage } = useWoboBus();
  const [coursesLit, setCoursesLit] = useState(false);
  const gridRef = useRegisterTarget<HTMLDivElement>('learn-subjects', {
    kind: 'grid',
    label: 'the subject grid — one tap opens a subject',
    // She reads which subjects sit on the grid and how much lives behind each, so she points at a
    // real one instead of the whole box. Each card also registers its own fine-grained target.
    getSceneState: () => ({
      subjects: displaySubjects().map((s) => ({
        name: s.name,
        chapters: s.subjectIds.reduce((n, id) => n + (chaptersBySubject[id] ?? []).length, 0),
        targetId: `learn-subject-${s.id}`,
      })),
    }),
  });
  const coursesRef = useRegisterTarget<HTMLButtonElement>('learn-courses', {
    kind: 'door',
    label: 'the custom courses shelf — asking Wobo composes one',
  });

  useEffect(() => {
    publishPage({ route: 'learn', state: { title: 'learn', intent: 'learn' } });
  }, [publishPage]);

  return (
    <motion.div
      variants={cascade}
      initial="hidden"
      animate="show"
      style={{
        minHeight: '100dvh',
        padding: '108px 6vw 96px',
        position: 'relative',
        isolation: 'isolate',
      }}
    >
      <AmbientWash gradient={LEARN_WASH} />
      <Whisper onClick={() => router.navigate({ name: 'home' })}>Home</Whisper>

      <motion.div variants={rise}>
        <h1
          style={{
            margin: 0,
            fontSize: '1.9rem',
            fontWeight: 650,
            letterSpacing: '-0.035em',
            color: 'var(--clss-ink-900)',
          }}
        >
          Learn
        </h1>
        <div style={{ marginTop: 6, fontSize: '0.95rem', color: 'var(--clss-ink-500)' }}>
          Pick a subject — a topic is a course, composed for you
        </div>
      </motion.div>

      <motion.div variants={rise} style={{ marginTop: 54, marginBottom: 20 }}>
        <GridHero prompt="Where to today?" support="Your subjects, one tap each" />
      </motion.div>
      <div ref={gridRef}>
        <SubjectGrid intent="learn" />
      </div>

      <motion.div variants={rise} style={{ marginTop: 84, marginBottom: 20 }}>
        <GridHero prompt="Courses of your own" support="Composed the moment you ask" />
      </motion.div>
      <motion.button
        ref={coursesRef}
        type="button"
        onClick={() => router.navigate({ name: 'home' })}
        variants={rise}
        onHoverStart={() => setCoursesLit(true)}
        onHoverEnd={() => setCoursesLit(false)}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.99 }}
        transition={{ type: 'spring', stiffness: 360, damping: 26 }}
        style={{
          width: '100%',
          background: 'var(--clss-card)',
          border: `1px solid ${coursesLit ? 'var(--clss-faint)' : 'var(--clss-card-border)'}`,
          borderRadius: 3,
          padding: 0,
          overflow: 'hidden',
          cursor: 'pointer',
          fontFamily: 'inherit',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'stretch',
        }}
      >
        {/* an empty shelf is a promise, not a void — Volt is already wondering about the sky */}
        <span
          style={{
            flexShrink: 0,
            width: 'clamp(150px, 26vw, 240px)',
            minHeight: 170,
            background: 'rgba(31,53,224,0.05)',
            display: 'block',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Scene
            wash={0}
            style={{ background: 'transparent', position: 'absolute', inset: 0, height: '100%' }}
            items={[
              { id: 'volt', x: 0.36, size: 82, mood: 'curious' },
              { id: 'planet', x: 0.72, size: 60, lift: 30 },
            ]}
          />
        </span>
        <span
          style={{
            flex: 1,
            minWidth: 0,
            padding: '26px 28px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 7,
          }}
        >
          <span
            style={{
              fontSize: '1.3rem',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: 'var(--clss-ink-900)',
            }}
          >
            Ask Wobo for a course on anything
          </span>
          <span style={{ fontSize: '0.88rem', color: 'var(--clss-ink-500)', lineHeight: 1.55 }}>
            Black holes, cricket physics, the history of zero — your custom courses will live here
          </span>
        </span>
      </motion.button>

      <motion.div variants={rise}>
        <button
          type="button"
          onClick={() => router.navigate({ name: 'you' })}
          style={{
            marginTop: 28,
            border: 'none',
            background: 'transparent',
            color: 'var(--clss-ink-300)',
            fontSize: '0.82rem',
            cursor: 'pointer',
            fontFamily: 'inherit',
            padding: 4,
          }}
        >
          Past courses ›
        </button>
      </motion.div>
    </motion.div>
  );
}
