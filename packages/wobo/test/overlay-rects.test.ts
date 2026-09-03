import { describe, expect, it } from 'bun:test';
import { rectLookup } from '../src/highlight-overlay';

const rect = (left: number): DOMRect =>
  ({ left, top: 0, width: 10, height: 4, right: left + 10, bottom: 4 }) as DOMRect;

function target(id: string, counter: { n: number }, throws = false) {
  return {
    id,
    getRect: () => {
      counter.n += 1;
      if (throws) throw new Error('detached');
      return rect(id.length);
    },
  };
}

describe('the overlay measures each target once per frame', () => {
  it('measures a target once no matter how many marks sit on it', () => {
    const calls = { n: 0 };
    const lookup = rectLookup([target('step-1', calls), target('step-2', calls)]);
    // a worked example accumulates a highlight, an annotation and a note on the same step
    expect(lookup('step-1')).toEqual(rect(6));
    expect(lookup('step-1')).toEqual(rect(6));
    expect(lookup('step-1')).toEqual(rect(6));
    expect(calls.n).toBe(1);
  });

  it('never measures targets no mark refers to', () => {
    const calls = { n: 0 };
    const targets = Array.from({ length: 50 }, (_, i) => target(`t-${i}`, calls));
    const lookup = rectLookup(targets);
    lookup('t-7');
    expect(calls.n).toBe(1);
  });

  it('returns null for an unregistered target, and caches that too', () => {
    const calls = { n: 0 };
    const lookup = rectLookup([target('known', calls)]);
    expect(lookup('gone')).toBeNull();
    expect(lookup('gone')).toBeNull();
    expect(calls.n).toBe(0);
  });

  it('survives a target that throws while being measured', () => {
    const calls = { n: 0 };
    const lookup = rectLookup([target('detached', calls, true)]);
    expect(lookup('detached')).toBeNull();
    expect(lookup('detached')).toBeNull();
    expect(calls.n).toBe(1);
  });

  it('is a fresh index per frame — a later registration is seen by the next lookup', () => {
    const calls = { n: 0 };
    const first = rectLookup([]);
    expect(first('late')).toBeNull();
    const second = rectLookup([target('late', calls)]);
    expect(second('late')).not.toBeNull();
  });
});
