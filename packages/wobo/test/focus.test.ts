import { beforeEach, describe, expect, it } from 'bun:test';
import {
  anchorRectOf,
  boundsOf,
  createFocus,
  describeFocus,
  extractNumbers,
  focusRectNow,
  isClosedLoop,
  normaliseText,
  ownerStateOf,
  owningSurface,
  type Point,
  pathClosure,
  plainRect,
  pointInPolygon,
  rectCenter,
  resetFocusIds,
  simplifyPath,
  textOfTargets,
} from '../src/focus';
import type { Rect, ResolvedSurface, SurfaceTarget } from '../src/registry';

const target = (id: string, over: Partial<SurfaceTarget> = {}): SurfaceTarget => ({
  id,
  kind: 'cell',
  label: `the ${id}`,
  rect: () => ({ x: 0, y: 0, width: 10, height: 10 }),
  ...over,
});

/** A rough hand-drawn circle, sampled at 24 points, of the kind the lasso actually produces. */
const circle = (cx: number, cy: number, r: number, turns = 1): Point[] =>
  Array.from({ length: 24 }, (_, i) => {
    const a = (i / 23) * Math.PI * 2 * turns;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  });

describe('numbers on the screen', () => {
  it('reads them in order, without inventing any', () => {
    expect(extractNumbers('2x + 3 = 11, so x = 4')).toEqual([2, 3, 11, 4]);
  });

  it('understands thousands separators and negatives', () => {
    expect(extractNumbers('a drop of -3.5 from 1,200')).toEqual([-3.5, 1200]);
  });

  it('does not swallow a trailing comma into the number', () => {
    expect(extractNumbers('7, 8')).toEqual([7, 8]);
  });

  it('de-duplicates and caps, so one table cannot flood the packet', () => {
    expect(extractNumbers('4 4 4 5')).toEqual([4, 5]);
    expect(extractNumbers(Array.from({ length: 100 }, (_, i) => i).join(' '))).toHaveLength(24);
  });

  it('finds nothing in prose, and says so honestly', () => {
    expect(extractNumbers('the ball is still moving')).toEqual([]);
  });
});

describe('text', () => {
  it('collapses whitespace and clamps deterministically', () => {
    expect(normaliseText('  a \n  b  ')).toBe('a b');
    const clamped = normaliseText('x'.repeat(50), 10);
    expect(clamped).toBe(`${'x'.repeat(9)}…`);
    expect(clamped.length).toBe(10);
  });
});

describe('geometry', () => {
  it('bounds a path', () => {
    expect(
      boundsOf([
        { x: 1, y: 2 },
        { x: 5, y: 9 },
      ]),
    ).toEqual({ x: 1, y: 2, width: 4, height: 7 });
    expect(boundsOf([])).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  it('centres a rect', () => {
    expect(rectCenter({ x: 0, y: 0, width: 10, height: 20 })).toEqual({ x: 5, y: 10 });
  });

  it('knows a closed loop from a stroke', () => {
    expect(isClosedLoop(circle(100, 100, 60))).toBe(true);
    expect(
      isClosedLoop([
        { x: 0, y: 0 },
        { x: 200, y: 0 },
        { x: 400, y: 0 },
      ]),
    ).toBe(false);
  });

  it('refuses a loop too small to mean anything', () => {
    expect(isClosedLoop(circle(10, 10, 4))).toBe(false);
  });

  it('scores closure as a fraction of the bounding diagonal', () => {
    expect(pathClosure(circle(0, 0, 50))).toBeLessThan(0.45);
    expect(
      pathClosure([
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 200, y: 0 },
      ]),
    ).toBeGreaterThan(0.9);
    expect(pathClosure([{ x: 0, y: 0 }])).toBe(Number.POSITIVE_INFINITY);
  });

  it('hit-tests a point against a hand-drawn loop', () => {
    const loop = circle(100, 100, 50);
    expect(pointInPolygon({ x: 100, y: 100 }, loop)).toBe(true);
    expect(pointInPolygon({ x: 400, y: 100 }, loop)).toBe(false);
  });
});

describe('path simplification', () => {
  it('drops points that did not move, keeping both ends', () => {
    const dense = Array.from({ length: 40 }, (_, i) => ({ x: i * 0.5, y: 0 }));
    const simple = simplifyPath(dense, 6);
    expect(simple.length).toBeLessThan(dense.length);
    expect(simple[0]).toEqual({ x: 0, y: 0 });
    expect(simple[simple.length - 1]).toEqual({ x: 19.5, y: 0 });
  });

  it('caps the point count while keeping the shape', () => {
    const dense = Array.from({ length: 800 }, (_, i) => ({ x: i * 10, y: (i % 7) * 10 }));
    const simple = simplifyPath(dense, 1, 12);
    expect(simple).toHaveLength(12);
    expect(simple[0]).toEqual(dense[0] as Point);
  });

  it('is deterministic', () => {
    const points = circle(50, 50, 40);
    expect(simplifyPath(points)).toEqual(simplifyPath(points));
  });
});

describe('reading the owner state at code level', () => {
  const targets = [
    target('a', { value: () => ({ grid: '4x4' }), text: () => '3' }),
    target('b', { value: () => 12 }),
    target('c'),
    target('boom', {
      value: () => {
        throw new Error('mid-render');
      },
    }),
  ];

  it('collects the live values of the hit targets only', () => {
    expect(ownerStateOf(targets, ['a', 'c'])).toEqual({ a: { grid: '4x4' } });
  });

  it('survives a target that throws', () => {
    expect(ownerStateOf(targets, ['boom', 'b'])).toEqual({ b: 12 });
  });

  it('falls back to a target label when it publishes no text', () => {
    expect(textOfTargets(targets, ['a', 'c'])).toBe('3 · the c');
  });

  it('picks the surface most of the targets belong to', () => {
    const surfaces: ResolvedSurface[] = [
      { id: 'one', title: 'One', priority: 0, targets: [target('a')] },
      { id: 'two', title: 'Two', priority: 0, targets: [target('b'), target('c')] },
    ];
    expect(owningSurface(surfaces, ['b', 'c'])?.id).toBe('two');
    expect(owningSurface(surfaces, ['zzz'])).toBeUndefined();
  });
});

describe('a focus object', () => {
  beforeEach(() => resetFocusIds());

  it('derives its numbers from its text and never takes them on trust', () => {
    const focus = createFocus({
      kind: 'selection',
      rect: { x: 0, y: 0, width: 10, height: 10 },
      text: 'the mass is 9.8 kg',
      targetIds: ['a', 'a', 'b'],
      createdAt: 1000,
    });
    expect(focus.numbers).toEqual([9.8]);
    expect(focus.targetIds).toEqual(['a', 'b']);
    expect(focus.createdAt).toBe(1000);
    expect(focus.id).toBe('focus-1');
  });

  it('mints ordered ids', () => {
    const a = createFocus({ kind: 'hover', rect: { x: 0, y: 0, width: 1, height: 1 } });
    const b = createFocus({ kind: 'hover', rect: { x: 0, y: 0, width: 1, height: 1 } });
    expect([a.id, b.id]).toEqual(['focus-1', 'focus-2']);
  });

  it('keeps a simplified path and drops an empty owner state', () => {
    const focus = createFocus({
      kind: 'lasso',
      rect: { x: 0, y: 0, width: 100, height: 100 },
      path: circle(50, 50, 40),
      ownerState: {},
    });
    expect(focus.ownerState).toBeUndefined();
    expect(focus.path?.length).toBeGreaterThan(3);
    expect(focus.path?.length).toBeLessThanOrEqual(48);
  });

  it("announces itself in Wobo's voice: sentence case, no emoji, no exclamation", () => {
    const focus = createFocus({
      kind: 'lasso',
      rect: { x: 0, y: 0, width: 10, height: 10 },
      text: 'the second step',
    });
    const line = describeFocus(focus);
    expect(line).toBe('circled the second step. Ask Wobo about this.');
    expect(line).not.toContain('!');
    expect(/\p{Extended_Pictographic}/u.test(line)).toBe(false);
  });

  it('announces a region honestly when nothing under it is registered', () => {
    const focus = createFocus({ kind: 'lasso', rect: { x: 0, y: 0, width: 10, height: 10 } });
    expect(describeFocus(focus)).toBe('circled a region of the screen. Ask Wobo about this.');
  });

  it('counts the things it caught when they carry no text', () => {
    const focus = createFocus({
      kind: 'circle',
      rect: { x: 0, y: 0, width: 10, height: 10 },
      targetIds: ['a', 'b'],
    });
    expect(describeFocus(focus)).toBe('circled 2 things on screen. Ask Wobo about this.');
  });
});

/**
 * A rect from the DOM is a `DOMRect`, whose x/y/width/height live on the PROTOTYPE as getters.
 * Spreading one yields `{}`, and every coordinate downstream is NaN — which the hand draws as
 * `M NaN NaN`: a mark that is in the DOM, is counted, and is invisible. Live in the app this made
 * the ring round a circled card vanish while every count said it was there.
 */
/** Exactly a DOMRect's shape: nothing owned, everything on the prototype. */
function domRect(x: number, y: number, width: number, height: number): Rect {
  return Object.create({
    get x() {
      return x;
    },
    get y() {
      return y;
    },
    get width() {
      return width;
    },
    get height() {
      return height;
    },
  }) as Rect;
}

describe('a rect read from the DOM', () => {
  it('survives being carried through a focus region', () => {
    const dom = domRect(100, 200, 300, 180);
    // The spread that used to happen, for the record: it loses everything.
    expect(Object.keys({ ...dom })).toEqual([]);

    const focus = createFocus({
      kind: 'lasso',
      rect: { x: 90, y: 190, width: 320, height: 200 },
      targetIds: ['card'],
      anchorRect: dom,
    });
    // The card has not moved, so the region is exactly where the learner drew it.
    expect(focusRectNow(focus, { target: () => dom })).toEqual({
      x: 90,
      y: 190,
      width: 320,
      height: 200,
    });
    // The card scrolled 300 up; the ring goes with it, keeping the size and shape Wobo drew.
    expect(focusRectNow(focus, { target: () => domRect(100, -100, 300, 180) })).toEqual({
      x: 90,
      y: -110,
      width: 320,
      height: 200,
    });
  });

  it('rejects a rect that is not made of real numbers rather than passing NaN on', () => {
    const broken = { x: Number.NaN, y: 0, width: 10, height: 10 };
    expect(plainRect(broken)).toBeNull();
    expect(plainRect({} as unknown as Rect)).toBeNull();
    expect(plainRect(null)).toBeNull();
    expect(plainRect({ x: 1, y: 2, width: 3, height: 4 })).toEqual({
      x: 1,
      y: 2,
      width: 3,
      height: 4,
    });
  });

  it('unions several DOM rects without losing any of them', () => {
    const a = domRect(0, 0, 100, 100);
    const b = domRect(200, 50, 100, 100);
    expect(anchorRectOf(['a', 'b'], (id) => (id === 'a' ? a : b))).toEqual({
      x: 0,
      y: 0,
      width: 300,
      height: 150,
    });
  });

  it('marks the region the learner drew, never the whole of what it happened to enclose', () => {
    // A loop round a video frame also encloses the card the player sits in. Taking the union of
    // the targets drew a ring round the whole page; the learner's own loop is the mark.
    const drew = { x: 380, y: 250, width: 520, height: 320 };
    const enclosing = domRect(0, 0, 1280, 860);
    const focus = createFocus({
      kind: 'lasso',
      rect: drew,
      targetIds: ['page'],
      anchorRect: enclosing,
    });
    expect(focusRectNow(focus, { target: () => enclosing })).toEqual(drew);
  });
});
