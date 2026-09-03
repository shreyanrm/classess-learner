/**
 * The lesson Wobo draws: the proof has to be a proof, and it has to be drawable.
 *
 * These assert the shape of the ported data rather than its beauty — that the timing windows run
 * forward, cover the whole draw, and hand over in the order a person would build the argument in.
 */

import { describe, expect, it } from 'bun:test';
import { LESSON } from './lesson';

const windows = LESSON.map((mark) => ({ s: Number(mark.s), e: Number(mark.e) }));

describe('the proof', () => {
  it('has every mark the prototype drew', () => {
    expect(LESSON).toHaveLength(16);
  });

  it('gives every mark a window that runs forward, inside the draw', () => {
    for (const w of windows) {
      expect(w.s).toBeGreaterThanOrEqual(0);
      expect(w.e).toBeLessThanOrEqual(1);
      expect(w.e).toBeGreaterThan(w.s);
    }
  });

  it('draws its marks in order, with no gap the eye could read as a pause', () => {
    // The marks overlap or hand straight over: the pen never lifts for long, which is what makes
    // the board read as one continuous hand rather than sixteen separate animations. One percent of
    // the draw is the widest gap in the owner's own timing, between the law and its substitution.
    for (let i = 1; i < windows.length; i++) {
      const prev = windows[i - 1];
      const here = windows[i];
      if (!prev || !here) throw new Error('missing window');
      expect(here.s).toBeGreaterThanOrEqual(prev.s);
      expect(here.s).toBeLessThanOrEqual(prev.e + 0.011);
    }
  });

  it('starts with the triangle and ends on the learner’s own line', () => {
    const first = LESSON[0];
    const last = LESSON[LESSON.length - 1];
    expect(first?.kind).toBe('path');
    expect(last).toMatchObject({ kind: 'text', tone: 'rose', text: "oh. that's why." });
    expect(Number(last?.e)).toBe(1);
  });

  it('names the law before it substitutes numbers into it', () => {
    const law = LESSON.findIndex((m) => m.kind === 'text' && m.text === 'a² + b² = c²');
    const numbers = LESSON.findIndex((m) => m.kind === 'text' && m.text === '4² + 3² = c²');
    const answer = LESSON.findIndex((m) => m.kind === 'text' && m.text === 'so c = 5');
    expect(law).toBeGreaterThan(-1);
    expect(law).toBeLessThan(numbers);
    expect(numbers).toBeLessThan(answer);
  });

  it('gives every path a `d` and every word a position', () => {
    for (const mark of LESSON) {
      if (mark.kind === 'path') expect(mark.d.length).toBeGreaterThan(4);
      else {
        expect(mark.text.length).toBeGreaterThan(0);
        expect(Number.isFinite(mark.x)).toBe(true);
        expect(Number.isFinite(mark.y)).toBe(true);
        expect(mark.size).toBeGreaterThan(0);
      }
    }
  });

  it('uses coral exactly once, on the learner’s own moment', () => {
    expect(LESSON.filter((m) => m.tone === 'rose')).toHaveLength(1);
  });
});
