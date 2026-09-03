/**
 * The mind's day ledger — what the You screen's week is read off. Folded from the event log with
 * nothing estimated: a line to Wobo within ten minutes of a miss is help asked for, an answer after
 * that is keeping going, a lesson opened is a lesson opened.
 */

import { describe, expect, it } from 'bun:test';
import { addDwell, dayOf, foldEvents, type MindState, markSessionDay } from './mind';

function mind(): MindState {
  return { latenciesMs: [], slips: [], dwellSec: {}, sessionDays: [], interests: [], facts: [] };
}

let n = 0;
function ev(type: string, at: string, payload: Record<string, unknown> = {}) {
  n += 1;
  return { event_id: `e${n}`, event_type: type, occurred_at: at, payload } as never;
}

describe('the day ledger', () => {
  it('counts answers, misses, lines to Wobo, and lessons opened, by day', () => {
    const m = mind();
    const seen = new Set<string>();
    foldEvents(
      m,
      [
        ev('learn.node.entered.v1', '2026-09-01T10:00:00Z'),
        ev('practice.item.answered.v1', '2026-09-01T10:01:00Z', {
          item_id: 'a',
          correct: true,
          latency_ms: 900,
        }),
        ev('practice.item.answered.v1', '2026-09-01T10:02:00Z', {
          item_id: 'b',
          correct: false,
          latency_ms: 1200,
        }),
        ev('wobo.turn.user.v1', '2026-09-01T10:05:00Z'),
        ev('practice.item.answered.v1', '2026-09-01T10:06:00Z', {
          item_id: 'c',
          correct: true,
          latency_ms: 800,
        }),
        ev('wobo.turn.user.v1', '2026-09-02T09:00:00Z'),
      ],
      seen,
    );
    expect(dayOf(m, '2026-09-01')).toEqual({
      answered: 3,
      wrong: 1,
      asked: 1,
      helped: 1,
      kept: 1,
      entered: 1,
      seconds: 0,
      evening: false,
    });
    expect(dayOf(m, '2026-09-02').asked).toBe(1);
    expect(dayOf(m, '2026-09-02').helped).toBe(0);
  });

  it('counts a line long after a miss as a question, not as help', () => {
    const m = mind();
    foldEvents(
      m,
      [
        ev('practice.item.answered.v1', '2026-09-01T10:00:00Z', {
          item_id: 'a',
          correct: false,
          latency_ms: 500,
        }),
        ev('wobo.turn.user.v1', '2026-09-01T11:00:00Z'),
      ],
      new Set(),
    );
    expect(dayOf(m, '2026-09-01').helped).toBe(0);
    expect(dayOf(m, '2026-09-01').asked).toBe(1);
  });

  it('counts each event once, however many pulses see it', () => {
    const m = mind();
    const seen = new Set<string>();
    const line = ev('wobo.turn.user.v1', '2026-09-01T10:00:00Z');
    foldEvents(m, [line], seen);
    foldEvents(m, [line], seen);
    expect(dayOf(m, '2026-09-01').asked).toBe(1);
  });

  it('notes an evening session and the seconds a day held', () => {
    const m = mind();
    const evening = new Date();
    evening.setHours(19, 30, 0, 0);
    const today = evening.toISOString().slice(0, 10);
    expect(markSessionDay(m, evening)).toBe(true);
    expect(dayOf(m, today).evening).toBe(true);
    expect(markSessionDay(m, evening)).toBe(false);
    addDwell(m, 'course', 120);
    expect(dayOf(m, new Date().toISOString().slice(0, 10)).seconds).toBe(120);
  });
});
