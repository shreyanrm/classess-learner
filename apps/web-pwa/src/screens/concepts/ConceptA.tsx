'use client';

/**
 * Concept A — "Stage & rail".
 *
 * Compositional idea: the screen is split into a persistent rail of life (left) and a stage
 * (right). Vidya is not a widget on the page — she owns a physical column of the product,
 * breathing, watching, reacting, keeping the streak and the flame. Content plays on the stage
 * and she never leaves. Scroll from the home act into the lesson act; the rail stays.
 *
 * Apple lens: strict 8pt grid, hairlines and tonal steps for depth (no shadows), one pigment
 * (ultramarine, spent only on mastery), typography carries the hierarchy, springs settle like
 * real objects.
 */

import { VidyaBody, type VidyaMood } from '@classess/vidya';
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ClassessLogo } from '../../ui/Logo';

const INK = '#0D0D10';
const INK_60 = 'rgba(13,13,16,0.58)';
const INK_40 = 'rgba(13,13,16,0.36)';
const HAIR = 'rgba(13,13,16,0.10)';
const HAIR_SOFT = 'rgba(13,13,16,0.055)';
const TONAL = 'rgba(13,13,16,0.026)';
const ULTRA = '#1F35E0';
const SPRING = { type: 'spring', stiffness: 260, damping: 26 } as const;
const SETTLE = { type: 'spring', stiffness: 120, damping: 13 } as const;

const CAPS: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  color: INK_40,
};

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

/* ------------------------------------------------------------------ scene art */

/** A balance scale — the soul of a linear equation, drawn chunky and characterful. */
function BalanceScene({ tilt, size = 250 }: { tilt: number; size?: number }) {
  const rad = (tilt * Math.PI) / 180;
  const cx = 125;
  const cy = 72;
  const L = 88;
  const lx = cx - L * Math.cos(rad);
  const ly = cy - L * Math.sin(rad);
  const rx = cx + L * Math.cos(rad);
  const ry = cy + L * Math.sin(rad);
  return (
    <svg
      viewBox="0 0 250 196"
      width={size}
      height={(size * 196) / 250}
      role="img"
      aria-label="a balance scale holding the equation"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <linearGradient id="ca-cube" x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#5468F5" />
          <stop offset="55%" stopColor={ULTRA} />
          <stop offset="100%" stopColor="#141F86" />
        </linearGradient>
        <linearGradient id="ca-weight" x1="0" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#3D3D49" />
          <stop offset="100%" stopColor={INK} />
        </linearGradient>
        <linearGradient id="ca-fulcrum" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#26262E" />
          <stop offset="100%" stopColor="#0D0D10" />
        </linearGradient>
      </defs>

      {/* ground */}
      <line
        x1="34"
        y1="178"
        x2="216"
        y2="178"
        stroke={HAIR}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="52"
        y1="186"
        x2="112"
        y2="186"
        stroke={HAIR_SOFT}
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* fulcrum */}
      <path d="M125 74 L101 176 L149 176 Z" fill="url(#ca-fulcrum)" />

      {/* beam */}
      <motion.line
        animate={{ x1: lx, y1: ly, x2: rx, y2: ry }}
        transition={SETTLE}
        stroke={INK}
        strokeWidth="7"
        strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r="6.5" fill={INK} />
      <circle cx={cx} cy={cy} r="2.2" fill="#FFFFFF" />

      {/* left pan — 3 x-cubes and a 7 tablet */}
      <motion.line
        animate={{ x1: lx, y1: ly, x2: lx, y2: ly + 24 }}
        transition={SETTLE}
        stroke={INK}
        strokeWidth="2"
      />
      <motion.g animate={{ x: lx - 125, y: ly - 72 }} transition={SETTLE}>
        <g transform="translate(125,72)">
          <path d="M -34 24 A 34 34 0 0 0 34 24 Z" fill="url(#ca-weight)" />
          {/* cubes sit on the rim */}
          <g fontFamily="Caveat, cursive" fontWeight="700" fontSize="14" fill="#FFFFFF">
            <rect x="-31" y="4" width="19" height="19" rx="3" fill="url(#ca-cube)" />
            <text x="-21.5" y="18.5" textAnchor="middle">
              x
            </text>
            <rect x="-9.5" y="4" width="19" height="19" rx="3" fill="url(#ca-cube)" />
            <text x="0" y="18.5" textAnchor="middle">
              x
            </text>
            <rect x="12" y="4" width="19" height="19" rx="3" fill="url(#ca-cube)" />
            <text x="21.5" y="18.5" textAnchor="middle">
              x
            </text>
            <circle cx="0" cy="-4" r="8.5" fill="#3D3D49" />
            <text x="0" y="0.5" textAnchor="middle" fontSize="12">
              7
            </text>
          </g>
        </g>
      </motion.g>

      {/* right pan — the 22 kettlebell */}
      <motion.line
        animate={{ x1: rx, y1: ry, x2: rx, y2: ry + 24 }}
        transition={SETTLE}
        stroke={INK}
        strokeWidth="2"
      />
      <motion.g animate={{ x: rx - 125, y: ry - 72 }} transition={SETTLE}>
        <g transform="translate(125,72)">
          <path d="M -34 24 A 34 34 0 0 0 34 24 Z" fill="url(#ca-weight)" />
          <path
            d="M -9 6 A 9 9 0 0 1 9 6"
            fill="none"
            stroke={INK}
            strokeWidth="4"
            strokeLinecap="round"
          />
          <rect x="-17" y="4" width="34" height="21" rx="4" fill="url(#ca-weight)" />
          <text
            x="0"
            y="19.5"
            textAnchor="middle"
            fontFamily="Caveat, cursive"
            fontWeight="700"
            fontSize="15"
            fill="#FFFFFF"
          >
            22
          </text>
        </g>
      </motion.g>
    </svg>
  );
}

/* --------------------------------------------------------------------- pieces */

function Spark({ x, y, delay, size = 10 }: { x: number; y: number; delay: number; size?: number }) {
  return (
    <motion.svg
      viewBox="-7 -7 14 14"
      width={size}
      height={size}
      initial={{ opacity: 0, scale: 0, x, y: y + 6 }}
      animate={{ opacity: [0, 1, 0], scale: [0, 1.25, 0.4], y: y - 14 }}
      transition={{ duration: 0.9, delay, ease: 'easeOut' }}
      style={{ position: 'absolute', left: 0, top: 0 }}
      aria-hidden
    >
      <path
        d="M 0 -7 C 1.2 -2.4, 2.4 -1.2, 7 0 C 2.4 1.2, 1.2 2.4, 0 7 C -1.2 2.4, -2.4 1.2, -7 0 C -2.4 -1.2, -1.2 -2.4, 0 -7 Z"
        fill={ULTRA}
      />
    </motion.svg>
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
        width: 64,
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: primary ? `1px solid ${INK}` : `1px solid ${HAIR}`,
        borderRadius: 3,
        background: primary ? INK : '#FFFFFF',
        color: primary ? '#FFFFFF' : INK,
        fontSize: 22,
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

function NumberPad({
  entry,
  status,
  press,
  erase,
  check,
}: {
  entry: string;
  status: PadStatus;
  press: (d: string) => void;
  erase: () => void;
  check: () => void;
}) {
  const digits = useMemo(() => ['1', '2', '3', '4', '5', '6', '7', '8', '9'], []);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 64px)', gap: 10 }}>
      {digits.map((d) => (
        <PadKey key={d} label={d} onPress={() => press(d)} disabled={status === 'solved'} />
      ))}
      <PadKey
        ariaLabel="erase"
        onPress={erase}
        disabled={status === 'solved'}
        icon={
          <svg
            width="21"
            height="21"
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
      <PadKey label="0" onPress={() => press('0')} disabled={status === 'solved'} />
      <PadKey
        ariaLabel="check the answer"
        primary
        onPress={check}
        disabled={entry.length === 0 || status === 'solved'}
        icon={
          <svg
            width="22"
            height="22"
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
  );
}

/* ----------------------------------------------------------------------- rail */

function Rail({ mood, solved }: { mood: VidyaMood; solved: boolean }) {
  const week = useMemo(
    () => [true, true, true, true, true, false, false].map((on, i) => ({ on, id: `d${i}` })),
    [],
  );
  return (
    <motion.aside
      initial={{ x: -44, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ ...SPRING, delay: 0.05 }}
      style={{
        position: 'sticky',
        top: 0,
        alignSelf: 'flex-start',
        width: 300,
        height: '100vh',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '28px 28px 32px',
        borderRight: `1px solid ${HAIR_SOFT}`,
        background: '#FFFFFF',
        zIndex: 4,
      }}
    >
      <div style={{ alignSelf: 'flex-start' }}>
        <ClassessLogo height={14} />
      </div>

      <div style={{ flex: 1 }} />

      {/* her breathing halo — ambient, always alive */}
      <div style={{ position: 'relative', width: 168, height: 168 }}>
        <motion.div
          aria-hidden
          animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.85, 0.5] }}
          transition={{ duration: 5.4, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            inset: -22,
            borderRadius: '50%',
            background:
              'radial-gradient(circle at 50% 58%, rgba(255,90,31,0.13) 0%, rgba(204,30,122,0.06) 48%, rgba(255,255,255,0) 72%)',
          }}
        />
        <div style={{ position: 'absolute', left: 14, top: 10 }}>
          <VidyaBody size={140} mood={mood} gaze="pointer" />
        </div>
      </div>

      <div
        style={{
          marginTop: 22,
          fontFamily: 'Caveat, cursive',
          fontSize: 27,
          fontWeight: 600,
          color: INK,
        }}
      >
        good evening, Arya
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: 13.5,
          lineHeight: 1.5,
          color: INK_60,
          textAlign: 'center',
          maxWidth: 210,
        }}
      >
        {solved
          ? 'that was clean work. the boss battle is two steps away.'
          : 'I can see the board with you. ask me anything.'}
      </div>

      <div style={{ flex: 1.4 }} />

      {/* the ledger — streak and xp, machined */}
      <div style={{ width: '100%', borderTop: `1px solid ${HAIR_SOFT}`, paddingTop: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={CAPS}>streak</span>
          <span style={{ fontSize: 20, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            12<span style={{ fontSize: 12, fontWeight: 500, color: INK_40 }}> days</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          {week.map((d) => (
            <div
              key={d.id}
              style={{
                width: 26,
                height: 4,
                borderRadius: 2,
                background: d.on ? INK : 'rgba(13,13,16,0.10)',
              }}
            />
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginTop: 16,
            position: 'relative',
          }}
        >
          <span style={CAPS}>xp</span>
          <span style={{ fontSize: 20, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {solved ? '2,380' : '2,340'}
          </span>
          <AnimatePresence>
            {solved && (
              <motion.span
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: -16 }}
                exit={{ opacity: 0 }}
                transition={{ ...SPRING, delay: 0.4 }}
                style={{
                  position: 'absolute',
                  right: 0,
                  top: -6,
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
        <div style={{ marginTop: 18, ...CAPS }}>monday 6 july</div>
      </div>
    </motion.aside>
  );
}

/* ----------------------------------------------------------------------- home */

function HeroCard({ tilt, onContinue }: { tilt: number; onContinue: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rX = useSpring(useTransform(my, [-0.5, 0.5], [3.5, -3.5]), {
    stiffness: 180,
    damping: 18,
  });
  const rY = useSpring(useTransform(mx, [-0.5, 0.5], [-4.5, 4.5]), {
    stiffness: 180,
    damping: 18,
  });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: 0.42 }}
      onMouseMove={(e) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onMouseLeave={() => {
        mx.set(0);
        my.set(0);
      }}
      whileHover={{ y: -4 }}
      style={{
        rotateX: rX,
        rotateY: rY,
        transformPerspective: 1000,
        display: 'grid',
        gridTemplateColumns: '290px 1fr',
        gap: 40,
        alignItems: 'center',
        border: `1px solid ${HAIR}`,
        borderRadius: 3,
        padding: '36px 44px 36px 32px',
        background: '#FFFFFF',
        maxWidth: 780,
      }}
    >
      {/* ambient float on the scene */}
      <motion.div
        animate={{ y: [0, -7, 0] }}
        transition={{ duration: 5.6, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
      >
        <BalanceScene tilt={tilt} size={264} />
      </motion.div>
      <div>
        <div style={CAPS}>continue · mathematics</div>
        <h2 style={{ fontSize: 30, fontWeight: 600, marginTop: 10 }}>Linear equations</h2>
        <p style={{ fontSize: 14.5, color: INK_60, margin: '8px 0 0', lineHeight: 1.55 }}>
          the balance is uneven until x owns its value. two screens left, then the boss battle.
        </p>
        {/* progress — a hairline that carries the pigment */}
        <div
          style={{
            marginTop: 20,
            height: 3,
            borderRadius: 2,
            background: 'rgba(13,13,16,0.07)',
            overflow: 'hidden',
            maxWidth: 320,
          }}
        >
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.9, duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            style={{
              width: '72%',
              height: '100%',
              background: ULTRA,
              borderRadius: 2,
              transformOrigin: 'left',
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 22 }}>
          <motion.button
            type="button"
            onClick={onContinue}
            whileHover={{ y: -2, backgroundColor: '#26262E' }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
            style={{
              border: 'none',
              borderRadius: 3,
              background: INK,
              color: '#FFFFFF',
              fontFamily: 'inherit',
              fontSize: 14,
              fontWeight: 600,
              padding: '12px 22px',
              cursor: 'pointer',
            }}
          >
            continue the lesson
          </motion.button>
          <span style={{ fontSize: 12.5, color: INK_40, fontVariantNumeric: 'tabular-nums' }}>
            72% · 12 min left
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function Door({
  title,
  line,
  delay,
  art,
}: {
  title: string;
  line: string;
  delay: number;
  art: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay }}
      whileHover={{ y: -3, backgroundColor: TONAL }}
      whileTap={{ scale: 0.98 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        border: `1px solid ${HAIR}`,
        borderRadius: 3,
        background: '#FFFFFF',
        padding: '20px 24px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        textAlign: 'left',
        width: 300,
      }}
    >
      {art}
      <span>
        <span style={{ display: 'block', fontSize: 16.5, fontWeight: 600, color: INK }}>
          {title}
        </span>
        <span style={{ display: 'block', fontSize: 12.5, color: INK_40, marginTop: 3 }}>
          {line}
        </span>
      </span>
    </motion.button>
  );
}

const LearnGlyph = (
  <svg width="34" height="34" viewBox="0 0 34 34" fill="none" role="presentation" aria-hidden>
    <path d="M5 9.5 17 5l12 4.5L17 14 5 9.5Z" fill={INK} />
    <path d="M9.5 12.5v7c0 2 3.4 4 7.5 4s7.5-2 7.5-4v-7" stroke={INK} strokeWidth="2" />
    <line x1="29" y1="9.5" x2="29" y2="19" stroke={INK} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const PracticeGlyph = (
  <svg width="34" height="34" viewBox="0 0 34 34" fill="none" role="presentation" aria-hidden>
    <rect x="5" y="5" width="24" height="24" rx="2.5" stroke={INK} strokeWidth="2" />
    <circle cx="12" cy="12" r="2.1" fill={INK} />
    <circle cx="22" cy="12" r="2.1" fill={INK} />
    <circle cx="12" cy="22" r="2.1" fill={INK} />
    <circle cx="22" cy="22" r="2.1" fill={INK} />
    <circle cx="17" cy="17" r="2.1" fill={INK} />
  </svg>
);

/* --------------------------------------------------------------------- lesson */

function LessonAct({ practice }: { practice: ReturnType<typeof usePractice> }) {
  const { entry, status, press, erase, check } = practice;
  const solved = status === 'solved';
  const tilt = solved ? 0 : status === 'wrong' ? 13 : 8;
  return (
    <section
      id="ca-lesson"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        padding: '96px 80px',
        borderTop: `1px solid ${HAIR_SOFT}`,
      }}
    >
      <div style={{ maxWidth: 980, width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={CAPS}>practice · linear equations</span>
          <span style={{ ...CAPS, fontVariantNumeric: 'tabular-nums' }}>question 3 of 8</span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 232px',
            gap: 72,
            alignItems: 'center',
            marginTop: 56,
          }}
        >
          <div>
            {/* the equation — display type, the x ignites on mastery */}
            <div style={{ position: 'relative', overflow: 'hidden', paddingBottom: 6 }}>
              <div
                style={{
                  fontSize: 78,
                  fontWeight: 300,
                  letterSpacing: '-0.03em',
                  fontVariantNumeric: 'tabular-nums',
                  color: INK,
                }}
              >
                3
                <motion.span
                  animate={{ color: solved ? ULTRA : INK }}
                  transition={{ duration: 0.5 }}
                  style={{ fontWeight: 400 }}
                >
                  x
                </motion.span>
                {' + 7 = 22'}
              </div>
              {/* ignite sweep — fires once, only on genuine mastery */}
              <AnimatePresence>
                {solved && (
                  <motion.div
                    initial={{ x: '-110%' }}
                    animate={{ x: '110%' }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'linear-gradient(100deg, rgba(31,53,224,0) 20%, rgba(31,53,224,0.14) 50%, rgba(31,53,224,0) 80%)',
                    }}
                  />
                )}
              </AnimatePresence>
            </div>

            <div
              style={{
                marginTop: 10,
                display: 'flex',
                alignItems: 'baseline',
                gap: 20,
                position: 'relative',
              }}
            >
              <span style={{ fontSize: 40, fontWeight: 300, color: INK_60 }}>x =</span>
              <motion.div
                animate={status === 'wrong' ? { x: [0, -8, 7, -4, 0] } : { x: 0 }}
                transition={{ duration: 0.45 }}
                style={{
                  minWidth: 96,
                  borderBottom: `2px solid ${solved ? ULTRA : INK}`,
                  fontSize: 46,
                  fontWeight: 500,
                  fontVariantNumeric: 'tabular-nums',
                  color: solved ? ULTRA : INK,
                  lineHeight: 1.3,
                  paddingBottom: 2,
                  position: 'relative',
                }}
              >
                {entry || ' '}
                {/* the caret breathes while she waits */}
                {!solved && (
                  <motion.span
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 1.15, repeat: Number.POSITIVE_INFINITY }}
                    style={{
                      position: 'absolute',
                      right: entry ? 6 : 40,
                      bottom: 10,
                      width: 2,
                      height: 34,
                      background: INK_40,
                    }}
                  />
                )}
                {/* sparks — the earned pop */}
                <AnimatePresence>
                  {solved && (
                    <div style={{ position: 'absolute', left: '50%', top: '30%' }} aria-hidden>
                      <Spark x={-52} y={-16} delay={0.15} />
                      <Spark x={28} y={-30} delay={0.25} size={13} />
                      <Spark x={58} y={2} delay={0.35} size={8} />
                      <Spark x={-18} y={-44} delay={0.42} />
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
              <div style={{ minHeight: 24 }}>
                <AnimatePresence mode="wait">
                  {solved ? (
                    <motion.span
                      key="won"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...SPRING, delay: 0.3 }}
                      style={{
                        fontFamily: 'Caveat, cursive',
                        fontSize: 25,
                        color: ULTRA,
                        fontWeight: 600,
                      }}
                    >
                      the scale agrees — that is mastery
                    </motion.span>
                  ) : status === 'wrong' ? (
                    <motion.span
                      key="hint"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      style={{ fontFamily: 'Caveat, cursive', fontSize: 23, color: INK_60 }}
                    >
                      take the 7 away from both sides first
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>

            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 6.2, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
              style={{ marginTop: 40 }}
            >
              <BalanceScene tilt={tilt} size={330} />
            </motion.div>
          </div>

          <div>
            <NumberPad entry={entry} status={status} press={press} erase={erase} check={check} />
            <p style={{ fontSize: 12, color: INK_40, marginTop: 18, lineHeight: 1.6 }}>
              keep both sides equal. what is left when the 7 steps off the pan?
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------- concept A */

export function ConceptA() {
  const practice = usePractice('5');
  const mood: VidyaMood =
    practice.status === 'solved'
      ? 'celebrate'
      : practice.status === 'wrong'
        ? 'hint'
        : practice.entry.length > 0
          ? 'thinking'
          : 'idle';

  const scrollToLesson = () =>
    document.getElementById('ca-lesson')?.scrollIntoView({ behavior: 'smooth' });

  const headline = ['Make', 'x', 'stand', 'alone.'];

  return (
    <div style={{ display: 'flex', background: '#FFFFFF', minHeight: '100vh', color: INK }}>
      <Rail mood={mood} solved={practice.status === 'solved'} />

      <main style={{ flex: 1, minWidth: 0 }}>
        {/* act one — the home stage */}
        <section
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            padding: '30px 80px 40px',
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.3 }}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}
          >
            <span style={CAPS}>today</span>
            <span style={{ fontSize: 13, color: INK_60, maxWidth: 400, textAlign: 'right' }}>
              <span style={{ ...CAPS, marginRight: 10 }}>did you know</span>
              octopuses solve equations of a kind — they balance eight arms at once
            </span>
          </motion.div>

          <div style={{ flex: 1 }} />

          <h1
            style={{
              fontSize: 74,
              fontWeight: 300,
              letterSpacing: '-0.035em',
              lineHeight: 1.02,
              maxWidth: 720,
              margin: 0,
            }}
          >
            {headline.map((w, i) => (
              <span
                key={w}
                style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'bottom' }}
              >
                <motion.span
                  initial={{ y: '105%' }}
                  animate={{ y: 0 }}
                  transition={{ ...SPRING, delay: 0.12 + i * 0.07 }}
                  style={{
                    display: 'inline-block',
                    fontWeight: w === 'x' ? 500 : 300,
                    fontStyle: w === 'x' ? 'italic' : 'normal',
                    marginRight: '0.24em',
                  }}
                >
                  {w}
                </motion.span>
              </span>
            ))}
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.6 }}
            style={{ fontSize: 16, color: INK_60, margin: '18px 0 0', maxWidth: 520 }}
          >
            one intention today: finish linear equations. everything else can wait.
          </motion.p>

          <div style={{ marginTop: 44 }}>
            <HeroCard tilt={practice.status === 'solved' ? 0 : 8} onContinue={scrollToLesson} />
          </div>

          <div style={{ display: 'flex', gap: 16, marginTop: 20 }}>
            <Door
              title="Learn"
              line="your subjects, chapter by chapter"
              delay={0.55}
              art={LearnGlyph}
            />
            <Door
              title="Practice"
              line="sandbox, retrieval, boss battles"
              delay={0.62}
              art={PracticeGlyph}
            />
          </div>

          <div style={{ flex: 1 }} />

          {/* scroll cue — a quiet breath downward */}
          <motion.button
            type="button"
            onClick={scrollToLesson}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            whileHover={{ y: 2 }}
            style={{
              alignSelf: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontFamily: 'inherit',
              ...CAPS,
            }}
          >
            the lesson, below
            <motion.span
              animate={{ scaleY: [0.4, 1, 0.4], opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2.2, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
              style={{
                width: 1.5,
                height: 30,
                background: INK_40,
                display: 'block',
                transformOrigin: 'top',
              }}
            />
          </motion.button>
        </section>

        {/* act two — the lesson */}
        <LessonAct practice={practice} />
      </main>
    </div>
  );
}
