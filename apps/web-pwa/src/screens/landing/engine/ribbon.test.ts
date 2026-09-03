/**
 * The ribbon's geometry and its bounds.
 *
 * Two things matter here and neither is visible in a screenshot. The taper has to be a real taper
 * — 20 px at the head falling to 2 px at the tail — because that is what makes the mark read as a
 * marker rather than as a fat line. And the trail is bounded by TIME: however fast the pointer is
 * moved, the array holds one life of points and no more, or a page left under a shaking mouse
 * would climb until it stuttered.
 */

import { describe, expect, it } from 'bun:test';
import {
  type Mark,
  markCapacity,
  mountRibbon,
  paintRibbon,
  pruneMarks,
  RIBBON_HEAD_RADIUS,
  RIBBON_LIFE,
  RIBBON_MIN_POINTS,
  ribbonEdges,
  ribbonHalfWidth,
  ribbonInk,
} from './ribbon';

/** A horizontal run of marks, newest last, one per frame. */
function run(count: number, now: number, step = 16): Mark[] {
  return Array.from({ length: count }, (_, i) => ({
    x: i * 10,
    y: 100,
    t: now - (count - 1 - i) * step,
  }));
}

describe('ribbonHalfWidth', () => {
  it('is 20 px across at the head and 2 px at the tail', () => {
    expect(ribbonHalfWidth(0) * 2).toBe(20);
    expect(ribbonHalfWidth(1) * 2).toBe(2);
  });

  it('never widens as a point ages', () => {
    let previous = Number.POSITIVE_INFINITY;
    for (let age = 0; age <= 1; age += 0.05) {
      const w = ribbonHalfWidth(age);
      expect(w).toBeLessThanOrEqual(previous);
      previous = w;
    }
  });

  it('clamps rather than inverting past the end of a life', () => {
    expect(ribbonHalfWidth(2) * 2).toBe(2);
    expect(ribbonHalfWidth(-1) * 2).toBe(20);
  });
});

describe('pruneMarks', () => {
  it('drops everything older than one life, from the front', () => {
    const now = 10_000;
    const marks: Mark[] = [
      { x: 0, y: 0, t: now - RIBBON_LIFE - 1 },
      { x: 1, y: 0, t: now - RIBBON_LIFE - 0.5 },
      { x: 2, y: 0, t: now - 10 },
    ];
    expect(pruneMarks(marks, now)).toBe(2);
    expect(marks).toHaveLength(1);
    expect(marks[0]?.x).toBe(2);
  });

  it('holds the trail at one life however fast the pointer moves', () => {
    const marks: Mark[] = [];
    let now = 0;
    // Ten seconds of a 120 Hz pointer — twice the frame rate the capacity is figured at.
    for (let i = 0; i < 1200; i++) {
      now += 1000 / 120;
      marks.push({ x: i, y: i, t: now });
      pruneMarks(marks, now);
    }
    expect(marks.length).toBeLessThanOrEqual(markCapacity(RIBBON_LIFE, 120));
    expect(marks.length).toBeGreaterThan(RIBBON_MIN_POINTS);
  });

  it('figures its capacity from the life and the frame rate', () => {
    expect(markCapacity(650, 60)).toBe(40);
    expect(markCapacity(650, 120)).toBe(79);
  });
});

describe('ribbonEdges', () => {
  it('offsets the two edges symmetrically about the centreline', () => {
    const now = 1000;
    const marks = run(6, now);
    const { left, right } = ribbonEdges(marks, now, RIBBON_LIFE);
    expect(left).toHaveLength(marks.length);
    for (let i = 0; i < marks.length; i++) {
      const mark = marks[i];
      const a = left[i];
      const b = right[i];
      if (!mark || !a || !b) throw new Error('an edge lost a point');
      // A horizontal run puts the normal on y, so both edges keep the point's x.
      expect(a[0]).toBeCloseTo(mark.x);
      expect(b[0]).toBeCloseTo(mark.x);
      expect(a[1] - mark.y).toBeCloseTo(mark.y - b[1]);
    }
  });

  it('is widest at the head and narrowest at the tail', () => {
    const now = 1000;
    const marks = run(20, now, 30);
    const { left, right } = ribbonEdges(marks, now, RIBBON_LIFE);
    const spread = (i: number) => {
      const a = left[i];
      const b = right[i];
      if (!a || !b) throw new Error('an edge lost a point');
      return Math.abs(a[1] - b[1]);
    };
    expect(spread(marks.length - 1)).toBeGreaterThan(spread(0));
  });
});

describe('ribbonInk', () => {
  it('is marigold multiplied onto paper', () => {
    expect(ribbonInk(false)).toEqual({ fill: 'rgba(255,182,41,0.4)', blend: 'multiply' });
  });

  it('is Wobo blue screened onto night', () => {
    expect(ribbonInk(true)).toEqual({ fill: 'rgba(124,140,255,0.5)', blend: 'screen' });
  });
});

/** A canvas context that records what it was asked to do. */
function recorder() {
  const calls: string[] = [];
  const ctx = {
    fillStyle: '',
    clearRect: () => calls.push('clearRect'),
    beginPath: () => calls.push('beginPath'),
    moveTo: () => calls.push('moveTo'),
    lineTo: () => calls.push('lineTo'),
    quadraticCurveTo: () => calls.push('quadraticCurveTo'),
    closePath: () => calls.push('closePath'),
    fill: () => calls.push('fill'),
    arc: (_x: number, _y: number, r: number) => calls.push(`arc:${r}`),
  } as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

describe('paintRibbon', () => {
  it('clears and draws nothing before there is a tangent to trust', () => {
    const { ctx, calls } = recorder();
    paintRibbon(ctx, run(RIBBON_MIN_POINTS - 1, 0), 0, { width: 800, height: 600 });
    expect(calls).toEqual(['clearRect']);
  });

  it('lays the mark down as one filled shape with a round head', () => {
    const { ctx, calls } = recorder();
    paintRibbon(ctx, run(8, 1000), 1000, { width: 800, height: 600 });
    expect(calls[0]).toBe('clearRect');
    expect(calls.filter((c) => c === 'closePath')).toHaveLength(1);
    expect(calls.filter((c) => c === 'fill')).toHaveLength(2);
    expect(calls).toContain(`arc:${RIBBON_HEAD_RADIUS}`);
  });

  it('takes its pigment from the theme', () => {
    const light = recorder();
    paintRibbon(light.ctx, run(8, 1000), 1000, { width: 800, height: 600 }, false);
    expect(light.ctx.fillStyle).toBe(ribbonInk(false).fill);
    const dark = recorder();
    paintRibbon(dark.ctx, run(8, 1000), 1000, { width: 800, height: 600 }, true);
    expect(dark.ctx.fillStyle).toBe(ribbonInk(true).fill);
  });
});

/** A canvas-shaped double, with a window that hands out frames by hand. */
function canvasWorld() {
  const listeners = new Map<string, Set<EventListener>>();
  const pending = new Set<number>();
  let next = 1;
  const win = {
    innerWidth: 1000,
    innerHeight: 600,
    devicePixelRatio: 3,
    matchMedia: (query: string) => ({ matches: !query.includes('reduce') }),
    addEventListener(type: string, handler: EventListener) {
      const set = listeners.get(type) ?? new Set();
      set.add(handler);
      listeners.set(type, set);
    },
    removeEventListener(type: string, handler: EventListener) {
      listeners.get(type)?.delete(handler);
    },
    requestAnimationFrame() {
      const id = next++;
      pending.add(id);
      return id;
    },
    cancelAnimationFrame(id: number) {
      pending.delete(id);
    },
    get count() {
      let n = 0;
      for (const set of listeners.values()) n += set.size;
      return n;
    },
  };
  const transforms: number[][] = [];
  const canvas = {
    width: 0,
    height: 0,
    style: {} as Record<string, string>,
    ownerDocument: { documentElement: { getAttribute: () => null } },
    getContext: () =>
      ({
        ...recorder().ctx,
        setTransform: (...args: number[]) => transforms.push(args),
        clearRect: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        quadraticCurveTo: () => {},
        closePath: () => {},
        fill: () => {},
        arc: () => {},
      }) as unknown as CanvasRenderingContext2D,
  };
  return { win, canvas, pending, transforms };
}

describe('mountRibbon', () => {
  it('sizes the canvas for the display, capped at 2x', () => {
    const { win, canvas, transforms } = canvasWorld();
    const handle = mountRibbon(canvas as unknown as HTMLCanvasElement, {
      pointer: { x: 0, y: 0, has: false, down: false, movedAt: 0 },
      win: win as unknown as Window,
      manual: true,
    });
    expect(canvas.width).toBe(2000);
    expect(canvas.style.width).toBe('1000px');
    expect(transforms[0]).toEqual([2, 0, 0, 2, 0, 0]);
    handle.dispose();
  });

  it('feeds the trail only once the pointer has moved', () => {
    const { win, canvas } = canvasWorld();
    const pointer = { x: 10, y: 10, has: false, down: false, movedAt: 0 };
    let clock = 0;
    const handle = mountRibbon(canvas as unknown as HTMLCanvasElement, {
      pointer,
      win: win as unknown as Window,
      manual: true,
      now: () => clock,
    });
    handle.frame();
    expect(handle.marks).toHaveLength(0);
    pointer.has = true;
    for (let i = 0; i < 5; i++) {
      clock += 16;
      handle.frame();
    }
    expect(handle.marks).toHaveLength(5);
    handle.dispose();
  });

  it('leaves nothing behind after a mount and unmount', () => {
    const { win, canvas, pending } = canvasWorld();
    const handle = mountRibbon(canvas as unknown as HTMLCanvasElement, {
      pointer: { x: 0, y: 0, has: true, down: false, movedAt: 0 },
      win: win as unknown as Window,
    });
    expect(win.count).toBe(1);
    expect(pending.size).toBe(1);
    handle.frame();
    handle.dispose();
    expect(win.count).toBe(0);
    expect(pending.size).toBe(0);
    expect(handle.marks).toHaveLength(0);
  });

  it('stays inert under reduced motion', () => {
    const { win, canvas, pending } = canvasWorld();
    // Every query matches, including the reduced-motion one — the whole engine's off switch.
    win.matchMedia = () => ({ matches: true });
    const handle = mountRibbon(canvas as unknown as HTMLCanvasElement, {
      pointer: { x: 0, y: 0, has: true, down: false, movedAt: 0 },
      win: win as unknown as Window,
    });
    expect(win.count).toBe(0);
    expect(pending.size).toBe(0);
    handle.frame();
    expect(handle.marks).toHaveLength(0);
    handle.dispose();
  });
});
