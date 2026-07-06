'use client';

/**
 * Frosted bottom sheets — the two moments that float above the app. Frost (backdrop blur) is exactly
 * where the brand permits it: overlays only. The meter is calm and never alarming; the conversion offer
 * is aspirational, shown at a peak, easy to decline. Molten leads the upgrade (a colour we now use
 * where it earns attention). Reduced motion collapses the slide to a fade.
 */

import { accent, frost, hairline, ink, radius, space, typeScale, zIndex } from '@classess/config';
import { useReducedMotion } from '@classess/motion';
import { Button, ProgressBar } from '@classess/ui';
import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { meter, plans, superstarBenefits } from '../mock/appData';

const MOLTEN = accent.molten;

function BottomSheet({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: zIndex.modal - 1,
              background: 'rgba(10,10,11,0.28)',
            }}
          />
          <motion.section
            role="dialog"
            aria-label={label}
            aria-modal="true"
            initial={reduced ? { opacity: 0 } : { y: '100%' }}
            animate={reduced ? { opacity: 1 } : { y: 0 }}
            exit={reduced ? { opacity: 0 } : { y: '100%' }}
            transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: zIndex.modal,
              margin: '0 auto',
              maxWidth: 560,
              padding: space[3],
              paddingBottom: space[4],
              borderTopLeftRadius: radius.panel,
              borderTopRightRadius: radius.panel,
              border: `1px solid ${hairline.onPaper}`,
              borderBottom: 'none',
              background: frost.onPaper,
              backdropFilter: `blur(${frost.blur})`,
              WebkitBackdropFilter: `blur(${frost.blur})`,
            }}
          >
            <div
              aria-hidden
              style={{
                width: 40,
                height: 4,
                borderRadius: radius.jelly,
                background: ink[100],
                margin: `0 auto ${space[3]}px`,
              }}
            />
            {children}
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
}

export function MeterSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const left = meter.total - meter.used;
  const low = left <= 1;
  return (
    <BottomSheet open={open} onClose={onClose} label="Today's concept budget">
      <h2 style={{ margin: 0, fontSize: typeScale.h3.size, fontWeight: 600, color: ink[900] }}>
        Today's concepts
      </h2>
      <p
        style={{
          margin: `${space[1]}px 0 ${space[3]}px`,
          fontSize: typeScale.body.size,
          color: ink[500],
        }}
      >
        You can master {meter.total} concepts a day.{' '}
        {low ? 'One left — make it count.' : "You're on pace."}
      </p>
      <ProgressBar value={meter.used} max={meter.total} label="Concepts mastered today" />
      <p style={{ margin: `${space[2]}px 0 0`, fontSize: typeScale.caption.size, color: ink[500] }}>
        {left} of {meter.total} left · resets at midnight. Each concept you take to independent uses
        one.
      </p>
    </BottomSheet>
  );
}

export function ConversionSheet({
  open,
  onClose,
  onSeePlans,
}: {
  open: boolean;
  onClose: () => void;
  onSeePlans: () => void;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} label="Take this further">
      <span style={{ fontSize: typeScale.caption.size, color: MOLTEN, fontWeight: 600 }}>
        You're on a roll
      </span>
      <h2
        style={{
          margin: `${space.half}px 0 0`,
          fontSize: typeScale.h2.size,
          fontWeight: 600,
          color: ink[900],
        }}
      >
        Go as far as you want
      </h2>
      <ul
        style={{
          margin: `${space[3]}px 0`,
          padding: 0,
          listStyle: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: space[2],
        }}
      >
        {superstarBenefits.map((b) => (
          <li
            key={b}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: space[2],
              fontSize: typeScale.body.size,
              color: ink[900],
            }}
          >
            <span
              aria-hidden
              style={{
                width: 6,
                height: 6,
                borderRadius: radius.jelly,
                background: MOLTEN,
                flex: 'none',
              }}
            />
            {b}
          </li>
        ))}
      </ul>
      <p style={{ margin: `0 0 ${space[3]}px`, fontSize: typeScale.body.size, color: ink[700] }}>
        Classess Superstar · {plans.annual.price} · {plans.annual.note}.
      </p>
      <div style={{ display: 'flex', gap: space[2] }}>
        <Button variant="primary" size="lg" onClick={onSeePlans}>
          See plans
        </Button>
        <Button variant="ghost" size="lg" onClick={onClose}>
          Not now
        </Button>
      </div>
    </BottomSheet>
  );
}
