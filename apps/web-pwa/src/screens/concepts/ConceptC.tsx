'use client';

/**
 * Concept C — "The broadsheet".
 *
 * Compositional idea: the home is a daily edition — a front page typeset for one reader.
 * Typography does all the layout work: a masthead with rules, one enormous headline whose
 * living punctuation is Vidya herself, a lede with a drop cap, a contents index with dotted
 * leaders, and a boxed "did you know" dispatch. The lesson is the feature spread below the
 * fold: the equation set as display type, solved with a letterpress stamp, annotated by
 * Vidya's own hand in the margin.
 *
 * Apple lens: a strict typographic grid, optical alignment, hairline rules instead of boxes,
 * one pigment (magenta, the edition's accent), and micro-detail in how everything settles.
 */

import { VidyaBody, type VidyaMood } from '@classess/vidya';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClassessLogo } from '../../ui/Logo';

const INK = '#0D0D10';
const INK_60 = 'rgba(13,13,16,0.58)';
const INK_40 = 'rgba(13,13,16,0.36)';
const HAIR = 'rgba(13,13,16,0.10)';
const HAIR_SOFT = 'rgba(13,13,16,0.055)';
const TONAL = 'rgba(13,13,16,0.026)';
const MAGENTA = '#CC1E7A';
const SPRING = { type: 'spring', stiffness: 260, damping: 26 } as const;

const CAPS: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  color: INK_40,
};

const FACTS = [
  'a single lightning bolt is five times hotter than the surface of the sun',
  'honey found in pharaohs’ tombs is still perfectly edible',
  'there are more possible chess games than atoms in the universe',
];

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

/** Handwriting that writes itself, letter by letter, in her hand. */
function Handwrite({
  text,
  size = 24,
  color = INK,
  delay = 0,
}: {
  text: string;
  size?: number;
  color?: string;
  delay?: number;
}) {
  const chars = useMemo(() => text.split('').map((ch, i) => ({ ch, key: `c${i}${ch}` })), [text]);
  return (
    <span
      style={{
        fontFamily: 'Caveat, cursive',
        fontSize: size,
        fontWeight: 600,
        color,
        lineHeight: 1.15,
      }}
    >
      {chars.map((c) => (
        <motion.span
          key={c.key}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + chars.indexOf(c) * 0.045, duration: 0.12 }}
        >
          {c.ch}
        </motion.span>
      ))}
    </span>
  );
}

/** fig. a — a line climbing by threes, drawing and undrawing itself forever. */
function FigureA() {
  return (
    <svg
      viewBox="0 0 260 170"
      width="100%"
      role="img"
      aria-label="a graph of the line rising three for every one across"
      style={{ display: 'block' }}
    >
      <line x1="30" y1="12" x2="30" y2="146" stroke={HAIR} strokeWidth="1.5" />
      <line x1="30" y1="146" x2="244" y2="146" stroke={HAIR} strokeWidth="1.5" />
      {/* dashed height of 22 */}
      <line
        x1="30"
        y1="34"
        x2="200"
        y2="34"
        stroke={INK_40}
        strokeWidth="1"
        strokeDasharray="2 5"
      />
      <text x="238" y="38" fontSize="11" fontWeight="600" fill={INK_40} textAnchor="end">
        22
      </text>
      {/* the line, breathing */}
      <motion.path
        d="M 30 122 L 200 34"
        fill="none"
        stroke={MAGENTA}
        strokeWidth="2.5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: [0, 1, 1, 0] }}
        transition={{
          duration: 7,
          times: [0, 0.4, 0.75, 1],
          repeat: Number.POSITIVE_INFINITY,
          ease: 'easeInOut',
        }}
      />
      {/* translated group: SVG scale pivots on the user-space origin, so give it one */}
      <g transform="translate(200 34)">
        <motion.circle
          cx="0"
          cy="0"
          r="4.5"
          fill={MAGENTA}
          animate={{ opacity: [0, 0, 1, 1, 0], scale: [0.5, 0.5, 1, 1, 0.5] }}
          transition={{
            duration: 7,
            times: [0, 0.35, 0.45, 0.75, 1],
            repeat: Number.POSITIVE_INFINITY,
          }}
        />
      </g>
      <text x="30" y="160" fontSize="10" fontWeight="600" fill={INK_40}>
        0
      </text>
    </svg>
  );
}

function IndexRow({
  no,
  label,
  note,
  delay,
}: {
  no: string;
  label: string;
  note: string;
  delay: number;
}) {
  return (
    <motion.button
      type="button"
      initial="rest"
      whileHover="hover"
      animate="rest"
      variants={{ rest: {}, hover: { x: 8 } }}
      transition={{ type: 'spring', stiffness: 400, damping: 26 }}
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 14,
        width: '100%',
        padding: '14px 2px',
        border: 'none',
        borderBottom: `1px solid ${HAIR_SOFT}`,
        background: 'transparent',
        cursor: 'pointer',
        fontFamily: 'inherit',
        textAlign: 'left',
      }}
    >
      <motion.span
        variants={{ rest: { opacity: 1 }, hover: { opacity: 1 } }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay, duration: 0.5 }}
        style={{ display: 'flex', alignItems: 'baseline', gap: 14, width: '100%' }}
      >
        <motion.span
          variants={{ rest: { color: INK_40 }, hover: { color: MAGENTA } }}
          style={{
            fontSize: 13,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.06em',
          }}
        >
          {no}
        </motion.span>
        <span style={{ fontSize: 19, fontWeight: 600, color: INK }}>{label}</span>
        <span
          style={{
            flex: 1,
            borderBottom: `1.5px dotted ${HAIR}`,
            transform: 'translateY(-4px)',
          }}
        />
        <span style={{ fontSize: 12.5, color: INK_40 }}>{note}</span>
      </motion.span>
    </motion.button>
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
        width: 62,
        height: 62,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: primary ? `1px solid ${INK}` : `1px solid ${HAIR}`,
        borderRadius: 3,
        background: primary ? INK : '#FFFFFF',
        color: primary ? '#FFFFFF' : INK,
        fontSize: 21,
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

/** A masked line of the headline rising into place. */
function HeadlineLine({ children, delay }: { children: React.ReactNode; delay: number }) {
  return (
    <span style={{ display: 'block', overflow: 'hidden' }}>
      <motion.span
        initial={{ y: '108%' }}
        animate={{ y: 0 }}
        transition={{ ...SPRING, delay }}
        style={{ display: 'block' }}
      >
        {children}
      </motion.span>
    </span>
  );
}

/* ------------------------------------------------------------------- concept C */

export function ConceptC() {
  const { entry, status, press, erase, check } = usePractice('5');
  const solved = status === 'solved';
  const [touched, setTouched] = useState(false);
  const [fact, setFact] = useState(0);
  const digits = useMemo(() => ['1', '2', '3', '4', '5', '6', '7', '8', '9'], []);

  useEffect(() => {
    const t = setInterval(() => setFact((f) => (f + 1) % FACTS.length), 4600);
    return () => clearInterval(t);
  }, []);

  const mood: VidyaMood = solved
    ? 'celebrate'
    : status === 'wrong'
      ? 'hint'
      : entry.length > 0
        ? 'thinking'
        : 'idle';

  const pressTouched = (d: string) => {
    setTouched(true);
    press(d);
  };

  const rule = (delay: number, weight = 1) => (
    <motion.div
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ delay, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      style={{ height: weight, background: weight > 1 ? INK : HAIR, transformOrigin: 'left' }}
    />
  );

  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh', color: INK }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 48px 120px' }}>
        {/* masthead */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            paddingBottom: 14,
          }}
        >
          <ClassessLogo height={15} />
          <span style={CAPS}>the daily edition · printed for Arya</span>
          <span style={{ ...CAPS, color: INK_60 }}>monday 6 july 2026</span>
        </motion.div>
        {rule(0.1, 2)}
        <div style={{ height: 3 }} />
        {rule(0.18)}

        {/* meta strip — streak, xp, and the wire ticker */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            padding: '12px 2px',
            position: 'relative',
          }}
        >
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            style={{ ...CAPS, color: INK_60, display: 'flex', gap: 8, alignItems: 'baseline' }}
          >
            streak 12 days · {solved ? '2,380' : '2,340'} xp · grade 9
            <AnimatePresence>
              {solved && (
                <motion.span
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SPRING, delay: 0.5 }}
                  style={{ color: MAGENTA, fontWeight: 700 }}
                >
                  +40
                </motion.span>
              )}
            </AnimatePresence>
          </motion.span>
          <span
            style={{
              fontSize: 12.5,
              color: INK_60,
              maxWidth: 520,
              textAlign: 'right',
              minHeight: 18,
            }}
          >
            <span style={{ ...CAPS, marginRight: 10 }}>from the wire</span>
            <AnimatePresence mode="wait">
              <motion.span
                key={fact}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.45 }}
                style={{ display: 'inline-block' }}
              >
                {FACTS[fact]}
              </motion.span>
            </AnimatePresence>
          </span>
        </div>
        {rule(0.4)}

        {/* the headline — and its living punctuation */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 36,
            padding: '54px 0 46px',
          }}
        >
          <h1
            style={{
              fontSize: 92,
              fontWeight: 300,
              letterSpacing: '-0.04em',
              lineHeight: 1.0,
              margin: 0,
              flex: 1,
            }}
          >
            <HeadlineLine delay={0.25}>
              <motion.span
                whileHover={{ color: MAGENTA, rotate: -4 }}
                style={{
                  fontStyle: 'italic',
                  fontWeight: 400,
                  display: 'inline-block',
                  marginRight: '0.22em',
                }}
              >
                x
              </motion.span>
              has been hiding.
            </HeadlineLine>
            <HeadlineLine delay={0.38}>Today it stands alone.</HeadlineLine>
          </h1>
          <motion.div
            initial={{ opacity: 0, scale: 0.6, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.6 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              paddingBottom: 6,
            }}
          >
            <VidyaBody size={116} mood={mood} gaze="pointer" />
            <span
              style={{
                fontFamily: 'Caveat, cursive',
                fontSize: 20,
                fontWeight: 600,
                color: INK_60,
                whiteSpace: 'nowrap',
              }}
            >
              right here if you need me
            </span>
          </motion.div>
        </div>
        {rule(0.55)}

        {/* the columns */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.9fr 1px 1fr',
            gap: 44,
            padding: '36px 0 56px',
          }}
        >
          {/* the lede + contents */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.7 }}
          >
            <div style={CAPS}>the lede</div>
            <p
              style={{
                fontSize: 17,
                lineHeight: 1.65,
                color: INK,
                margin: '16px 0 0',
                maxWidth: 560,
              }}
            >
              <span
                style={{
                  float: 'left',
                  fontSize: 64,
                  lineHeight: 0.82,
                  fontWeight: 600,
                  paddingRight: 12,
                  paddingTop: 6,
                }}
              >
                Y
              </span>
              esterday you cracked the slope of a line. Today the story turns to balance — an
              equation is a set of scales, and x is the stranger standing on one side. Three short
              acts below the fold: undo the seven, divide by three, watch x step into the light.
              Twelve minutes, one boss battle, and the chapter closes.
            </p>

            <div style={{ ...CAPS, marginTop: 44 }}>contents</div>
            <div style={{ marginTop: 8 }}>
              <IndexRow
                no="01"
                label="Learn"
                note="your subjects, chapter by chapter"
                delay={0.8}
              />
              <IndexRow no="02" label="Practice" note="sandbox and boss battles" delay={0.88} />
              <IndexRow no="03" label="Progress" note="your knowledge twin" delay={0.96} />
            </div>
          </motion.div>

          <div style={{ background: HAIR_SOFT }} />

          {/* the dispatch */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.82 }}
          >
            <div style={{ border: `1px solid ${HAIR}`, borderRadius: 3, padding: '20px 22px' }}>
              <div style={CAPS}>did you know</div>
              <div
                style={{
                  fontFamily: 'Caveat, cursive',
                  fontSize: 26,
                  fontWeight: 600,
                  lineHeight: 1.2,
                  marginTop: 12,
                }}
              >
                the equals sign was invented in 1557 by a welshman tired of writing “is equal to”
                again and again
              </div>
            </div>
            <div style={{ marginTop: 28 }}>
              <FigureA />
              <div style={{ ...CAPS, marginTop: 10, letterSpacing: '0.1em' }}>
                fig. a — a line climbing by threes
              </div>
            </div>
          </motion.div>
        </div>
        {rule(0.9, 2)}

        {/* the feature spread — the lesson */}
        <div style={{ padding: '30px 2px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={CAPS}>the feature · practice</span>
            <span style={{ ...CAPS, fontVariantNumeric: 'tabular-nums' }}>
              linear equations · 3 of 8
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 206px 200px',
              gap: 52,
              alignItems: 'start',
              marginTop: 46,
            }}
          >
            {/* the equation as display type */}
            <div>
              <div
                style={{
                  fontSize: 100,
                  fontWeight: 200,
                  letterSpacing: '-0.035em',
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                  whiteSpace: 'nowrap',
                }}
              >
                3<span style={{ fontStyle: 'italic', fontWeight: 300 }}>x</span>
                {' + 7 = 22'}
              </div>
              {/* the accent underline earns its ink on mastery */}
              <motion.div
                initial={false}
                animate={{ scaleX: solved ? 1 : 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  height: 3,
                  background: MAGENTA,
                  transformOrigin: 'left',
                  marginTop: 18,
                  maxWidth: 560,
                }}
              />

              <motion.div
                animate={status === 'wrong' ? { x: [0, -8, 7, -4, 0] } : { x: 0 }}
                transition={{ duration: 0.45 }}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 22,
                  marginTop: 40,
                }}
              >
                <span style={{ fontSize: 54, fontWeight: 200, color: INK_60 }}>
                  <span style={{ fontStyle: 'italic', fontWeight: 300, color: INK }}>x</span>
                  {' ='}
                </span>
                <span
                  style={{
                    minWidth: 110,
                    borderBottom: `2px solid ${solved ? MAGENTA : INK}`,
                    textAlign: 'center',
                    display: 'inline-block',
                    height: 76,
                  }}
                >
                  {solved ? (
                    <motion.span
                      initial={{ scale: 2.4, opacity: 0, rotate: -7 }}
                      animate={{ scale: 1, opacity: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 17 }}
                      style={{
                        display: 'inline-block',
                        fontSize: 62,
                        fontWeight: 500,
                        color: MAGENTA,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {entry}
                    </motion.span>
                  ) : (
                    <span
                      style={{
                        fontSize: 62,
                        fontWeight: 300,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {entry || ' '}
                    </span>
                  )}
                </span>
              </motion.div>
              <div style={{ minHeight: 30, marginTop: 14 }}>
                <AnimatePresence mode="wait">
                  {status === 'wrong' && (
                    <motion.span
                      key="wrong"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{ fontSize: 14, color: INK_60 }}
                    >
                      not yet — what happens if the 7 crosses the equals sign?
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* the pad — machined */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 62px)', gap: 10 }}>
              {digits.map((d) => (
                <PadKey key={d} label={d} onPress={() => pressTouched(d)} disabled={solved} />
              ))}
              <PadKey
                ariaLabel="erase"
                onPress={erase}
                disabled={solved}
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
              <PadKey label="0" onPress={() => pressTouched('0')} disabled={solved} />
              <PadKey
                ariaLabel="check the answer"
                primary
                onPress={check}
                disabled={entry.length === 0 || solved}
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

            {/* the margin — her hand */}
            <div
              style={{
                borderLeft: `1px solid ${HAIR_SOFT}`,
                paddingLeft: 24,
                minHeight: 300,
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
              }}
            >
              <div style={CAPS}>marginalia</div>
              {touched && !solved && (
                <Handwrite text="keep both sides equal" color={INK_60} size={25} />
              )}
              {status === 'wrong' && (
                <Handwrite text="undo the + 7 first" color={INK_60} size={25} delay={0.2} />
              )}
              {solved && (
                <div>
                  <Handwrite text="beautiful." color={MAGENTA} size={34} delay={0.35} />
                  <motion.svg
                    viewBox="-8 -8 16 16"
                    width="18"
                    height="18"
                    initial={{ opacity: 0, scale: 0, rotate: -30 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    transition={{ ...SPRING, delay: 0.95 }}
                    style={{ display: 'inline-block', marginLeft: 8, verticalAlign: 'middle' }}
                    aria-hidden
                  >
                    <path
                      d="M 0 -8 C 1.4 -2.7, 2.7 -1.4, 8 0 C 2.7 1.4, 1.4 2.7, 0 8 C -1.4 2.7, -2.7 1.4, -8 0 C -2.7 -1.4, -1.4 -2.7, 0 -8 Z"
                      fill={MAGENTA}
                    />
                  </motion.svg>
                </div>
              )}
              {!touched && !solved && (
                <span style={{ fontSize: 12.5, color: INK_40, lineHeight: 1.6 }}>
                  her notes will appear here as you work
                </span>
              )}
              <div style={{ flex: 1 }} />
              <span
                style={{
                  fontFamily: 'Caveat, cursive',
                  fontSize: 19,
                  color: INK_40,
                }}
              >
                — V
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
