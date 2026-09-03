'use client';

/**
 * When the reader last did anything, for Wobo's idle life.
 *
 * The rig runs a real idle clock: a glance at four seconds, bored at twelve, a yawn at twenty,
 * dozing at thirty-five (`packages/wobo/src/body/idle.ts`). It counts pointer input on Wobo and
 * whatever the surface tells it through `idleSince`, and a marketing page is the one place where
 * that default is wrong: reading a long page IS attention, and the proof pass caught the result —
 * Wobo asleep beside "Begin tonight", at the last door on the page.
 *
 * So the page counts scrolling, typing and any pointer movement as input, and tells the rig. The
 * value is coarse on purpose (it only moves every `MIN_GAP_MS`), because it is a React state and
 * a per-event render would cost more than the whole idle system does.
 */

import { useEffect, useState } from 'react';

/** The smallest gap between two updates, in ms. Well under the rig's four-second first glance. */
export const MIN_GAP_MS = 1500;

/** Whether enough time has passed since the last report to be worth another render. */
export function shouldReport(now: number, last: number, gap = MIN_GAP_MS): boolean {
  return now - last >= gap;
}

/**
 * Epoch ms of the reader's last input, refreshed at most every `MIN_GAP_MS`. Hand it to a
 * `WoboBody` as `idleSince` and Wobo stays awake for as long as someone is reading.
 */
export function useLastInput(): number {
  const [at, setAt] = useState(() => Date.now());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let last = Date.now();
    const touch = () => {
      const now = Date.now();
      if (!shouldReport(now, last)) return;
      last = now;
      setAt(now);
    };
    const options = { passive: true } as const;
    window.addEventListener('scroll', touch, options);
    window.addEventListener('pointermove', touch, options);
    window.addEventListener('keydown', touch, options);
    return () => {
      window.removeEventListener('scroll', touch);
      window.removeEventListener('pointermove', touch);
      window.removeEventListener('keydown', touch);
    };
  }, []);

  return at;
}
