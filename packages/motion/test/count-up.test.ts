import { describe, expect, it } from 'bun:test';
import { countUpValue, formatNumber } from '../src/internal/count-up';

describe('countUpValue', () => {
  it('returns the endpoints at t=0 and t=1', () => {
    expect(countUpValue(0, 100, 0)).toBe(0);
    expect(countUpValue(0, 100, 1)).toBe(100);
  });

  it('interpolates linearly at the midpoint', () => {
    expect(countUpValue(0, 100, 0.5)).toBe(50);
    expect(countUpValue(20, 40, 0.5)).toBe(30);
  });

  it('clamps progress outside [0,1]', () => {
    expect(countUpValue(0, 100, 2)).toBe(100);
    expect(countUpValue(0, 100, -1)).toBe(0);
  });

  it('counts downward when to < from', () => {
    expect(countUpValue(10, 0, 0.5)).toBe(5);
  });

  it('rounds to the requested decimals', () => {
    expect(countUpValue(0, 1, 1 / 3, 2)).toBe(0.33);
    expect(countUpValue(0, 1, 1 / 3, 0)).toBe(0);
  });

  it('is monotonic non-decreasing for increasing t when to > from', () => {
    let prev = countUpValue(0, 100, 0, 2);
    for (let i = 1; i <= 10; i++) {
      const next = countUpValue(0, 100, i / 10, 2);
      expect(next).toBeGreaterThanOrEqual(prev);
      prev = next;
    }
  });
});

describe('formatNumber', () => {
  it('applies fixed decimals', () => {
    expect(formatNumber(1234.5, { decimals: 1 })).toBe('1234.5');
    expect(formatNumber(7, { decimals: 0 })).toBe('7');
  });

  it('applies prefix and suffix', () => {
    expect(formatNumber(42, { decimals: 0, prefix: '$', suffix: '%' })).toBe('$42%');
  });

  it('groups with a locale', () => {
    expect(formatNumber(1234, { decimals: 0, locale: 'en-US' })).toBe('1,234');
  });

  it('guards non-finite input', () => {
    expect(formatNumber(Number.NaN, { decimals: 0 })).toBe('0');
    expect(formatNumber(Number.POSITIVE_INFINITY, { decimals: 0 })).toBe('0');
  });
});
