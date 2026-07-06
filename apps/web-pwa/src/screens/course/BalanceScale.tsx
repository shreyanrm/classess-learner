'use client';

/**
 * Guided discovery — the balance scale (DESIGN.md §9, the keystone grammar). x + 3 = 8 sits on a
 * real springy scale. The learner drags weights off the pans; the beam tips honestly (x weighs 5
 * underneath). The principle — whatever you do to one side, do to the other — appears only AFTER
 * the act: pose, struggle, reveal.
 */

import { useRegisterTarget, useVidyaBus } from '@classess/vidya';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { BarState } from './shared';
import { CardBody, cardTitle, lead, whisper } from './shared';

const STAGE_W = 540;
const STAGE_H = 224;
const BEAM_Y = 46;
const HALF = 196;
const PAN_W = 148;
const STRING = 64;
const X_WEIGHT = 5; // what x truly weighs — the scale never lies

const spring = { type: 'spring', stiffness: 150, damping: 14 } as const;
const rad = (deg: number) => (deg * Math.PI) / 180;

function UnitWeight({
  onRemove,
  removable,
  restore = false,
}: {
  onRemove: () => void;
  removable: boolean;
  restore?: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: restore ? 10 : -22, scale: 0.7 }}
      transition={{ type: 'spring', stiffness: 420, damping: 26 }}
      drag={removable && !restore}
      dragSnapToOrigin
      whileDrag={{ scale: 1.15, zIndex: 6 }}
      whileTap={{ scale: 0.94 }}
      onDragEnd={(_, info) => {
        if (removable && Math.hypot(info.offset.x, info.offset.y) > 52) onRemove();
      }}
      onTap={() => {
        if (removable || restore) onRemove();
      }}
      aria-label={restore ? 'put this weight back' : 'take this weight off'}
      style={{
        width: 28,
        height: 26,
        border: '0.5px solid var(--clss-hairline-on-paper-strong)',
        background: 'var(--clss-paper)',
        borderRadius: 'var(--clss-radius-sm)',
        display: 'grid',
        placeItems: 'center',
        fontSize: '0.7rem',
        fontWeight: 500,
        color: 'var(--clss-ink-700)',
        cursor: removable || restore ? 'grab' : 'default',
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      1
    </motion.div>
  );
}

function Pan({
  side,
  angle,
  children,
}: {
  side: -1 | 1;
  angle: number;
  children: React.ReactNode;
}) {
  const y = side * HALF * Math.sin(rad(angle));
  const x = -side * HALF * (1 - Math.cos(rad(angle)));
  return (
    <motion.div
      animate={{ x, y }}
      transition={spring}
      style={{
        position: 'absolute',
        top: BEAM_Y,
        left: STAGE_W / 2 + side * HALF - PAN_W / 2,
        width: PAN_W,
        height: STRING + 4,
      }}
    >
      {/* the string */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          width: 1,
          height: STRING,
          background: 'var(--clss-ink-300)',
        }}
      />
      {/* the plate */}
      <div
        style={{
          position: 'absolute',
          left: 8,
          right: 8,
          top: STRING,
          height: 2.5,
          background: 'var(--clss-ink-900)',
        }}
      />
      {/* weights rest on the plate, stacking upward */}
      <div
        style={{
          position: 'absolute',
          left: 6,
          right: 6,
          bottom: 4,
          display: 'flex',
          flexWrap: 'wrap-reverse',
          gap: 3,
          justifyContent: 'center',
          alignItems: 'flex-end',
        }}
      >
        {children}
      </div>
    </motion.div>
  );
}

export function BalanceScale({
  nodeId,
  setBar,
  onReveal,
  onDone,
}: {
  nodeId: string;
  setBar: (b: BarState | null) => void;
  onReveal: (struggles: number) => void;
  onDone: () => void;
}) {
  const bus = useVidyaBus();
  const stageRef = useRegisterTarget<HTMLDivElement>('course-scale', {
    kind: 'sim',
    label: 'the balance scale holding x + 3 = 8',
    meaning: 'left pan: x plus unit weights; right pan: unit weights; it tips when sides differ',
  });

  const [leftOn, setLeftOn] = useState<string[]>(['l1', 'l2', 'l3']);
  const [rightOn, setRightOn] = useState<string[]>([
    'r1',
    'r2',
    'r3',
    'r4',
    'r5',
    'r6',
    'r7',
    'r8',
  ]);
  const [hint, setHint] = useState(false);
  const struggles = useRef(0);
  const revealedRef = useRef(false);

  const leftWeight = X_WEIGHT + leftOn.length;
  const rightWeight = rightOn.length;
  const angle = Math.max(-10, Math.min(10, (rightWeight - leftWeight) * 3));
  const revealed = leftOn.length === 0 && rightOn.length === X_WEIGHT;

  // responsive stage: fixed geometry, scaled to fit
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / STAGE_W));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const remove = (side: 'l' | 'r', id: string) => {
    if (revealed) return;
    const set = side === 'l' ? setLeftOn : setRightOn;
    set((ids) => ids.filter((w) => w !== id));
    const nextLeft = X_WEIGHT + (side === 'l' ? leftOn.length - 1 : leftOn.length);
    const nextRight = side === 'r' ? rightOn.length - 1 : rightOn.length;
    if (Math.abs(nextRight - nextLeft) >= 2) {
      struggles.current += 1;
      if (struggles.current >= 2) setHint(true);
    }
  };
  const restore = (side: 'l' | 'r', id: string) => {
    if (revealed) return;
    const set = side === 'l' ? setLeftOn : setRightOn;
    set((ids) => [...ids, id]);
  };

  // she watches the pans at code level
  useEffect(() => {
    const tilt =
      angle === 0
        ? 'level'
        : angle > 0
          ? 'tipping right (right side heavier)'
          : 'tipping left (left side heavier)';
    bus.publishCanvas({
      nodeId,
      equation: 'x + 3 = 8',
      steps: [
        `left pan: x${leftOn.length > 0 ? ` and ${leftOn.length} unit weight${leftOn.length === 1 ? '' : 's'}` : ' alone'}`,
        `right pan: ${rightOn.length} unit weight${rightOn.length === 1 ? '' : 's'}`,
        `the scale is ${tilt}`,
        ...(revealed ? ['balanced with x alone — the learner has discovered x = 5'] : []),
      ],
      lastEditedAt: new Date().toISOString(),
    });
  }, [bus, nodeId, leftOn.length, rightOn.length, angle, revealed]);
  useEffect(() => () => bus.publishCanvas(undefined), [bus]);

  useEffect(() => {
    if (revealed && !revealedRef.current) {
      revealedRef.current = true;
      onReveal(struggles.current);
    }
  }, [revealed, onReveal]);

  useEffect(() => {
    setBar({ primary: { label: 'continue', onClick: onDone, disabled: !revealed } });
  }, [setBar, onDone, revealed]);

  const leftOff = ['l1', 'l2', 'l3'].filter((id) => !leftOn.includes(id));
  const rightOff = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8'].filter(
    (id) => !rightOn.includes(id),
  );

  return (
    <CardBody maxWidth={680}>
      <div style={whisper}>guided discovery</div>
      <div style={cardTitle}>get x alone</div>
      <div style={lead}>take weights off the pans — the scale must end level.</div>

      {/* the equation, morphing at the reveal */}
      <div style={{ textAlign: 'center', minHeight: 44, marginTop: 6 }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={revealed ? 'solved' : 'posed'}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            style={{
              fontSize: '1.7rem',
              fontWeight: 550,
              letterSpacing: '-0.01em',
              color: 'var(--clss-ink-900)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {revealed ? 'x = 5' : 'x + 3 = 8'}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* the scale */}
      <div ref={wrapRef} style={{ width: '100%' }}>
        <div
          ref={stageRef}
          style={{
            width: STAGE_W,
            height: STAGE_H * scale,
            margin: '0 auto',
            maxWidth: '100%',
          }}
        >
          <div
            style={{
              width: STAGE_W,
              height: STAGE_H,
              position: 'relative',
              transform: `scale(${scale})`,
              transformOrigin: 'top center',
              marginLeft: scale < 1 ? (STAGE_W * (scale - 1)) / 2 : 0,
            }}
          >
            {/* fulcrum */}
            <div
              style={{
                position: 'absolute',
                left: STAGE_W / 2 - 1,
                top: BEAM_Y + 2,
                width: 2,
                height: STAGE_H - BEAM_Y - 26,
                background: 'var(--clss-ink-300)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: STAGE_W / 2 - 56,
                top: STAGE_H - 24,
                width: 112,
                height: 2,
                background: 'var(--clss-ink-900)',
              }}
            />
            {/* beam */}
            <motion.div
              animate={{ rotate: angle }}
              transition={spring}
              style={{
                position: 'absolute',
                left: STAGE_W / 2 - HALF,
                top: BEAM_Y - 1.5,
                width: HALF * 2,
                height: 3,
                background: 'var(--clss-ink-900)',
                transformOrigin: 'center',
              }}
            />
            {/* pivot */}
            <div
              style={{
                position: 'absolute',
                left: STAGE_W / 2 - 4,
                top: BEAM_Y - 4,
                width: 8,
                height: 8,
                borderRadius: 999,
                background: 'var(--clss-ink-900)',
              }}
            />

            <Pan side={-1} angle={angle}>
              {/* x — the unknown; it cannot be taken off */}
              <motion.div
                layout
                transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                style={{
                  width: 40,
                  height: 32,
                  background: 'var(--clss-ink-900)',
                  color: 'var(--clss-paper)',
                  borderRadius: 'var(--clss-radius-sm)',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 550,
                  fontSize: '0.95rem',
                  userSelect: 'none',
                }}
              >
                x
              </motion.div>
              <AnimatePresence>
                {leftOn.map((id) => (
                  <UnitWeight key={id} removable={!revealed} onRemove={() => remove('l', id)} />
                ))}
              </AnimatePresence>
            </Pan>

            <Pan side={1} angle={angle}>
              <AnimatePresence>
                {rightOn.map((id) => (
                  <UnitWeight key={id} removable={!revealed} onRemove={() => remove('r', id)} />
                ))}
              </AnimatePresence>
            </Pan>
          </div>
        </div>
      </div>

      {/* the table — taken-off weights can go back */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          minHeight: 34,
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', gap: 5, minHeight: 26 }}>
          <AnimatePresence>
            {leftOff.map((id) => (
              <UnitWeight key={id} restore removable={false} onRemove={() => restore('l', id)} />
            ))}
          </AnimatePresence>
        </div>
        {(leftOff.length > 0 || rightOff.length > 0) && !revealed && (
          <div style={{ ...whisper, textAlign: 'center' }}>off the scale — tap to put back</div>
        )}
        <div style={{ display: 'flex', gap: 5, minHeight: 26 }}>
          <AnimatePresence>
            {rightOff.map((id) => (
              <UnitWeight key={id} restore removable={false} onRemove={() => restore('r', id)} />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* struggle → a quiet nudge; success → the principle, only after the act */}
      <div style={{ minHeight: 52, textAlign: 'center' }}>
        <AnimatePresence mode="wait">
          {revealed ? (
            <motion.div
              key="principle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.5, ease: [0.2, 0, 0, 1] }}
              style={{ fontSize: '1.08rem', color: 'var(--clss-ink-900)', lineHeight: 1.6 }}
            >
              whatever you do to one side, do to the other.
              <div style={{ ...lead, marginTop: 4 }}>
                you took 3 from both pans — that is all algebra ever asks.
              </div>
            </motion.div>
          ) : hint ? (
            <motion.div
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              style={{ color: 'var(--clss-ink-500)', fontSize: '0.9rem' }}
            >
              it tips when the sides stop matching.
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </CardBody>
  );
}
