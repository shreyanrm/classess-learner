import { describe, expect, it } from 'bun:test';
import { leanInLine, shouldLeanIn, THRESHOLDS, trailingMisses } from './leanin';

const quiet = {
  misses: 0,
  lastInputAt: 0,
  lastOfferAt: 0,
  speaking: false,
  typing: false,
  engaged: false,
};

describe('when she leans in', () => {
  it('offers after three wrong actions on the balanced dial', () => {
    expect(shouldLeanIn({ ...quiet, misses: 2, lastInputAt: 1000 }, 1000, 'balanced')).toBeNull();
    expect(shouldLeanIn({ ...quiet, misses: 3, lastInputAt: 1000 }, 1000, 'balanced')).toBe(
      'misses',
    );
  });

  it('offers after forty quiet seconds', () => {
    expect(shouldLeanIn({ ...quiet, lastInputAt: 0 }, 39_000, 'balanced')).toBeNull();
    expect(shouldLeanIn({ ...quiet, lastInputAt: 0 }, 40_000, 'balanced')).toBe('idle');
  });

  it('is sooner on the proactive dial and never on the quiet one', () => {
    expect(shouldLeanIn({ ...quiet, misses: 2, lastInputAt: 1 }, 1, 'proactive')).toBe('misses');
    expect(shouldLeanIn({ ...quiet, misses: 99, lastInputAt: 0 }, 10_000_000, 'quiet')).toBeNull();
    expect(THRESHOLDS.quiet.misses).toBe(Number.POSITIVE_INFINITY);
  });

  it('never talks over herself, never interrupts typing, never doubles up on an open drawer', () => {
    const ready = { ...quiet, misses: 9, lastInputAt: 0 };
    expect(shouldLeanIn({ ...ready, speaking: true }, 100_000, 'balanced')).toBeNull();
    expect(shouldLeanIn({ ...ready, typing: true }, 100_000, 'balanced')).toBeNull();
    expect(shouldLeanIn({ ...ready, engaged: true }, 100_000, 'balanced')).toBeNull();
    expect(shouldLeanIn(ready, 100_000, 'balanced')).toBe('misses');
  });

  it('does not nag — one offer, then a long cooldown', () => {
    const after = { ...quiet, misses: 5, lastInputAt: 0, lastOfferAt: 100_000 };
    expect(shouldLeanIn(after, 150_000, 'balanced')).toBeNull();
    expect(shouldLeanIn(after, 100_000 + THRESHOLDS.balanced.cooldownMs, 'balanced')).toBe(
      'misses',
    );
  });
});

describe('wrong actions in a row, off the event backbone', () => {
  const wrong = { payload: { correct: false } };
  const right = { payload: { correct: true } };
  const other = { payload: { assistance_level: 'coach' } };

  it('counts the run since the last correct answer', () => {
    expect(trailingMisses([right, wrong, wrong, wrong])).toBe(3);
  });
  it('is cleared by a correct answer', () => {
    expect(trailingMisses([wrong, wrong, right])).toBe(0);
  });
  it('ignores events that are not answers at all', () => {
    expect(trailingMisses([right, wrong, other, wrong])).toBe(2);
  });
  it('is zero on an empty log', () => {
    expect(trailingMisses([])).toBe(0);
  });
});

describe('what she says when she leans in', () => {
  it('offers, never nags, and never shouts', () => {
    for (const line of [
      leanInLine('misses', 'Linear equations'),
      leanInLine('idle'),
      leanInLine('idle', 'Atoms'),
    ]) {
      expect(line).not.toMatch(/!/);
      expect(line).toMatch(/\?$/);
      expect(line).toBe(line.toLowerCase().replace(/^./, line[0] as string));
    }
  });
});
