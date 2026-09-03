/**
 * The smaller motions' arithmetic: how far a button will reach, how far the depth layers drift,
 * how far a floating object travels for its declared depth.
 *
 * The magnet is the one with a real failure mode — a pull that does not fall to nothing at the
 * edge of its reach makes buttons jump as the pointer passes, which reads as a bug rather than as
 * an invitation.
 */

import { describe, expect, it } from 'bun:test';
import {
  BLINK_MIN_MS,
  BLINK_SPREAD_MS,
  blobDrift,
  floatDrift,
  GAZE_RANGE,
  GAZE_REACH,
  gazeOffset,
  gazeVector,
  MAGNET_PULL,
  MAGNET_RADIUS,
  magnetOffset,
  nextBlinkDelay,
} from './motion';

describe('magnetOffset', () => {
  it('does not reach past its radius', () => {
    expect(magnetOffset(MAGNET_RADIUS, 0, MAGNET_RADIUS)).toBeNull();
    expect(magnetOffset(400, 0, 400)).toBeNull();
  });

  it('falls to nothing at the edge of its reach, so nothing jumps', () => {
    const edge = magnetOffset(MAGNET_RADIUS - 0.001, 0, MAGNET_RADIUS - 0.001);
    expect(edge).not.toBeNull();
    expect(Math.hypot(edge?.x ?? 1, edge?.y ?? 1)).toBeLessThan(0.001);
  });

  it('pulls hardest under the pointer and never past the pull', () => {
    const close = magnetOffset(1, 0, 1);
    expect(close?.x).toBeCloseTo((1 - 1 / MAGNET_RADIUS) * MAGNET_PULL);
    expect(Math.abs(close?.x ?? 0)).toBeLessThanOrEqual(MAGNET_PULL);
  });

  it('pulls along the line to the pointer', () => {
    expect(magnetOffset(60, 0, 60)).toEqual({ x: 5, y: 0 });
    expect(magnetOffset(0, -60, 60)).toEqual({ x: 0, y: -5 });
  });
});

describe('blobDrift', () => {
  it('moves each layer one step further than the one behind it', () => {
    expect(blobDrift(0)).toBe(-120);
    expect(blobDrift(1)).toBe(-240);
    expect(blobDrift(3)).toBe(-480);
  });
});

describe('floatDrift', () => {
  it('travels with depth, upward', () => {
    expect(floatDrift(0.06)).toBeCloseTo(-43.2);
    expect(floatDrift(0.1)).toBeCloseTo(-72);
    expect(Math.abs(floatDrift(0))).toBe(0);
  });

  it('moves a nearer object further than a further one', () => {
    expect(Math.abs(floatDrift(0.1))).toBeGreaterThan(Math.abs(floatDrift(0.04)));
  });
});

describe('gazeOffset', () => {
  it('never rides an eye further than it can go', () => {
    for (const d of [1, 60, GAZE_RANGE, GAZE_RANGE * 12]) {
      const { x, y } = gazeOffset(d, 0, d);
      expect(Math.hypot(x, y)).toBeLessThanOrEqual(GAZE_REACH + 1e-9);
    }
  });

  it('reaches further as the pointer moves away, up to its range', () => {
    const near = gazeOffset(50, 0, 50).x;
    const far = gazeOffset(GAZE_RANGE, 0, GAZE_RANGE).x;
    expect(near).toBeLessThan(far);
    expect(far).toBeCloseTo(GAZE_REACH);
    expect(gazeOffset(GAZE_RANGE * 4, 0, GAZE_RANGE * 4).x).toBeCloseTo(GAZE_REACH);
  });

  it('looks along the line to the pointer', () => {
    expect(gazeOffset(0, -GAZE_RANGE, GAZE_RANGE)).toEqual({ x: 0, y: -GAZE_REACH });
  });

  it('reads a pointer sitting exactly on the face as straight ahead rather than as NaN', () => {
    const { x, y } = gazeOffset(0, 0, 0);
    expect(Number.isNaN(x)).toBe(false);
    expect(Number.isNaN(y)).toBe(false);
  });
});

describe('gazeVector', () => {
  it('is the same attention in the -1..1 the character rig takes', () => {
    for (const [dx, dy, d] of [
      [3, 4, 5],
      [-GAZE_RANGE, 0, GAZE_RANGE],
      [0, GAZE_RANGE * 9, GAZE_RANGE * 9],
    ] as const) {
      const { x, y } = gazeVector(dx, dy, d);
      expect(Math.abs(x)).toBeLessThanOrEqual(1);
      expect(Math.abs(y)).toBeLessThanOrEqual(1);
    }
    expect(gazeVector(GAZE_RANGE, 0, GAZE_RANGE)).toEqual({ x: 1, y: 0 });
  });
});

describe('nextBlinkDelay', () => {
  it('stays inside its rhythm however the die falls', () => {
    for (const r of [0, 0.5, 1, -3, 7, Number.NaN]) {
      const delay = nextBlinkDelay(r);
      expect(delay).toBeGreaterThanOrEqual(BLINK_MIN_MS);
      expect(delay).toBeLessThanOrEqual(BLINK_MIN_MS + BLINK_SPREAD_MS);
    }
  });

  it('is uneven, so the blink never reads as a metronome', () => {
    expect(nextBlinkDelay(0)).not.toBe(nextBlinkDelay(1));
  });
});
