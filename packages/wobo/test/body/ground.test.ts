/**
 * What holds Wobo down, checked as a rule rather than as a screenshot.
 *
 * The defect this exists for: at hero size the flat tonal contact patch reads as a drop shadow —
 * a soft grey ellipse, offset below a floating orb — in a product whose third design law is that it
 * has no shadows. `groundMark` is the line between the size where the patch is a contact patch and
 * the size where it is a shadow, and the sizes on either side of it are the real ones the app draws.
 */

import { describe, expect, it } from 'bun:test';
import { GROUND_GEOMETRY, GROUND_PATCH_MAX_SIZE, groundMark } from '../../src/body/ground';

describe('groundMark', () => {
  it('keeps the tonal patch at every size the app draws Wobo small at', () => {
    // The bench contact sheets (92), the bench's single rigs (112, 148), the app's inline Wobos.
    for (const size of [24, 44, 64, 92, 112, 148]) expect(groundMark(size)).toBe('patch');
  });

  it('grounds a hero-sized Wobo with a hairline instead', () => {
    // The landing hero draws Wobo at 210, which is where the proofs caught the shadow reading.
    for (const size of [180, 210, 320]) expect(groundMark(size)).toBe('hairline');
  });

  it('draws the line where it says it does, on both sides', () => {
    expect(groundMark(GROUND_PATCH_MAX_SIZE)).toBe('patch');
    expect(groundMark(GROUND_PATCH_MAX_SIZE + 0.5)).toBe('hairline');
  });

  it('falls back to the patch for a size that is not a number', () => {
    for (const size of [Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(groundMark(size)).toBe('patch');
    }
  });
});

describe('GROUND_GEOMETRY', () => {
  it('draws the hairline at the system rule weight, not at a shadow weight', () => {
    expect(GROUND_GEOMETRY.hairline.strokeWidth).toBe(0.5);
  });

  it('makes the hairline a rule under Wobo, narrower than Wobo is wide', () => {
    // HEAD.r is 42, so anything under that is a rule Wobo stands on rather than a plinth.
    expect(GROUND_GEOMETRY.hairline.halfWidth).toBeLessThan(42);
  });

  it('centres both marks on Wobo', () => {
    expect(GROUND_GEOMETRY.cx).toBe(75);
  });

  it('draws the hairline where the shell ends, not where the patch floats', () => {
    // HEAD.cy 66 + HEAD.r 42 = 108, the lowest ink of the shell. A rule read at the patch's own
    // height looked like an underline hanging clear of the thing above it.
    expect(GROUND_GEOMETRY.hairline.cy).toBeGreaterThanOrEqual(108);
    expect(GROUND_GEOMETRY.hairline.cy).toBeLessThan(GROUND_GEOMETRY.patch.cy);
  });

  it('keeps both marks tonal — neither is opaque, and neither is a second colour', () => {
    expect(GROUND_GEOMETRY.patch.opacity).toBeLessThan(0.5);
    expect(GROUND_GEOMETRY.hairline.opacity).toBeLessThan(0.5);
  });
});
