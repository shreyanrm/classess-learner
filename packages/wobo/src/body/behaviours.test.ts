import { describe, expect, it } from 'bun:test';
import {
  BEHAVIOUR_NAMES,
  BEHAVIOURS,
  behaviourSpec,
  isBehaviour,
  sampleBehaviour,
  sampleTrack,
} from './behaviours';
import { isExpression } from './expressions';

describe('the behaviour table', () => {
  it('has the fifteen the owner approved', () => {
    expect(BEHAVIOUR_NAMES).toEqual([
      'tap',
      'nod',
      'hop',
      'lean',
      'peek',
      'shrink',
      'grow',
      'wiggle',
      'yawn',
      'sigh',
      'shake',
      'point',
      'startle',
      'settle',
      'stretch',
    ]);
    expect(BEHAVIOUR_NAMES).toHaveLength(15);
  });

  it('gives every behaviour a positive duration and at least one track', () => {
    for (const name of BEHAVIOUR_NAMES) {
      const b = behaviourSpec(name);
      expect(b.dur).toBeGreaterThan(0);
      expect([b.sx, b.sy, b.rot, b.dx, b.dy].some((t) => t && t.length > 0)).toBe(true);
    }
  });

  it('names a real expression wherever a behaviour carries one', () => {
    for (const name of BEHAVIOUR_NAMES) {
      const e = behaviourSpec(name).expression;
      if (e) expect(isExpression(e)).toBe(true);
    }
  });

  it('parks only where parking is the point', () => {
    const holds = BEHAVIOUR_NAMES.filter((n) => behaviourSpec(n).hold);
    expect(holds).toEqual(['shrink']);
  });

  it('brings the pen out for pointing only', () => {
    const withPen = BEHAVIOUR_NAMES.filter((n) => behaviourSpec(n).pen);
    expect(withPen).toEqual(['point']);
  });

  it('recognises its own names and nothing else', () => {
    expect(isBehaviour('hop')).toBe(true);
    expect(isBehaviour('backflip')).toBe(false);
  });
});

describe('sampling a track', () => {
  it('has no opinion when the track is absent or empty', () => {
    expect(sampleTrack(undefined, 0.5)).toBeNull();
    expect(sampleTrack([], 0.5)).toBeNull();
  });

  it('holds a single-frame track flat', () => {
    expect(sampleTrack([0.6], 0)).toBe(0.6);
    expect(sampleTrack([0.6], 1)).toBe(0.6);
  });

  it('hits the first and last keyframes exactly', () => {
    expect(sampleTrack([2, 5, 9], 0)).toBe(2);
    expect(sampleTrack([2, 5, 9], 1)).toBe(9);
  });

  it('lands on interior keyframes exactly', () => {
    expect(sampleTrack([0, 10, 0], 0.5)).toBeCloseTo(10, 10);
    expect(sampleTrack([0, 4, 8, 12], 1 / 3)).toBeCloseTo(4, 10);
  });

  it('eases each segment rather than sliding linearly through it', () => {
    // a raised cosine puts the midpoint of a segment at the halfway value but not the quarter
    expect(sampleTrack([0, 10], 0.5)).toBeCloseTo(5, 10);
    expect(sampleTrack([0, 10], 0.25)).toBeLessThan(2.5);
    expect(sampleTrack([0, 10], 0.75)).toBeGreaterThan(7.5);
  });

  it('clamps progress outside 0..1', () => {
    expect(sampleTrack([2, 9], -3)).toBe(2);
    expect(sampleTrack([2, 9], 42)).toBe(9);
  });
});

describe('sampling a behaviour', () => {
  it('reports done only once the duration has run out', () => {
    expect(sampleBehaviour('hop', 0).done).toBe(false);
    expect(sampleBehaviour('hop', BEHAVIOURS.hop.dur - 1).done).toBe(false);
    expect(sampleBehaviour('hop', BEHAVIOURS.hop.dur).done).toBe(true);
    expect(sampleBehaviour('hop', BEHAVIOURS.hop.dur * 3).done).toBe(true);
  });

  it('returns null on channels the behaviour has no opinion about', () => {
    const s = sampleBehaviour('shake', 100);
    expect(s.dx).not.toBeNull();
    expect(s.sx).toBeNull();
    expect(s.sy).toBeNull();
    expect(s.rot).toBeNull();
  });

  it('returns every scale multiplier to 1 and every offset to 0 by the end', () => {
    // `shrink` parks her on purpose, and `point` leaves her turned to the board until released.
    for (const name of BEHAVIOUR_NAMES) {
      if (behaviourSpec(name).hold || name === 'point') continue;
      const s = sampleBehaviour(name, behaviourSpec(name).dur);
      if (s.sx !== null) expect(s.sx).toBeCloseTo(1, 6);
      if (s.sy !== null) expect(s.sy).toBeCloseTo(1, 6);
      if (s.rot !== null) expect(s.rot).toBeCloseTo(0, 6);
      if (s.dx !== null) expect(s.dx).toBeCloseTo(0, 6);
      if (s.dy !== null) expect(s.dy).toBeCloseTo(0, 6);
    }
  });

  it('leaves the point turned toward the board, pen out, until it is released', () => {
    const end = sampleBehaviour('point', BEHAVIOURS.point.dur);
    expect(end.rot).toBeCloseTo(6, 6);
    expect(end.dx).toBeCloseTo(4, 6);
    expect(behaviourSpec('point').pen).toBe(true);
    expect(behaviourSpec('point').hold).toBeUndefined();
  });

  it('hops up before it lands', () => {
    const rising = sampleBehaviour('hop', 60);
    expect(rising.dy).not.toBeNull();
    expect(rising.dy as number).toBeLessThan(0);
  });
});
