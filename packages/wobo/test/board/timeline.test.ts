import { describe, expect, it } from 'bun:test';
import type { BoardObject } from '../../src/board/schema';
import { BoardStore } from '../../src/board/store';
import { boardAt, timelineMarks, timelineRange, visibleAt } from '../../src/board/timeline';

function clocked() {
  let t = 1000;
  const store = new BoardStore({ presentation: 'plane', clock: () => t });
  return { store, tick: (ms: number) => (t += ms) };
}

const circle = (id: string): BoardObject => ({ id, kind: 'circle', anchor: { target: 'btn' } });

describe('a board has a history to scrub', () => {
  it('marks every moment, with what it was', () => {
    const { store } = clocked();
    store.applyEvent({ type: 'say', text: 'the two small squares fill the big one' });
    store.applyEvent({ type: 'ink', object: circle('sq') });
    store.applyEvent({ type: 'ask', prompt: 'which is bigger?' });
    store.applyEvent({ type: 'done' });
    const marks = timelineMarks(store);
    expect(marks.map((m) => m.kind)).toEqual(['say', 'ink', 'ask', 'done']);
    expect(marks[1]?.label).toBe('sq');
  });

  it('spans from the first stroke to the last', () => {
    const { store } = clocked();
    store.beginUtterance();
    store.ink({ ...circle('a'), t: { start: 0, dur: 400 } });
    store.ink({ ...circle('b'), t: { start: 2000, dur: 600 } });
    const range = timelineRange(store);
    expect(range.from).toBe(1000);
    expect(range.to).toBe(3600);
  });

  it('an empty board is a point, not a negative span', () => {
    const { store } = clocked();
    const range = timelineRange(store);
    expect(range.to).toBe(range.from);
  });

  it('answers what was on the board at a moment', () => {
    const { store } = clocked();
    store.beginUtterance();
    store.ink({ ...circle('a'), t: { start: 0, dur: 200 } });
    store.ink({ ...circle('b'), t: { start: 1000, dur: 200 } });
    expect(boardAt(store, 999)).toHaveLength(0); // before the pen touched down
    expect(boardAt(store, 1500).map((o) => o.id)).toEqual(['a']);
    expect(boardAt(store, 3500).map((o) => o.id)).toEqual(['a', 'b']);
  });

  it('ink that has faded is off the board, and ink with no ttl stays', () => {
    const { store } = clocked();
    store.beginUtterance();
    store.ink({ ...circle('a'), t: { start: 0, dur: 100, ttl: 500 } });
    const a = store.get('a');
    if (!a) throw new Error('missing');
    expect(visibleAt(a, 1500)).toBe(true);
    expect(visibleAt(a, 3000)).toBe(false);

    store.ink({ ...circle('b'), t: { start: 0, dur: 100 } });
    const b = store.get('b');
    if (!b) throw new Error('missing');
    expect(visibleAt(b, 900_000)).toBe(true);
  });
});
