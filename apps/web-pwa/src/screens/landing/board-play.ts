/**
 * Playing a golden board on the landing page.
 *
 * The five boards this page shows are the SHIPPING goldens from `src/wobo/goldens` — the same
 * bytes the hand's regression suite and the brain's own golden test read (`goldens/types.ts`).
 * They are imported read-only and played through the shipping parser and the shipping store, so
 * what a visitor watches here is the product drawing, not a recording of it. If a board would be
 * refused on the wire it is refused here too, in public.
 *
 * Timing is the plan's own. `collapsePlan` is the reduced-motion and screenshot path: every object
 * lands at once, in the same order, with no wait.
 */

import { type BoardEvent, parseBoardPlan } from '@wobo/wobo';
import benzene from '../../wobo/goldens/benzene.json';
import plantCell from '../../wobo/goldens/plant-cell.json';
import pythagoras from '../../wobo/goldens/pythagoras.json';
import circuit from '../../wobo/goldens/series-circuit.json';
import timeline from '../../wobo/goldens/timeline.json';

/** The shape the landing page needs from a golden — a subset of `GoldenBoard`. */
export interface LandingGolden {
  name: string;
  /** The learner's words, exactly as the golden recorded them. */
  prompt: string;
  /** The board's own name. */
  title: string;
  subject: string;
  plan: BoardEvent[];
}

const RAW = [pythagoras, circuit, plantCell, benzene, timeline] as unknown as {
  name: string;
  prompt: string;
  title: string;
  subject: string;
  plan: unknown[];
}[];

/**
 * The five, parsed. Exactly the boards named in `copy.ts` — three under "how Wobo teaches" and two
 * in the demo — and nothing else, so the landing chunk carries five fixtures rather than twelve.
 */
export const LANDING_GOLDENS: LandingGolden[] = RAW.map((board) => ({
  name: board.name,
  prompt: board.prompt,
  title: board.title,
  subject: board.subject,
  plan: parseBoardPlan(board.plan),
}));

export function landingGolden(name: string): LandingGolden | undefined {
  return LANDING_GOLDENS.find((b) => b.name === name);
}

/** The plan with every clock set to zero: same objects, same order, no waiting. */
export function collapsePlan(plan: readonly BoardEvent[]): BoardEvent[] {
  return plan.map((event) => {
    if (event.type !== 'ink') return { ...event, t: 0 };
    const object = event.object as Record<string, unknown>;
    return { ...event, t: 0, object: { ...object, t: { start: 0, dur: 1 } } } as BoardEvent;
  });
}

/** When the last stroke of a plan has settled, in ms from the start of the utterance. */
export function planEndsAt(plan: readonly BoardEvent[]): number {
  let end = 0;
  for (const event of plan) {
    const at = event.t ?? 0;
    const dur =
      event.type === 'ink'
        ? (((event.object as Record<string, unknown>).t as { dur?: number } | undefined)?.dur ??
          1200)
        : 0;
    end = Math.max(end, at + dur);
  }
  return end;
}

/** The store the surface reads. Kept structural so this module needs no React and no renderer. */
export interface PlayTarget {
  reset(): void;
  beginUtterance(): void;
  applyEvent(event: BoardEvent): void;
}

export interface PlayOptions {
  instant?: boolean;
  /** Seam for tests; defaults to the real timer. */
  schedule?: (fn: () => void, ms: number) => number;
  cancel?: (handle: number) => void;
}

/**
 * Play a plan into a store on its own timeline. Returns a cancel that clears every pending frame,
 * so a board that scrolls off screen mid-draw stops costing anything.
 */
export function playPlan(
  store: PlayTarget,
  plan: readonly BoardEvent[],
  options: PlayOptions = {},
): () => void {
  const schedule = options.schedule ?? ((fn, ms) => setTimeout(fn, ms) as unknown as number);
  const cancel = options.cancel ?? ((handle) => clearTimeout(handle));
  store.reset();
  store.beginUtterance();
  if (options.instant) {
    for (const event of collapsePlan(plan)) store.applyEvent(event);
    return () => {};
  }
  const handles: number[] = [];
  for (const event of plan) {
    handles.push(
      schedule(() => {
        store.applyEvent(event);
      }, event.t ?? 0),
    );
  }
  return () => {
    for (const handle of handles) cancel(handle);
  };
}
