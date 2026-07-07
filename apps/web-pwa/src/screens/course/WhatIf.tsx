'use client';

/**
 * The what-if sandbox (DESIGN.md §9): every numerical is editable. Drag a, b, c in a·x + b = c and
 * the worked solution below recomputes live. The ⓘ on the division step unfolds derivation depth
 * ("how we got here") — most move on; the curious go deep. Doubles as the free-play sandbox.
 */

import { useRegisterTarget, useVidyaBus } from '@classess/vidya';
import { AnimatePresence, motion } from 'framer-motion';
import { type ReactNode, useEffect, useState } from 'react';
import { fmt, fractionText } from './equations';
import type { BarState } from './shared';
import {
  CardBody,
  cardTitle,
  equationType,
  GOLD,
  lead,
  rgba,
  Scrubber,
  Stage,
  whisper,
} from './shared';

const HUE = 'var(--clss-ultramarine)';
const MAGENTA = '#CC1E7A';

/**
 * The living plot behind the equation — y = a·x + b as a line, y = c as a horizon, their
 * crossing marked in gold. Every scrub moves it on springs; the algebra↔geometry link, felt.
 */
function GraphBackdrop({ a, b, c }: { a: number; b: number; c: number }) {
  const W = 400;
  const H = 230;
  // x: −10..10 → px; y: −38..38 → px (clipped by the svg — lines may run out of frame honestly)
  const px = (x: number) => W / 2 + x * (W / 22);
  const py = (y: number) => H / 2 - y * (H / 80);
  const spring = { type: 'spring', stiffness: 210, damping: 26 } as const;
  const xStar = (c - b) / a;
  const crossing = Math.abs(xStar) <= 10 && Math.abs(c) <= 38;

  return (
    <svg
      role="presentation"
      aria-hidden
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    >
      {/* faint grid + axes */}
      {[-8, -4, 4, 8].map((gx) => (
        <line
          key={`gx${gx}`}
          x1={px(gx)}
          y1={0}
          x2={px(gx)}
          y2={H}
          stroke={rgba(HUE, 0.07)}
          strokeWidth={1}
        />
      ))}
      {[-24, 24].map((gy) => (
        <line
          key={`gy${gy}`}
          x1={0}
          y1={py(gy)}
          x2={W}
          y2={py(gy)}
          stroke={rgba(HUE, 0.07)}
          strokeWidth={1}
        />
      ))}
      <line x1={px(0)} y1={0} x2={px(0)} y2={H} stroke={rgba(HUE, 0.16)} strokeWidth={1} />
      <line x1={0} y1={py(0)} x2={W} y2={py(0)} stroke={rgba(HUE, 0.16)} strokeWidth={1} />
      {/* y = c — the horizon the line must reach */}
      <motion.line
        animate={{ y1: py(c), y2: py(c) }}
        transition={spring}
        x1={0}
        x2={W}
        stroke={rgba(MAGENTA, 0.38)}
        strokeWidth={1.6}
        strokeDasharray="6 5"
      />
      {/* y = a·x + b — the learner's line */}
      <motion.line
        animate={{ y1: py(a * -10 + b), y2: py(a * 10 + b) }}
        transition={spring}
        x1={px(-10)}
        x2={px(10)}
        stroke={rgba(HUE, 0.45)}
        strokeWidth={2}
        strokeLinecap="round"
      />
      {/* the crossing — x, found geometrically */}
      {crossing && (
        <motion.circle
          animate={{ cx: px(xStar), cy: py(c) }}
          transition={spring}
          r={5.5}
          fill={GOLD}
          stroke="var(--clss-ink)"
          strokeWidth={1.6}
        />
      )}
    </svg>
  );
}

/** A number that fades/rises when its value changes. */
function Live({ children }: { children: ReactNode }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={String(children)}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ type: 'spring', stiffness: 480, damping: 32 }}
        style={{ display: 'inline-block', fontVariantNumeric: 'tabular-nums' }}
      >
        {children}
      </motion.span>
    </AnimatePresence>
  );
}

function StepRow({ move, math }: { move: string; math: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: '4px 18px',
        padding: '12px 0',
      }}
    >
      <div style={{ fontSize: '0.85rem', color: 'var(--clss-ink-500)' }}>{move}</div>
      <div
        style={{
          fontSize: '1.15rem',
          fontWeight: 550,
          color: 'var(--clss-ink-900)',
          fontVariantNumeric: 'tabular-nums',
          display: 'flex',
          alignItems: 'baseline',
          gap: 6,
        }}
      >
        {math}
      </div>
    </div>
  );
}

export function WhatIf({
  nodeId,
  freePlay = false,
  setBar,
  onDone,
}: {
  nodeId?: string;
  freePlay?: boolean;
  setBar: (b: BarState | null) => void;
  onDone?: () => void;
}) {
  const bus = useVidyaBus();
  const [a, setA] = useState(2);
  const [b, setB] = useState(3);
  const [c, setC] = useState(11);
  const [depthOpen, setDepthOpen] = useState(false);

  const equationRef = useRegisterTarget<HTMLDivElement>('course-whatif-equation', {
    kind: 'equation',
    label: 'the editable equation a·x + b = c with draggable numbers',
  });
  const solutionRef = useRegisterTarget<HTMLDivElement>('course-whatif-solution', {
    kind: 'working',
    label: 'the live worked solution below the equation',
  });

  const k = c - b; // after moving b across
  const op = b < 0 ? '−' : '+';
  const undoMove =
    b === 0 ? null : b > 0 ? `subtract ${b} from both sides` : `add ${-b} to both sides`;
  const solved = fractionText(k, a);

  useEffect(() => {
    bus.publishCanvas({
      nodeId: nodeId ?? 'sandbox-linear-equation',
      equation: `${a}x ${op} ${Math.abs(b)} = ${c}`,
      steps: [
        ...(undoMove ? [`${undoMove}: ${a}x = ${fmt(k)}`] : []),
        a === 1 ? `x is already alone: x = ${fmt(k)}` : `divide both sides by ${a}: x = ${solved}`,
      ],
      lastEditedAt: new Date().toISOString(),
    });
  }, [bus, nodeId, a, b, c, op, undoMove, k, solved]);
  useEffect(() => () => bus.publishCanvas(undefined), [bus]);

  useEffect(() => {
    if (freePlay || !onDone) {
      setBar(null);
      return;
    }
    setBar({ primary: { label: 'Continue', onClick: onDone } });
  }, [setBar, onDone, freePlay]);

  return (
    <CardBody maxWidth={620}>
      <div style={whisper}>{freePlay ? 'No task, no clock' : 'What if'}</div>
      <div style={cardTitle}>Every number here is yours to drag</div>
      <div style={lead}>Pull a, b, or c sideways — the whole solution keeps up.</div>

      {/* the editable equation, staged over its own living graph */}
      <Stage hue={HUE} tint={0.05} minHeight={280}>
        <GraphBackdrop a={a} b={b} c={c} />
        <div
          ref={equationRef}
          style={{
            ...equationType,
            fontSize: 'clamp(1.8rem, 6vw, 2.4rem)',
            position: 'relative',
            textAlign: 'center',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'baseline',
            gap: 12,
            flexWrap: 'wrap',
            padding: '10px 18px',
            borderRadius: 3,
            background: 'rgba(255,255,255,0.78)',
          }}
        >
          <Scrubber value={a} min={1} max={9} onChange={setA} label="coefficient a" />
          <span>x</span>
          <span>{op}</span>
          <Scrubber
            value={b}
            min={-9}
            max={9}
            onChange={setB}
            label="constant b"
            display={String(Math.abs(b))}
          />
          <span>=</span>
          <Scrubber value={c} min={-20} max={20} onChange={setC} label="right side c" />
        </div>
      </Stage>

      {/* the worked solution, always live */}
      <div
        ref={solutionRef}
        style={{
          border: '0.5px solid var(--clss-hairline-on-paper-strong)',
          borderRadius: 'var(--clss-radius-md)',
          padding: '6px 20px',
          background: 'var(--clss-paper)',
        }}
      >
        {undoMove && (
          <>
            <StepRow
              move={undoMove}
              math={
                <>
                  <Live>{`${a}x`}</Live>
                  <span>=</span>
                  <Live>{`${c} ${b > 0 ? '−' : '+'} ${Math.abs(b)}`}</Live>
                </>
              }
            />
            <div
              style={{
                height: 1,
                transform: 'scaleY(0.5)',
                background: 'var(--clss-hairline-on-paper)',
              }}
            />
          </>
        )}
        {a !== 1 && (
          <>
            <StepRow
              move={`divide both sides by ${a}`}
              math={
                <>
                  <span>x</span>
                  <span>=</span>
                  <Live>{`${fmt(k)}/${a}`}</Live>
                  <button
                    type="button"
                    aria-label="how we got here"
                    aria-expanded={depthOpen}
                    onClick={() => setDepthOpen((o) => !o)}
                    style={{
                      border: '0.5px solid var(--clss-hairline-on-paper-strong)',
                      background: depthOpen ? 'var(--clss-ink-900)' : 'var(--clss-paper)',
                      color: depthOpen ? 'var(--clss-paper)' : 'var(--clss-ink-500)',
                      borderRadius: 999,
                      width: 20,
                      height: 20,
                      fontSize: '0.68rem',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      lineHeight: 1,
                      alignSelf: 'center',
                    }}
                  >
                    i
                  </button>
                </>
              }
            />
            <AnimatePresence initial={false}>
              {depthOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 32 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div
                    style={{
                      margin: '2px 0 12px',
                      padding: '12px 14px',
                      background: 'var(--clss-canvas)',
                      borderRadius: 'var(--clss-radius-sm)',
                      fontSize: '0.9rem',
                      lineHeight: 1.65,
                      color: 'var(--clss-ink-700)',
                    }}
                  >
                    <span style={{ ...whisper, display: 'block', marginBottom: 6 }}>
                      how we got here
                    </span>
                    {a}x = {fmt(k)} says {a} copies of x together make {fmt(k)}. splitting {fmt(k)}{' '}
                    into {a} equal shares leaves one x on its own — division is multiplication run
                    backwards. with your numbers: x = {fmt(k)}/{a}
                    {Number.isInteger(k / a)
                      ? ` = ${fmt(k / a)}`
                      : ` (not a whole number — still a perfectly good x)`}
                    .
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div
              style={{
                height: 1,
                transform: 'scaleY(0.5)',
                background: 'var(--clss-hairline-on-paper)',
              }}
            />
          </>
        )}
        <StepRow
          move={a === 1 && b !== 0 ? 'x is already alone' : 'the answer, live'}
          math={
            <>
              <span>x</span>
              <span>=</span>
              <Live>{solved}</Live>
            </>
          }
        />
      </div>

      {freePlay && (
        <div style={{ ...whisper, textAlign: 'center' }}>
          no task here — bend the equation until it makes sense. Vidya is watching the numbers.
        </div>
      )}
    </CardBody>
  );
}
