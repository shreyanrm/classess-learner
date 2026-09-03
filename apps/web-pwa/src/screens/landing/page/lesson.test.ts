/**
 * The lesson Wobo draws — that it is one proof, in one order, and that the timings leave no gap and
 * no stroke stranded.
 */

import { describe, expect, it } from 'bun:test';
import { amountAt, LESSON, strokeAt, strokeClass } from './lesson';

describe('the lesson', () => {
  it('draws the proof of Pythagoras from the triangle to the answer', () => {
    expect(LESSON[0]?.kind).toBe('path');
    const texts = LESSON.filter((s) => s.kind === 'text').map((s) => (s as { text: string }).text);
    expect(texts).toContain('a² + b² = c²');
    expect(texts).toContain('so c = 5');
    expect(texts.at(-1)).toBe("oh. that's why.");
  });

  it('checks the numbers before it states the answer', () => {
    const at = (text: string) =>
      LESSON.findIndex((s) => s.kind === 'text' && (s as { text: string }).text === text);
    expect(at('16 + 9 = 25')).toBeLessThan(at('so c = 5'));
    expect(at('4² + 3² = c²')).toBeLessThan(at('16 + 9 = 25'));
  });

  it('runs from the very start of the board to the very end', () => {
    expect(LESSON[0]?.s).toBeGreaterThan(0);
    expect(LESSON.at(-1)?.e).toBe(1);
  });

  it('moves forward, never back', () => {
    for (let i = 1; i < LESSON.length; i++) {
      const prev = LESSON[i - 1];
      const here = LESSON[i];
      if (!prev || !here) throw new Error('gap');
      expect(here.s).toBeGreaterThanOrEqual(prev.s);
      expect(here.e).toBeGreaterThan(here.s);
    }
  });

  it('lifts the pen between lines, but never parks it', () => {
    // The prototype leaves four one-hundredth gaps — after each written line, where the hand lifts
    // and the nib fades out before the next line begins. Anything longer would read as the page
    // having stopped, so the law is: a gap exists, and it is never more than a beat.
    const live = LESSON.map((s) => [s.s, s.e] as const);
    let gaps = 0;
    for (let i = 1; i < live.length; i++) {
      const prevEnd = Math.max(...live.slice(0, i).map(([, e]) => e));
      const start = live[i]?.[0] ?? 0;
      if (start > prevEnd) {
        gaps += 1;
        expect(start - prevEnd).toBeLessThanOrEqual(0.011);
      }
    }
    expect(gaps).toBe(4);
  });

  it('has drawn nothing at the start and everything at the end', () => {
    expect(strokeAt(0)).toBeNull();
    expect(strokeAt(1)).toBeNull();
    for (let i = 0; i < LESSON.length; i++) {
      expect(amountAt(i, 0)).toBe(0);
      expect(amountAt(i, 1)).toBe(1);
    }
  });

  it('clamps a stroke to 0..1 and grows monotonically through it', () => {
    let last = 0;
    for (let p = 0; p <= 1.0001; p += 0.02) {
      const k = amountAt(8, p);
      expect(k).toBeGreaterThanOrEqual(last - 1e-9);
      expect(k).toBeGreaterThanOrEqual(0);
      expect(k).toBeLessThanOrEqual(1);
      last = k;
    }
  });

  it('paints each stroke with the prototype’s own two class vocabularies', () => {
    expect(strokeClass({ kind: 'path', tone: 'ink', d: '', s: 0, e: 1 })).toBe('ink');
    expect(strokeClass({ kind: 'path', tone: 'thin', d: '', s: 0, e: 1 })).toBe('ink thin');
    expect(strokeClass({ kind: 'text', tone: 'ink', text: '', x: 0, y: 0, size: 1, s: 0, e: 1 })).toBe(
      'hw',
    );
    expect(strokeClass({ kind: 'text', tone: 'rose', text: '', x: 0, y: 0, size: 1, s: 0, e: 1 })).toBe(
      'hw rose',
    );
  });

  it('keeps the one hit of coral for the learner’s own line', () => {
    const rose = LESSON.filter((s) => s.tone === 'rose');
    expect(rose).toHaveLength(1);
    expect((rose[0] as { text: string }).text).toBe("oh. that's why.");
  });
});
