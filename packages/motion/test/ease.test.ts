import { describe, expect, it } from 'bun:test';
import { parseCubicBezier } from '../src/internal/ease';

describe('parseCubicBezier', () => {
  it('parses a 4-tuple from a cubic-bezier string', () => {
    expect(parseCubicBezier('cubic-bezier(0.2, 0, 0, 1)')).toEqual([0.2, 0, 0, 1]);
  });

  it('keeps overshoot control points (emphasized easing)', () => {
    expect(parseCubicBezier('cubic-bezier(0.2, 0, 0, 1.1)')).toEqual([0.2, 0, 0, 1.1]);
  });

  it('rejects a non-cubic-bezier easing', () => {
    expect(() => parseCubicBezier('linear')).toThrow();
    expect(() => parseCubicBezier('ease-in-out')).toThrow();
  });

  it('rejects a malformed cubic-bezier', () => {
    expect(() => parseCubicBezier('cubic-bezier(0.2, 0, 1)')).toThrow();
    expect(() => parseCubicBezier('cubic-bezier(a, b, c, d)')).toThrow();
  });
});
