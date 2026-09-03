import { describe, expect, it } from 'bun:test';
import {
  type AnchorContext,
  anchorSignature,
  type BoardRect,
  boardHeight,
  boardToViewport,
  boxesOverlap,
  frameOf,
  isScreenAnchored,
  padBox,
  pointOn,
  pxPerUnit,
  rectToBoard,
  resolveAnchorBox,
  resolveAnchorPoint,
  unionBox,
  viewportToBoard,
  visibleBox,
} from '../../src/board/anchors';

const frame = frameOf({ x: 100, y: 50, width: 500, height: 310 });

function ctx(over: Partial<AnchorContext> = {}): AnchorContext {
  return {
    frame,
    targetRect: () => null,
    focusRect: () => null,
    objectBox: () => null,
    ...over,
  };
}

describe('board space', () => {
  it('maps the surface width onto 1000 units', () => {
    expect(pxPerUnit(frame)).toBe(0.5);
    expect(boardHeight(frame)).toBe(620);
  });

  it('round-trips viewport px and board units', () => {
    const [bx, by] = viewportToBoard(frame, 350, 205);
    expect(bx).toBe(500);
    expect(by).toBe(310);
    expect(boardToViewport(frame, bx, by)).toEqual([350, 205]);
  });

  it('honours the camera', () => {
    const zoomed = frameOf({ x: 0, y: 0, width: 500, height: 310 }, { zoom: 2, panX: 100 });
    expect(pxPerUnit(zoomed)).toBe(1);
    expect(boardToViewport(zoomed, 100, 0)).toEqual([0, 0]);
    expect(visibleBox(zoomed)).toEqual({ x: 100, y: 0, w: 500, h: 310 });
  });

  it('never divides by a zero-width surface', () => {
    expect(pxPerUnit(frameOf({ x: 0, y: 0, width: 0, height: 0 }))).toBe(1);
  });

  it('turns a live viewport rect into board units', () => {
    expect(rectToBoard(frame, { x: 150, y: 100, width: 50, height: 20 })).toEqual({
      x: 100,
      y: 100,
      w: 100,
      h: 40,
    });
  });
});

describe('anchors resolve to something real, or to nothing', () => {
  it('a board anchor is exactly where it says', () => {
    expect(resolveAnchorPoint({ board: [120, 400] }, ctx())).toEqual([120, 400]);
  });

  it('a target anchor follows the target rect', () => {
    const rect = { x: 150, y: 100, width: 50, height: 20 };
    const c = ctx({ targetRect: (id) => (id === 'btn' ? rect : null) });
    expect(resolveAnchorBox({ target: 'btn' }, c)).toEqual({ x: 100, y: 100, w: 100, h: 40 });
    expect(resolveAnchorPoint({ target: 'btn', at: 'bottom' }, c)).toEqual([150, 140]);
  });

  it('a mark whose target is gone resolves to nothing — it never floats', () => {
    expect(resolveAnchorBox({ target: 'ghost' }, ctx())).toBeNull();
    expect(resolveAnchorPoint({ focus: 'ghost' }, ctx())).toBeNull();
    expect(resolveAnchorBox({ object: 'ghost' }, ctx())).toBeNull();
  });

  it('an object anchor reads a box already in board units', () => {
    const box: BoardRect = { x: 10, y: 20, w: 40, h: 10 };
    const c = ctx({ objectBox: (id) => (id === 'v1' ? box : null) });
    expect(resolveAnchorBox({ object: 'v1' }, c)).toEqual(box);
    expect(resolveAnchorPoint({ object: 'v1', at: 'topRight' }, c)).toEqual([50, 20]);
  });

  it('applies an offset after resolving, never instead of resolving', () => {
    expect(resolveAnchorPoint({ board: [10, 10], offset: [5, -5] }, ctx())).toEqual([15, 5]);
  });

  it('accepts a fraction pair for `at`', () => {
    const box: BoardRect = { x: 0, y: 0, w: 100, h: 50 };
    expect(pointOn(box, [0.25, 0.5])).toEqual([25, 25]);
    expect(pointOn(box)).toEqual([50, 25]);
  });
});

describe('the anchor signature is what keeps the frame cheap', () => {
  it('is stable for an unchanged rect and changes when it moves', () => {
    const a = anchorSignature({ x: 10, y: 20, w: 30, h: 40 });
    expect(anchorSignature({ x: 10, y: 20, w: 30, h: 40 })).toBe(a);
    expect(anchorSignature({ x: 11, y: 20, w: 30, h: 40 })).not.toBe(a);
    expect(anchorSignature(null)).toBe('gone');
  });

  it('knows which marks hang off the page and so must be re-measured', () => {
    expect(isScreenAnchored({ target: 't' })).toBe(true);
    expect(isScreenAnchored({ focus: 'f' })).toBe(true);
    expect(isScreenAnchored({ board: [0, 0] })).toBe(false);
    expect(isScreenAnchored({ object: 'v1' })).toBe(false);
    expect(isScreenAnchored(undefined)).toBe(false);
  });
});

describe('box helpers', () => {
  it('pads, unions and detects overlap', () => {
    expect(padBox({ x: 10, y: 10, w: 10, h: 10 }, 5)).toEqual({ x: 5, y: 5, w: 20, h: 20 });
    expect(unionBox([])).toBeNull();
    expect(
      unionBox([
        { x: 0, y: 0, w: 10, h: 10 },
        { x: 20, y: 5, w: 10, h: 10 },
      ]),
    ).toEqual({ x: 0, y: 0, w: 30, h: 15 });
    expect(boxesOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 11, y: 0, w: 10, h: 10 })).toBe(false);
    expect(boxesOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 11, y: 0, w: 10, h: 10 }, 4)).toBe(true);
  });
});

/**
 * A box is a box only if all four numbers are real. A rect that arrives half-built — a DOMRect that
 * was spread rather than read, a measurement of something not laid out — turns every coordinate
 * downstream into NaN, and the hand draws `M NaN NaN`: a mark that is in the DOM, is counted by
 * every probe, and is invisible. BOARD.md §3 already has the answer for a thing that cannot be
 * located, and this is it.
 */
describe('a rect that is not made of real numbers', () => {
  const frame = frameOf({ x: 0, y: 0, width: 1000, height: 620 });
  const ctx = (rect: unknown) => ({
    frame,
    targetRect: () => rect as never,
    focusRect: () => rect as never,
    objectBox: () => null,
  });

  it('resolves to no box at all rather than a NaN one, for a target', () => {
    expect(resolveAnchorBox({ target: 't' }, ctx({}))).toBeNull();
    expect(
      resolveAnchorBox({ target: 't' }, ctx({ x: Number.NaN, y: 0, width: 4, height: 4 })),
    ).toBeNull();
  });

  it('and for a focus region', () => {
    expect(resolveAnchorBox({ focus: 'f' }, ctx({}))).toBeNull();
  });

  it('while a real rect still resolves', () => {
    expect(resolveAnchorBox({ target: 't' }, ctx({ x: 0, y: 0, width: 100, height: 62 }))).toEqual({
      x: 0,
      y: 0,
      w: 100,
      h: 62,
    });
  });
});
