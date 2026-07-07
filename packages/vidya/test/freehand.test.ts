import { describe, expect, it } from 'bun:test';
import {
  hashSeed,
  highlighterSwipe,
  inkRng,
  type Mark,
  markPath,
  noteRotation,
} from '../src/freehand';

const MARKS: Mark[] = ['underline', 'circle', 'arrow', 'bracket', 'check', 'crossOut', 'lookHere'];

describe('freehand — seeded, frozen ink', () => {
  it('same identity => byte-identical d (no 60fps shimmer)', () => {
    for (const m of MARKS) {
      const a = markPath(m, 120, 24, inkRng('t1', m, 'primary'));
      const b = markPath(m, 120, 24, inkRng('t1', m, 'primary'));
      expect(a).toBe(b);
      expect(a.length).toBeGreaterThan(0);
    }
  });

  it('different identity => different d (a real hand never repeats a stroke)', () => {
    for (const m of MARKS) {
      const a = markPath(m, 120, 24, inkRng('t1', m, 'primary'));
      const b = markPath(m, 120, 24, inkRng('t2', m, 'primary'));
      expect(a).not.toBe(b);
    }
    // level also perturbs the wobble
    expect(markPath('circle', 100, 40, inkRng('t1', 'circle', 'primary'))).not.toBe(
      markPath('circle', 100, 40, inkRng('t1', 'circle', 'secondary')),
    );
  });

  it('path is built to the rect (no fixed viewBox to stretch)', () => {
    const wide = markPath('underline', 400, 20, inkRng('x', 'underline', 'primary'));
    const narrow = markPath('underline', 40, 20, inkRng('x', 'underline', 'primary'));
    expect(wide).not.toBe(narrow); // width actually drives the geometry
  });

  it('hashSeed is stable and deterministic', () => {
    expect(hashSeed('a', 'b', 1)).toBe(hashSeed('a', 'b', 1));
    expect(hashSeed('a', 'b', 1)).not.toBe(hashSeed('a', 'b', 2));
  });

  it('swipe + rotation are seeded too', () => {
    expect(highlighterSwipe(200, 30, inkRng('s', 'highlight', 'primary'))).toBe(
      highlighterSwipe(200, 30, inkRng('s', 'highlight', 'primary')),
    );
    const r = noteRotation(inkRng('n', 'note', 'primary'));
    expect(Math.abs(r)).toBeLessThanOrEqual(3);
  });
});
