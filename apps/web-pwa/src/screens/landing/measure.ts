'use client';

/**
 * How big to draw a Wobo that the layout sizes in percentages.
 *
 * The real rig (`WoboBody`) is sized in pixels — it has to be, because its hairline, its pen and
 * its spring geometry are all in rig units per pixel. The prototype sized three of its Wobos
 * fluidly instead (`min(230px, 34%)` in the hero, `min(300px, 70%)` in the close panel, 96px
 * dropping to 64 on a phone in the ask panel). This measures the box the composition gives Wobo and
 * hands the rig a number, so the rig can be the real one without the layout changing.
 *
 * One ResizeObserver per Wobo, and a render only when the rounded number actually changes — so a
 * drag-resize does not re-render the page on every frame.
 */

import { type RefObject, useEffect, useRef, useState } from 'react';

/**
 * The pixel size of a Wobo in a box `width` wide: the fluid share, capped, and never smaller than
 * the floor at which the eyes stop reading as eyes. Pure, so the caps are tested numbers.
 */
export function woboSize(width: number, share: number, cap: number, floor = 40): number {
  if (!Number.isFinite(width) || width <= 0) return floor;
  return Math.round(Math.max(floor, Math.min(cap, width * share)));
}

/** The width of an element, kept current across resizes. 0 until it has been measured. */
export function useBoxWidth<T extends Element>(ref: RefObject<T | null>): number {
  const [width, setWidth] = useState(0);
  // The last value WRITTEN, so the observer can skip a set that would not change the render. State
  // cannot be read inside the observer without making it a dependency and rebuilding it per change.
  const last = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = (w: number) => {
      const next = Math.round(w);
      if (next === last.current) return;
      last.current = next;
      setWidth(next);
    };
    read(el.getBoundingClientRect().width);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (entry) read(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return width;
}
