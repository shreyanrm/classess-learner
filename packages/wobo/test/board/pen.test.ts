import { describe, expect, it } from 'bun:test';
import {
  dashFor,
  fadeOpacity,
  fillStroke,
  linePath,
  MAX_STROKE_MS,
  MIN_STROKE_MS,
  objectProgress,
  penRng,
  penStroke,
  polylineLength,
  resample,
  ruledStroke,
  sequenceStrokes,
  smoothPath,
  strokeDurationMs,
  strokeProgress,
} from '../../src/board/pen';
import type { BoardPoint } from '../../src/board/schema';

const line: BoardPoint[] = [
  [0, 0],
  [100, 0],
];

describe('the pen is a hand, and a frozen one', () => {
  it('same identity in => byte-identical path out (no 60 fps shimmer)', () => {
    const a = penStroke(line, penRng('v1', 'arrow'));
    const b = penStroke(line, penRng('v1', 'arrow'));
    expect(a.d).toBe(b.d);
    expect(a.length).toBe(b.length);
  });

  it('a different object draws differently', () => {
    expect(penStroke(line, penRng('v1', 'arrow')).d).not.toBe(
      penStroke(line, penRng('v2', 'arrow')).d,
    );
  });

  it('anticipates before the stroke and overshoots past its end', () => {
    const stroke = penStroke(line, penRng('a', 'line'));
    // The drawn path is longer than the geometry it follows: the lead-in and the overshoot.
    expect(stroke.length).toBeGreaterThan(polylineLength(line));
    expect(stroke.d.startsWith('M ')).toBe(true);
  });

  it('a ruled stroke has no wobble at all — axes and fraction bars are drawn with an edge', () => {
    expect(ruledStroke(line).d).toBe('M 0 0 L 100 0');
    expect(ruledStroke(line).length).toBe(100);
  });

  it('wobble 0 keeps every sample on the true line', () => {
    const stroke = penStroke(line, penRng('a', 'line'), {
      wobble: 0,
      anticipation: 0,
      overshoot: 0,
    });
    expect(stroke.d).not.toContain('NaN');
    expect(Math.abs(stroke.length - 100)).toBeLessThan(0.01);
  });

  it('survives a degenerate stroke', () => {
    expect(penStroke([], penRng('x')).d).toBe('');
    expect(penStroke([[5, 5]], penRng('x')).length).toBeGreaterThan(0);
  });

  it('closes a shape without an overshoot tail', () => {
    const square: BoardPoint[] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];
    const stroke = penStroke(square, penRng('sq'), { closed: true });
    expect(stroke.length).toBeGreaterThan(38);
  });
});

describe('paths', () => {
  it('resamples to roughly even spacing', () => {
    expect(resample(line, 25)).toHaveLength(5);
    expect(resample(line, 0)).toEqual(line);
  });

  it('smooths through midpoints and never emits -0', () => {
    const d = smoothPath([
      [0, 0],
      [10, -0],
      [20, 0],
    ]);
    expect(d).not.toContain('-0');
    expect(d).toContain('Q');
  });

  it('a fill stroke closes itself and never draws on', () => {
    const s = fillStroke([
      [0, 0],
      [10, 0],
      [5, 8],
    ]);
    expect(s.fill).toBe(true);
    expect(s.length).toBe(0);
    expect(s.d.endsWith('Z')).toBe(true);
  });

  it('linePath keeps hard corners', () => {
    expect(linePath(line)).toBe('M 0 0 L 100 0');
  });
});

describe('timing', () => {
  it('a longer stroke takes longer, inside the pen’s bounds', () => {
    expect(strokeDurationMs(20)).toBe(MIN_STROKE_MS);
    expect(strokeDurationMs(100000)).toBe(MAX_STROKE_MS);
    expect(strokeDurationMs(500)).toBeGreaterThan(strokeDurationMs(200));
  });

  it('shares an object’s draw time in proportion to stroke length', () => {
    const slots = sequenceStrokes([
      { d: '', length: 30 },
      { d: '', length: 10 },
    ]);
    expect(slots[0]).toEqual({ from: 0, to: 0.75 });
    expect(slots[1]).toEqual({ from: 0.75, to: 1 });
  });

  it('falls back to equal shares when nothing has length', () => {
    const slots = sequenceStrokes([
      { d: '', length: 0 },
      { d: '', length: 0 },
    ]);
    expect(slots[0]?.to).toBeCloseTo(0.5, 6);
  });

  it('reduced motion lands the whole object at once, still in order', () => {
    expect(objectProgress(50, 100, 400, true)).toBe(0);
    expect(objectProgress(100, 100, 400, true)).toBe(1);
    expect(objectProgress(200, 100, 400, false)).toBeCloseTo(0.25, 6);
    expect(objectProgress(9999, 100, 0, false)).toBe(1);
  });

  it('a stroke starts only when its own slot opens', () => {
    const slot = { from: 0.5, to: 1 };
    expect(strokeProgress(0.25, slot)).toBe(0);
    expect(strokeProgress(0.75, slot)).toBeCloseTo(0.5, 6);
    expect(strokeProgress(1, slot)).toBe(1);
  });

  it('dashes reveal the path along its own length', () => {
    expect(dashFor(0).strokeDashoffset).toBe(1);
    expect(dashFor(1).strokeDashoffset).toBe(0);
    expect(dashFor(0.5).strokeDashoffset).toBeLessThan(0.5); // eased, the nib decelerates
  });

  it('ink with no ttl never fades; ink with one ramps out', () => {
    expect(fadeOpacity(10_000, undefined)).toBe(1);
    expect(fadeOpacity(0, 1000)).toBe(1);
    expect(fadeOpacity(1000, 1000)).toBe(0);
    expect(fadeOpacity(760, 1000, 480)).toBeCloseTo(0.5, 6);
  });
});
