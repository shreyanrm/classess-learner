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
  // Wave 7a added five on the owner's "more animation and behaviours" call, and `puff` came after
  // it, when the proofs showed `proud` holding Wobo six percent larger for as long as that face
  // was worn: scale is something Wobo DOES, not something a resting face is. The original fifteen
  // keep their order and their names, so nothing that named one of them has to change.
  it('has the twenty-one the owner approved, in order', () => {
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
      'wave',
      'penTap',
      'bounce',
      'perk',
      'drift',
      'puff',
    ]);
    expect(BEHAVIOUR_NAMES).toHaveLength(21);
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

  it('brings the pen out only where the pen is the point', () => {
    const withPen = BEHAVIOUR_NAMES.filter((n) => behaviourSpec(n).pen);
    expect(withPen).toEqual(['point', 'penTap']);
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
    // `shrink` parks Wobo on purpose, and `point` leaves Wobo turned to the board until released.
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

  it('taps the pen without leaving Wobo turned off-axis when the thought ends', () => {
    const end = sampleBehaviour('penTap', BEHAVIOURS.penTap.dur);
    expect(end.rot).toBeCloseTo(0, 6);
    expect(end.dy).toBeCloseTo(0, 6);
    // The tap is a real double beat, not a single dip.
    const first = sampleBehaviour('penTap', BEHAVIOURS.penTap.dur * 0.1);
    const second = sampleBehaviour('penTap', BEHAVIOURS.penTap.dur * 0.5);
    expect(first.dy as number).toBeLessThan(0);
    expect(second.dy as number).toBeLessThan(0);
  });

  it('bounces lighter than it hops — a tap is not a celebration', () => {
    const bounce = Math.min(
      ...Array.from({ length: 40 }, (_, i) => sampleBehaviour('bounce', i * 12).dy as number),
    );
    const hop = Math.min(
      ...Array.from({ length: 60 }, (_, i) => sampleBehaviour('hop', i * 12).dy as number),
    );
    expect(bounce).toBeLessThan(0);
    expect(bounce).toBeGreaterThan(hop);
    expect(BEHAVIOURS.bounce.dur).toBeLessThan(BEHAVIOURS.hop.dur);
  });

  it('perks up rather than recoiling, which is what parts it from a startle', () => {
    const perk = sampleBehaviour('perk', 120);
    expect(perk.dy as number).toBeLessThan(0);
    expect(perk.sy as number).toBeGreaterThan(1);
    expect(BEHAVIOURS.perk.dur).toBeLessThan(BEHAVIOURS.startle.dur);
  });

  it('waves on both sides of centre, which is what makes it a wave', () => {
    const track = Array.from(
      { length: 40 },
      (_, i) => sampleBehaviour('wave', (i * BEHAVIOURS.wave.dur) / 39).rot as number,
    );
    expect(Math.min(...track)).toBeLessThan(-5);
    expect(Math.max(...track)).toBeGreaterThan(5);
    expect(track.at(-1)).toBeCloseTo(0, 6);
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
