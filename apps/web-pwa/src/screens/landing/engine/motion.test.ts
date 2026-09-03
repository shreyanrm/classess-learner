/**
 * The smaller motions' arithmetic: how far a button will reach, how far the depth layers drift,
 * how far a floating object travels for its declared depth.
 *
 * The magnet is the one with a real failure mode — a pull that does not fall to nothing at the
 * edge of its reach makes buttons jump as the pointer passes, which reads as a bug rather than as
 * an invitation.
 */

import { describe, expect, it } from 'bun:test';
import { blobDrift, floatDrift, MAGNET_PULL, MAGNET_RADIUS, magnetOffset } from './motion';

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
