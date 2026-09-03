/**
 * The ink cursor's rules and arithmetic.
 *
 * Two things are being protected. First, the accessibility contract: the pen never takes over on a
 * touch device and never under reduced motion, so a learner who asked for less motion, or who has
 * no pointer at all, keeps the native behaviour. Second, the trail cannot grow without bound — it
 * is pruned by age every frame, and a point older than one life is gone.
 */

import { describe, expect, it } from 'bun:test';
import {
  inkCursorAllowed,
  paintTrail,
  pruneTrail,
  TRAIL_LIFE_MS,
  type TrailPoint,
  trailAlpha,
  trailWidth,
} from './cursor';

describe('inkCursorAllowed', () => {
  it('takes over only for a fine pointer with motion allowed', () => {
    expect(inkCursorAllowed({ coarse: false, reducedMotion: false })).toBe(true);
  });

  it('keeps the native cursor on a touch device', () => {
    expect(inkCursorAllowed({ coarse: true, reducedMotion: false })).toBe(false);
  });

  it('keeps the native cursor under reduced motion', () => {
    expect(inkCursorAllowed({ coarse: false, reducedMotion: true })).toBe(false);
  });

  it('keeps the native cursor when both apply', () => {
    expect(inkCursorAllowed({ coarse: true, reducedMotion: true })).toBe(false);
  });
});

describe('pruneTrail', () => {
  const points: TrailPoint[] = [
    { x: 0, y: 0, t: 0 },
    { x: 1, y: 1, t: 300 },
    { x: 2, y: 2, t: 900 },
  ];

  it('drops points older than one life', () => {
    expect(pruneTrail(points, 1000)).toEqual([{ x: 2, y: 2, t: 900 }]);
  });

  it('keeps everything that is still fresh', () => {
    expect(pruneTrail(points, 300)).toHaveLength(3);
  });

  it('empties completely once the pointer stops', () => {
    expect(pruneTrail(points, 10_000)).toEqual([]);
  });
});

describe('trailAlpha', () => {
  it('is full at the nib and nothing at the tail', () => {
    expect(trailAlpha(0)).toBe(1);
    expect(trailAlpha(TRAIL_LIFE_MS)).toBe(0);
    expect(trailAlpha(TRAIL_LIFE_MS * 2)).toBe(0);
  });

  it('falls monotonically', () => {
    let previous = 1.1;
    for (let age = 0; age <= TRAIL_LIFE_MS; age += 40) {
      const a = trailAlpha(age);
      expect(a).toBeLessThanOrEqual(previous);
      previous = a;
    }
  });
});

describe('trailWidth', () => {
  it('tapers to a hairline but never to nothing', () => {
    expect(trailWidth(0)).toBeGreaterThan(trailWidth(TRAIL_LIFE_MS / 2));
    expect(trailWidth(TRAIL_LIFE_MS)).toBeGreaterThan(0);
  });
});

/** A canvas context that records what it was asked to do. */
function recorder() {
  const calls: string[] = [];
  const ctx = {
    globalAlpha: 1,
    lineCap: '',
    lineJoin: '',
    lineWidth: 0,
    strokeStyle: '',
    beginPath: () => calls.push('beginPath'),
    clearRect: () => calls.push('clearRect'),
    lineTo: () => calls.push('lineTo'),
    moveTo: () => calls.push('moveTo'),
    stroke: () => calls.push('stroke'),
  };
  return { calls, ctx: ctx as unknown as CanvasRenderingContext2D };
}

describe('paintTrail', () => {
  it('clears the canvas every frame, so nothing is ever left behind', () => {
    const { calls, ctx } = recorder();
    paintTrail(ctx, [], 0, '#1F35E0', { width: 100, height: 100 });
    expect(calls).toEqual(['clearRect']);
  });

  it('draws one segment between each pair of points', () => {
    const { calls, ctx } = recorder();
    const now = 1000;
    const points: TrailPoint[] = [
      { x: 0, y: 0, t: now - 60 },
      { x: 10, y: 10, t: now - 30 },
      { x: 20, y: 20, t: now },
    ];
    paintTrail(ctx, points, now, '#1F35E0', { width: 100, height: 100 });
    expect(calls.filter((c) => c === 'stroke')).toHaveLength(2);
  });

  it('draws nothing for a segment that has already faded out', () => {
    const { calls, ctx } = recorder();
    const now = 10_000;
    paintTrail(
      ctx,
      [
        { x: 0, y: 0, t: 0 },
        { x: 10, y: 10, t: 0 },
      ],
      now,
      '#1F35E0',
      { width: 100, height: 100 },
    );
    expect(calls.filter((c) => c === 'stroke')).toHaveLength(0);
  });

  it('leaves the context at full alpha for whatever draws next', () => {
    const { ctx } = recorder();
    paintTrail(ctx, [{ x: 0, y: 0, t: 0 }], 100, '#1F35E0', { width: 10, height: 10 });
    expect(ctx.globalAlpha).toBe(1);
  });
});
