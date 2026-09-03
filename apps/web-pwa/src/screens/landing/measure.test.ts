/**
 * How big to draw a Wobo the layout sizes in percentages.
 */

import { describe, expect, it } from 'bun:test';
import { woboSize } from './measure';

describe('woboSize', () => {
  it('takes its share of the box', () => {
    expect(woboSize(400, 0.5, 300)).toBe(200);
  });

  it('never grows past the cap the composition set', () => {
    expect(woboSize(2000, 1, 230)).toBe(230);
    expect(woboSize(2000, 1, 300)).toBe(300);
  });

  it('never shrinks below the floor where the eyes stop reading as eyes', () => {
    expect(woboSize(20, 1, 230, 88)).toBe(88);
    expect(woboSize(0, 1, 230, 88)).toBe(88);
  });

  it('returns the floor rather than a guess when the box has not been measured', () => {
    expect(woboSize(Number.NaN, 1, 230, 88)).toBe(88);
    expect(woboSize(-10, 1, 230, 88)).toBe(88);
  });

  it('returns a whole number of pixels — a rig on a half pixel is a blurred rig', () => {
    expect(Number.isInteger(woboSize(333, 0.34, 230))).toBe(true);
  });
});
