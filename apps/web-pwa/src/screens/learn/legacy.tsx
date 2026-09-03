'use client';

/**
 * Two pieces the older screens still lean on, kept exactly as they were when Learn was rebuilt on
 * the kit: the fixed back affordance (the chat page, practice, a subject, progress and You), and
 * the layered subject scene a subject screen's poster band draws. Nothing on the learn screen
 * itself uses either any more; they are re-exported from screens/Learn so no importer moved.
 */

import { motion } from 'framer-motion';
import type { CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { canonicalSubjectId } from '../../curriculum/subjects';
import { BackIcon } from '../../ui/icons';

const INK = 'var(--wobo-ink-900)';
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
        background: 'var(--wobo-paper)',
        border: '0.5px solid var(--wobo-hairline-on-paper-strong)',
        borderRadius: 3,
        color: 'var(--wobo-ink-700)',
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
            stroke="var(--wobo-ultramarine)"
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
            fill="var(--wobo-ultramarine)"
            opacity={0.07}
            transform="rotate(12 334 94)"
          />
          {/* a dashed construction arc */}
          <path
            d="M18 178 A 132 132 0 0 1 150 46"
            fill="none"
            stroke="var(--wobo-ultramarine)"
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
            stroke="var(--wobo-ultramarine)"
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
