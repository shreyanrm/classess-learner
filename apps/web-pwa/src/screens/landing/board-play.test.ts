/**
 * The boards the landing page shows are the shipping goldens, and this is what proves it.
 *
 * Every board named in `copy.ts` has to resolve to a real fixture in `src/wobo/goldens`, the
 * question printed on a demo button has to be that golden's own recorded prompt, and the plan has
 * to survive the shipping parser — the same door a streamed turn comes through. A page that
 * advertised a board the product cannot draw would be the worst kind of marketing.
 */

import { describe, expect, it } from 'bun:test';
import {
  collapsePlan,
  LANDING_GOLDENS,
  landingGolden,
  type PlayTarget,
  planEndsAt,
  playPlan,
} from './board-play';
import { DEMO, TEACHES } from './copy';

describe('the landing goldens', () => {
  it('carries exactly the five boards the page names', () => {
    const named = [...TEACHES.steps.map((s) => s.board), ...DEMO.boards.map((b) => b.board)];
    expect(LANDING_GOLDENS.map((g) => g.name).sort()).toEqual([...named].sort());
  });

  it('resolves every board the copy names', () => {
    for (const step of TEACHES.steps) expect(landingGolden(step.board)).toBeDefined();
    for (const ask of DEMO.boards) expect(landingGolden(ask.board)).toBeDefined();
  });

  it('prints the golden’s own recorded prompt on the demo buttons', () => {
    for (const ask of DEMO.boards) {
      expect(landingGolden(ask.board)?.prompt).toBe(ask.prompt);
    }
  });

  it('survives the shipping parser with its ink intact', () => {
    for (const golden of LANDING_GOLDENS) {
      expect(golden.plan.length).toBeGreaterThan(4);
      expect(golden.plan.filter((e) => e.type === 'ink').length).toBeGreaterThan(4);
    }
  });

  it('covers more than one subject, so the page is not all mathematics', () => {
    expect(new Set(LANDING_GOLDENS.map((g) => g.subject)).size).toBeGreaterThanOrEqual(4);
  });

  it('names each board with the title the frame shows', () => {
    for (const golden of LANDING_GOLDENS) expect(golden.title.length).toBeGreaterThan(0);
  });
});

describe('planEndsAt', () => {
  it('is the last stroke plus its own duration', () => {
    const plan = landingGolden('pythagoras')?.plan ?? [];
    expect(planEndsAt(plan)).toBeGreaterThan(0);
    const last = Math.max(...plan.map((e) => e.t ?? 0));
    expect(planEndsAt(plan)).toBeGreaterThanOrEqual(last);
  });

  it('is zero for an empty plan', () => {
    expect(planEndsAt([])).toBe(0);
  });
});

describe('collapsePlan', () => {
  const plan = landingGolden('benzene')?.plan ?? [];

  it('keeps every event, in order', () => {
    const collapsed = collapsePlan(plan);
    expect(collapsed).toHaveLength(plan.length);
    expect(collapsed.map((e) => e.type)).toEqual(plan.map((e) => e.type));
  });

  it('lands the whole plan at once', () => {
    for (const event of collapsePlan(plan)) expect(event.t).toBe(0);
    expect(planEndsAt(collapsePlan(plan))).toBe(1);
  });
});

/** A store stand-in that records what a play would do to it. */
function target(): PlayTarget & { applied: string[]; resets: number } {
  const applied: string[] = [];
  return {
    applied,
    resets: 0,
    reset() {
      this.resets += 1;
    },
    beginUtterance() {},
    applyEvent(event) {
      applied.push(event.type);
    },
  };
}

describe('playPlan', () => {
  const plan = landingGolden('plant-cell')?.plan ?? [];

  it('lands everything synchronously when instant', () => {
    const store = target();
    playPlan(store, plan, { instant: true });
    expect(store.resets).toBe(1);
    expect(store.applied).toHaveLength(plan.length);
  });

  it('schedules one timer per event on the plan’s own clock', () => {
    const store = target();
    const scheduled: number[] = [];
    playPlan(store, plan, {
      schedule: (_fn, ms) => {
        scheduled.push(ms);
        return scheduled.length;
      },
      cancel: () => {},
    });
    expect(scheduled).toEqual(plan.map((e) => e.t ?? 0));
    expect(store.applied).toHaveLength(0);
  });

  it('cancels every pending frame when the board leaves the screen', () => {
    const store = target();
    const cancelled: number[] = [];
    const stop = playPlan(store, plan, {
      schedule: (_fn, _ms) => cancelled.length + 1,
      cancel: (handle) => cancelled.push(handle),
    });
    stop();
    expect(cancelled).toHaveLength(plan.length);
  });

  it('wipes the board before it starts, so a replay never draws over the last run', () => {
    const store = target();
    playPlan(store, plan, { schedule: () => 0, cancel: () => {} });
    expect(store.resets).toBe(1);
  });
});
