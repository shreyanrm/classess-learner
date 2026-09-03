import { describe, expect, it } from 'bun:test';
import {
  LEAN_REACH,
  LOOK_REACH,
  leanOffset,
  lookFalloff,
  lookOffset,
  rectCenter,
  resolveLookTarget,
  type TrackRect,
  trackPoint,
  trackRect,
} from './tracking';

const self: TrackRect = { x: 100, y: 100, width: 80, height: 80 }; // centre (140, 140)

describe('the gaze maths', () => {
  it('finds the middle of a rectangle', () => {
    expect(rectCenter(self)).toEqual({ x: 140, y: 140 });
  });

  it('looks straight ahead at its own centre', () => {
    expect(trackPoint(self, { x: 140, y: 140 })).toEqual({ x: 0, y: 0 });
    expect(lookOffset({ x: 0, y: 0 })).toEqual([0, 0]);
  });

  it('scales the falloff with her own size and never collapses to zero', () => {
    expect(lookFalloff(0)).toBe(180);
    expect(lookFalloff(40)).toBe(180);
    expect(lookFalloff(200)).toBe(600);
    expect(lookFalloff(Number.NaN)).toBe(180);
  });

  it('clamps to full deflection rather than letting her eyes leave her visor', () => {
    const far = trackPoint(self, { x: 100_000, y: -100_000 });
    expect(far).toEqual({ x: 1, y: -1 });
    expect(lookOffset(far)).toEqual([LOOK_REACH.x, -LOOK_REACH.y]);
    expect(lookOffset({ x: 4, y: -9 })).toEqual([LOOK_REACH.x, -LOOK_REACH.y]);
  });

  it('reads half a falloff away as half a look', () => {
    const f = lookFalloff(self.width); // 240
    const v = trackPoint(self, { x: 140 + f / 2, y: 140 });
    expect(v.x).toBeCloseTo(0.5, 10);
    expect(lookOffset(v)[0]).toBeCloseTo(LOOK_REACH.x / 2, 10);
  });

  it('looks at the middle of a focus region, not its corner', () => {
    const focus: TrackRect = { x: 340, y: 140, width: 100, height: 100 }; // centre (390, 190)
    const viaRect = trackRect(self, focus);
    const viaPoint = trackPoint(self, { x: 390, y: 190 });
    expect(viaRect).toEqual(viaPoint);
    expect(viaRect.x).toBeGreaterThan(0);
    expect(viaRect.y).toBeGreaterThan(0);
  });

  it('leans her head toward what she is looking at, within reach', () => {
    expect(leanOffset({ x: 1, y: 0 })).toBe(LEAN_REACH);
    expect(leanOffset({ x: -1, y: 0 })).toBe(-LEAN_REACH);
    expect(leanOffset({ x: 5, y: 0 })).toBe(LEAN_REACH);
    expect(leanOffset({ x: 0, y: 0 })).toBe(0);
  });
});

describe('what claims her gaze', () => {
  const focus: TrackRect = { x: 340, y: 140, width: 100, height: 100 };
  const pointer = { x: 20, y: 20 };

  it('puts the focus region above everything else', () => {
    const withFocus = resolveLookTarget({
      self,
      focus,
      gaze: { x: -1, y: -1 },
      pointer,
      glance: [9, 9],
      expressionLook: [3, 3],
    });
    expect(withFocus).toEqual(lookOffset(trackRect(self, focus)));
    expect(withFocus[0]).toBeGreaterThan(0);
  });

  it('falls back to a pinned gaze, then the pointer, then a glance, then the expression', () => {
    expect(resolveLookTarget({ self, gaze: { x: -1, y: 0 }, pointer, glance: [9, 9] })).toEqual([
      -LOOK_REACH.x,
      0,
    ]);
    expect(resolveLookTarget({ self, pointer, glance: [9, 9] })).toEqual(
      lookOffset(trackPoint(self, pointer)),
    );
    expect(resolveLookTarget({ self, glance: [9, 9], expressionLook: [3, 3] })).toEqual([9, 9]);
    expect(resolveLookTarget({ self, expressionLook: [3, 3] })).toEqual([3, 3]);
    expect(resolveLookTarget({ self })).toEqual([0, 0]);
  });

  it('reaches the pointer only when nothing is in focus', () => {
    const a = resolveLookTarget({ self, focus, pointer });
    const b = resolveLookTarget({ self, focus: null, pointer });
    expect(a).not.toEqual(b);
    expect(b).toEqual(lookOffset(trackPoint(self, pointer)));
  });
});
