'use client';

/**
 * Concept B — "The thread".
 *
 * Compositional idea: the home is not a page, it is a place. The day is one continuous drawn
 * thread flowing down a tall white canvas; stops sit on the thread (done, current, boss, one
 * mystery off the road). The lesson board is itself a stop the thread passes through. Vidya
 * walks beside you — she is sticky to the viewport, keeping pace as you descend the day.
 *
 * Apple lens: one machined bezier, nodes on a strict grid, frosted status bar, physics-true
 * springs, meaning animated — when you clear the board, energy visibly travels down the
 * thread and unlocks the boss.
 */

import { VidyaBody, type VidyaMood } from '@classess/vidya';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useMemo, useState } from 'react';
import { ClassessLogo } from '../../ui/Logo';

const INK = '#0D0D10';
const INK_60 = 'rgba(13,13,16,0.58)';
const INK_40 = 'rgba(13,13,16,0.36)';
const HAIR = 'rgba(13,13,16,0.10)';
const HAIR_SOFT = 'rgba(13,13,16,0.055)';
const TONAL = 'rgba(13,13,16,0.026)';
const ULTRA = '#1F35E0';
const MOLTEN = '#FF5A1F';
const MAGENTA = '#CC1E7A';
const ACID = '#66B300';
const TEAL = '#0FA3B1';
const SPRING = { type: 'spring', stiffness: 260, damping: 26 } as const;

const CAPS: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  color: INK_40,
};

/** The one thread of the day — a single machined bezier. */
const THREAD =
  'M 560 210 C 560 300, 330 310, 330 420 C 330 540, 800 520, 800 640 ' +
  'C 800 760, 560 770, 560 880 L 560 1450 C 560 1560, 420 1580, 420 1700 ' +
  'C 420 1810, 560 1830, 560 1930';

/** The segment energy travels after the board is cleared: board → boss. */
const ENERGY = 'M 560 880 L 560 1450 C 560 1560, 420 1580, 420 1700';

type PadStatus = 'idle' | 'wrong' | 'solved';

function usePractice(answer: string) {
  const [entry, setEntry] = useState('');
  const [status, setStatus] = useState<PadStatus>('idle');
  const press = useCallback(
    (d: string) => {
      if (status === 'solved') return;
      setStatus('idle');
      setEntry((e) => (e.length >= 2 ? e : e + d));
    },
    [status],
  );
  const erase = useCallback(() => {
    if (status === 'solved') return;
    setStatus('idle');
    setEntry((e) => e.slice(0, -1));
  }, [status]);
  const check = useCallback(() => {
    if (status === 'solved' || entry.length === 0) return;
    if (entry === answer) {
      setStatus('solved');
    } else {
      setStatus('wrong');
      setTimeout(() => {
        setEntry('');
        setStatus('idle');
      }, 750);
    }
  }, [answer, entry, status]);
  return { entry, status, press, erase, check };
}

/* ---------------------------------------------------------------- medallions */

function SunMedallion() {
  return (
    <svg
      width="46"
      height="46"
      viewBox="0 0 46 46"
      role="presentation"
      aria-hidden
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id="cb-sun" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#FF9040" />
          <stop offset="100%" stopColor={MOLTEN} />
        </linearGradient>
      </defs>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <rect
          key={a}
          x="21.5"
          y="2"
          width="3"
          height="7"
          rx="1.5"
          fill={MOLTEN}
          opacity="0.85"
          transform={`rotate(${a} 23 23)`}
        />
      ))}
      <circle cx="23" cy="23" r="10.5" fill="url(#cb-sun)" />
    </svg>
  );
}

function ShieldMedallion({ lit }: { lit: boolean }) {
  return (
    <svg
      width="46"
      height="46"
      viewBox="0 0 46 46"
      role="presentation"
      aria-hidden
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id="cb-shield" x1="0" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#E84D9E" />
          <stop offset="100%" stopColor={MAGENTA} />
        </linearGradient>
      </defs>
      <path
        d="M23 5 L38 11 V 23 C 38 32.5 31.5 38.5 23 42 C 14.5 38.5 8 32.5 8 23 V 11 Z"
        fill={lit ? 'url(#cb-shield)' : 'rgba(13,13,16,0.08)'}
      />
      <path
        d="M15.5 22.5 L21 28 L30.5 17.5"
        fill="none"
        stroke={lit ? '#FFFFFF' : INK_40}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarMedallion() {
  return (
    <svg
      width="52"
      height="52"
      viewBox="-26 -26 52 52"
      role="presentation"
      aria-hidden
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id="cb-star" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#3EC7D4" />
          <stop offset="100%" stopColor={TEAL} />
        </linearGradient>
      </defs>
      <circle
        cx="0"
        cy="0"
        r="21"
        fill="none"
        stroke={TEAL}
        strokeOpacity="0.5"
        strokeWidth="1.4"
        strokeDasharray="3 6"
        strokeLinecap="round"
      />
      <path
        d="M 0 -13 C 2.2 -4.5, 4.5 -2.2, 13 0 C 4.5 2.2, 2.2 4.5, 0 13 C -2.2 4.5, -4.5 2.2, -13 0 C -4.5 -2.2, -2.2 -4.5, 0 -13 Z"
        fill="url(#cb-star)"
      />
    </svg>
  );
}

/* --------------------------------------------------------------------- pieces */

function StopCard({
  x,
  y,
  width,
  delay,
  medallion,
  title,
  meta,
  metaColor = INK_40,
}: {
  x: number;
  y: number;
  width: number;
  delay: number;
  medallion: React.ReactNode;
  title: string;
  meta: string;
  metaColor?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...SPRING, delay }}
      whileHover={{ y: -3, backgroundColor: TONAL }}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        border: `1px solid ${HAIR}`,
        borderRadius: 3,
        background: '#FFFFFF',
        padding: '14px 18px',
        cursor: 'pointer',
      }}
    >
      {medallion}
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, color: INK }}>{title}</div>
        <div style={{ fontSize: 12, color: metaColor, marginTop: 3 }}>{meta}</div>
      </div>
    </motion.div>
  );
}

/** A number line where x itself walks to its value. */
function NumberLine({ entry, solved }: { entry: string; solved: boolean }) {
  const n = Math.max(0, Math.min(8, entry === '' ? 0 : Number.parseInt(entry, 10) || 0));
  const cx = 30 + n * 57;
  return (
    <svg
      viewBox="0 0 520 104"
      width="100%"
      role="img"
      aria-label={`a number line with x standing at ${n}`}
      style={{ display: 'block', overflow: 'visible', maxWidth: 520 }}
    >
      <defs>
        <linearGradient id="cb-cube" x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#5468F5" />
          <stop offset="55%" stopColor={ULTRA} />
          <stop offset="100%" stopColor="#141F86" />
        </linearGradient>
      </defs>
      <line x1="18" y1="78" x2="502" y2="78" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <g key={i}>
          <line
            x1={30 + i * 57}
            y1="72"
            x2={30 + i * 57}
            y2="84"
            stroke={INK}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <text
            x={30 + i * 57}
            y="100"
            textAnchor="middle"
            fontSize="12"
            fontWeight="600"
            fill={INK_40}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {i}
          </text>
        </g>
      ))}
      {/* the x cube walks the line as you type */}
      <motion.g
        animate={{ x: cx - 30 }}
        transition={{ type: 'spring', stiffness: 170, damping: 16 }}
      >
        <motion.g
          animate={
            solved ? { y: [0, -16, 0], scaleY: [1, 1.06, 0.82, 1.04, 1] } : { y: [0, -4, 0] }
          }
          transition={
            solved
              ? { duration: 0.7, ease: 'easeOut' }
              : { duration: 3.4, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }
          }
          style={{ transformOrigin: '30px 66px' }}
        >
          <rect x="14" y="34" width="32" height="32" rx="4" fill="url(#cb-cube)" />
          <text
            x="30"
            y="58"
            textAnchor="middle"
            fontFamily="Caveat, cursive"
            fontWeight="700"
            fontSize="22"
            fill="#FFFFFF"
          >
            x
          </text>
          {solved && (
            <motion.path
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 1.3, 0.5] }}
              transition={{ duration: 0.9, delay: 0.25 }}
              d="M 30 14 C 31.4 19, 33 20.6, 38 22 C 33 23.4, 31.4 25, 30 30 C 28.6 25, 27 23.4, 22 22 C 27 20.6, 28.6 19, 30 14 Z"
              fill={ULTRA}
              style={{ transformOrigin: '30px 22px' }}
            />
          )}
        </motion.g>
      </motion.g>
    </svg>
  );
}

function PadKey({
  label,
  icon,
  onPress,
  primary = false,
  disabled = false,
  ariaLabel,
}: {
  label?: string;
  icon?: React.ReactNode;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onPress}
      disabled={disabled}
      aria-label={ariaLabel ?? label}
      whileHover={disabled ? undefined : { y: -2, backgroundColor: primary ? '#26262E' : TONAL }}
      whileTap={disabled ? undefined : { scale: 0.93 }}
      transition={{ type: 'spring', stiffness: 500, damping: 26 }}
      style={{
        width: 58,
        height: 58,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: primary ? `1px solid ${INK}` : `1px solid ${HAIR}`,
        borderRadius: 3,
        background: primary ? INK : '#FFFFFF',
        color: primary ? '#FFFFFF' : INK,
        fontSize: 20,
        fontWeight: 500,
        fontVariantNumeric: 'tabular-nums',
        fontFamily: 'inherit',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.32 : 1,
      }}
    >
      {icon ?? label}
    </motion.button>
  );
}

/* ------------------------------------------------------------------- the board */

function Board({ practice }: { practice: ReturnType<typeof usePractice> }) {
  const { entry, status, press, erase, check } = practice;
  const solved = status === 'solved';
  const digits = useMemo(() => ['1', '2', '3', '4', '5', '6', '7', '8', '9'], []);
  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: 1.15 }}
      style={{
        position: 'absolute',
        left: 180,
        top: 912,
        width: 760,
        border: `1px solid ${HAIR}`,
        borderRadius: 3,
        background: '#FFFFFF',
        padding: '30px 38px 36px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={CAPS}>stop two · practice · linear equations</span>
        <span style={{ ...CAPS, fontVariantNumeric: 'tabular-nums' }}>3 of 8</span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 194px',
          gap: 44,
          marginTop: 26,
          alignItems: 'start',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 54,
              fontWeight: 300,
              letterSpacing: '-0.025em',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            3<span style={{ fontWeight: 400, fontStyle: 'italic' }}>x</span>
            {' + 7 = 22'}
          </div>
          <p style={{ fontSize: 13.5, color: INK_60, margin: '8px 0 0', lineHeight: 1.55 }}>
            where must x stand for both sides to meet? walk it along the line.
          </p>

          <div style={{ marginTop: 26 }}>
            <NumberLine entry={entry} solved={solved} />
          </div>

          <motion.div
            animate={status === 'wrong' ? { x: [0, -8, 7, -4, 0] } : { x: 0 }}
            transition={{ duration: 0.45 }}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 14,
              marginTop: 26,
            }}
          >
            <span style={{ fontSize: 26, fontWeight: 300, color: INK_60 }}>x =</span>
            <span
              style={{
                minWidth: 64,
                borderBottom: `2px solid ${solved ? ULTRA : INK}`,
                fontSize: 30,
                fontWeight: 500,
                fontVariantNumeric: 'tabular-nums',
                color: solved ? ULTRA : INK,
                paddingBottom: 2,
              }}
            >
              {entry || ' '}
            </span>
            <AnimatePresence mode="wait">
              {solved ? (
                <motion.span
                  key="won"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    fontFamily: 'Caveat, cursive',
                    fontSize: 22,
                    color: ULTRA,
                    fontWeight: 600,
                  }}
                >
                  the thread runs on — boss unlocked
                </motion.span>
              ) : status === 'wrong' ? (
                <motion.span
                  key="hint"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{ fontFamily: 'Caveat, cursive', fontSize: 21, color: INK_60 }}
                >
                  move the 7 across first
                </motion.span>
              ) : null}
            </AnimatePresence>
          </motion.div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 58px)', gap: 10 }}>
          {digits.map((d) => (
            <PadKey key={d} label={d} onPress={() => press(d)} disabled={solved} />
          ))}
          <PadKey
            ariaLabel="erase"
            onPress={erase}
            disabled={solved}
            icon={
              <svg
                width="19"
                height="19"
                viewBox="0 0 20 20"
                fill="none"
                role="presentation"
                aria-hidden
              >
                <path
                  d="M7.2 4.5h8.3A1.5 1.5 0 0 1 17 6v8a1.5 1.5 0 0 1-1.5 1.5H7.2L3 10l4.2-5.5Z"
                  stroke={INK}
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
                <path
                  d="M9.8 8l3.6 4M13.4 8l-3.6 4"
                  stroke={INK}
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            }
          />
          <PadKey label="0" onPress={() => press('0')} disabled={solved} />
          <PadKey
            ariaLabel="check the answer"
            primary
            onPress={check}
            disabled={entry.length === 0 || solved}
            icon={
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                role="presentation"
                aria-hidden
              >
                <path
                  d="M4 10.6l4.2 4L16 6.2"
                  stroke="#FFFFFF"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
          />
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------- concept B */

const DRIFT = [
  { id: 'p1', x: 140, y: 300, glyph: '+', dur: 7 },
  { id: 'p2', x: 980, y: 250, glyph: '+', dur: 8.5 },
  { id: 'p3', x: 90, y: 760, glyph: '·', dur: 6 },
  { id: 'p4', x: 1030, y: 900, glyph: '+', dur: 9 },
  { id: 'p5', x: 150, y: 1250, glyph: '·', dur: 7.5 },
  { id: 'p6', x: 990, y: 1500, glyph: '+', dur: 8 },
  { id: 'p7', x: 220, y: 1870, glyph: '·', dur: 6.5 },
  { id: 'p8', x: 890, y: 130, glyph: '·', dur: 7.2 },
];

export function ConceptB() {
  const practice = usePractice('5');
  const solved = practice.status === 'solved';
  const mood: VidyaMood = solved
    ? 'celebrate'
    : practice.status === 'wrong'
      ? 'hint'
      : practice.entry.length > 0
        ? 'thinking'
        : 'idle';

  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh', color: INK }}>
      {/* frosted status bar — the only fixed chrome */}
      <motion.header
        initial={{ y: -18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...SPRING, delay: 0.1 }}
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 28px',
          height: 58,
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderBottom: `1px solid ${HAIR_SOFT}`,
        }}
      >
        <ClassessLogo height={13} />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            border: `1px solid ${HAIR}`,
            borderRadius: 3,
            padding: '7px 14px',
            fontSize: 13,
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
            position: 'relative',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="12" height="12" viewBox="-7 -7 14 14" role="presentation" aria-hidden>
              <path
                d="M 0 -7 C 1.2 -2.4, 2.4 -1.2, 7 0 C 2.4 1.2, 1.2 2.4, 0 7 C -1.2 2.4, -2.4 1.2, -7 0 C -2.4 -1.2, -1.2 -2.4, 0 -7 Z"
                fill={MOLTEN}
              />
            </svg>
            12 days
          </span>
          <span style={{ width: 1, height: 14, background: HAIR }} />
          <span>{solved ? '2,380' : '2,340'} xp</span>
          <AnimatePresence>
            {solved && (
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 26 }}
                exit={{ opacity: 0 }}
                transition={{ ...SPRING, delay: 0.5 }}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  color: ULTRA,
                }}
              >
                +40
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </motion.header>

      <div style={{ display: 'flex', width: 1270, margin: '0 auto' }}>
        {/* Vidya walks the thread with you — she keeps pace with the scroll */}
        <div style={{ width: 150, flexShrink: 0 }}>
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...SPRING, delay: 0.25 }}
            style={{
              position: 'sticky',
              top: '32vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              paddingTop: 24,
            }}
          >
            <VidyaBody size={112} mood={mood} gaze="pointer" />
            <div
              style={{
                fontFamily: 'Caveat, cursive',
                fontSize: 21,
                fontWeight: 600,
                color: INK_60,
                textAlign: 'center',
                lineHeight: 1.15,
                maxWidth: 130,
              }}
            >
              {solved
                ? 'told you the thread was short'
                : practice.status === 'wrong'
                  ? 'close — try the 7 first'
                  : 'I will walk it with you'}
            </div>
          </motion.div>
        </div>

        {/* the canvas — one place, one thread */}
        <div style={{ position: 'relative', width: 1120, height: 2050 }}>
          {/* ambient drift field */}
          {DRIFT.map((d) => (
            <motion.span
              key={d.id}
              aria-hidden
              animate={{ y: [0, -9, 0] }}
              transition={{
                duration: d.dur,
                repeat: Number.POSITIVE_INFINITY,
                ease: 'easeInOut',
              }}
              style={{
                position: 'absolute',
                left: d.x,
                top: d.y,
                fontSize: d.glyph === '+' ? 15 : 22,
                fontWeight: 300,
                color: 'rgba(13,13,16,0.14)',
                userSelect: 'none',
              }}
            >
              {d.glyph}
            </motion.span>
          ))}

          {/* header */}
          <div style={{ position: 'absolute', left: 0, right: 0, top: 44, textAlign: 'center' }}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING, delay: 0.15 }}
              style={CAPS}
            >
              today · monday 6 july
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING, delay: 0.22 }}
              style={{ fontSize: 52, fontWeight: 300, letterSpacing: '-0.03em', marginTop: 10 }}
            >
              One thread. Three stops.
            </motion.h1>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              style={{
                fontFamily: 'Caveat, cursive',
                fontSize: 24,
                color: INK_60,
                marginTop: 6,
              }}
            >
              the day is a walk, not a list
            </motion.div>
          </div>

          {/* the thread */}
          <svg
            viewBox="0 0 1120 2050"
            width="1120"
            height="2050"
            style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
            role="presentation"
            aria-hidden
          >
            <motion.path
              d={THREAD}
              fill="none"
              stroke={INK}
              strokeWidth="2"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.9, delay: 0.35, ease: [0.45, 0, 0.2, 1] }}
            />
            {/* mystery spur */}
            <motion.path
              d="M 800 640 C 860 615, 900 595, 962 566"
              fill="none"
              stroke={TEAL}
              strokeOpacity="0.55"
              strokeWidth="1.6"
              strokeDasharray="2 7"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, delay: 1.5, ease: 'easeOut' }}
            />
            {/* energy travels the thread once the board is cleared */}
            {solved && (
              <g>
                <motion.path
                  d={ENERGY}
                  fill="none"
                  stroke={ULTRA}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="12 16"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, strokeDashoffset: [0, -112] }}
                  transition={{
                    opacity: { duration: 0.4 },
                    strokeDashoffset: {
                      duration: 1.3,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: 'linear',
                    },
                  }}
                />
              </g>
            )}

            {/* stop one — done */}
            <motion.g
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...SPRING, delay: 0.75 }}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            >
              <circle cx="330" cy="420" r="13" fill={ACID} />
              <path
                d="M 324 420 L 328.5 424.5 L 336.5 415.5"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </motion.g>

            {/* stop two — current, breathing */}
            <motion.circle
              cx="560"
              cy="880"
              r="10"
              fill={ULTRA}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...SPRING, delay: 1.05 }}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            />
            <motion.circle
              cx="560"
              cy="880"
              r="10"
              fill="none"
              stroke={ULTRA}
              strokeWidth="1.6"
              animate={{ scale: [1, 2.2], opacity: [0.55, 0] }}
              transition={{
                duration: 2.1,
                repeat: Number.POSITIVE_INFINITY,
                ease: 'easeOut',
                delay: 1.4,
              }}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            />

            {/* stop three — the boss gate */}
            <motion.g
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...SPRING, delay: 1.55 }}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            >
              {solved ? (
                <motion.g
                  initial={{ scale: 0.4 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.9 }}
                  style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                >
                  <circle cx="420" cy="1700" r="13" fill={MAGENTA} />
                  <path
                    d="M 414 1700 L 418.5 1704.5 L 426.5 1695.5"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </motion.g>
              ) : (
                <circle
                  cx="420"
                  cy="1700"
                  r="12"
                  fill="#FFFFFF"
                  stroke={INK_40}
                  strokeWidth="1.8"
                  strokeDasharray="3 4"
                />
              )}
            </motion.g>
          </svg>

          {/* trailhead marker */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...SPRING, delay: 0.45 }}
            style={{
              position: 'absolute',
              left: 560 - 5,
              top: 210 - 5,
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: INK,
            }}
          />

          <StopCard
            x={372}
            y={382}
            width={252}
            delay={0.85}
            medallion={<SunMedallion />}
            title="Warm-up"
            meta="fractions recap · done · 3 min"
            metaColor={ACID}
          />

          {/* the mystery — discovered, never assigned */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...SPRING, delay: 1.65 }}
            whileHover={{ rotate: 90, scale: 1.12 }}
            style={{ position: 'absolute', left: 962, top: 522, cursor: 'pointer' }}
          >
            <StarMedallion />
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.9, duration: 0.5 }}
            style={{
              position: 'absolute',
              left: 940,
              top: 582,
              fontFamily: 'Caveat, cursive',
              fontSize: 19,
              color: TEAL,
              width: 120,
              textAlign: 'center',
              lineHeight: 1.1,
            }}
          >
            something is hiding here
          </motion.div>

          <Board practice={practice} />

          <StopCard
            x={458}
            y={1662}
            width={286}
            delay={1.6}
            medallion={<ShieldMedallion lit={solved} />}
            title="Boss battle"
            meta={solved ? 'unlocked · ready when you are' : 'locked · clear the board first'}
            metaColor={solved ? MAGENTA : INK_40}
          />

          {/* the road past today, fading */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 1952,
              textAlign: 'center',
              ...CAPS,
            }}
          >
            tomorrow continues the thread
          </div>
        </div>
      </div>
    </div>
  );
}
