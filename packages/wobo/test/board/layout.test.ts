import { describe, expect, it } from 'bun:test';
import { boxesOverlap, frameOf } from '../../src/board/anchors';
import {
  avoidCollisions,
  boardArea,
  contentBounds,
  fitCamera,
  flowRows,
  LABEL_MARGIN,
  needsCamera,
  placeLabel,
} from '../../src/board/layout';

const frame = frameOf({ x: 0, y: 0, width: 1000, height: 620 });

describe('labels go beside the thing they name, never on it', () => {
  const anchor = { x: 100, y: 100, w: 80, h: 40 };

  it('takes the right-hand side when it is free', () => {
    const placed = placeLabel(anchor, { w: 60, h: 26 });
    expect(placed.x).toBe(anchor.x + anchor.w + LABEL_MARGIN);
    expect(boxesOverlap(placed, anchor)).toBe(false);
  });

  it('moves to another side when the right is taken', () => {
    const blocker = { x: 190, y: 100, w: 80, h: 40 };
    const placed = placeLabel(anchor, { w: 60, h: 26 }, [blocker]);
    expect(boxesOverlap(placed, blocker, LABEL_MARGIN * 0.5)).toBe(false);
    expect(boxesOverlap(placed, anchor)).toBe(false);
  });

  it('pushes down the margin when every side is taken', () => {
    const occupied = [
      { x: 0, y: 0, w: 400, h: 400 },
      { x: 0, y: 400, w: 400, h: 80 },
    ];
    const placed = placeLabel(anchor, { w: 60, h: 26 }, occupied);
    for (const o of occupied) expect(boxesOverlap(placed, o, LABEL_MARGIN * 0.5)).toBe(false);
  });

  it('stays inside the board it is given', () => {
    const area = { x: 0, y: 0, w: 200, h: 200 };
    const placed = placeLabel({ x: 160, y: 20, w: 30, h: 20 }, { w: 60, h: 26 }, [], area);
    expect(placed.x + placed.w).toBeLessThanOrEqual(area.x + area.w + 0.001);
  });
});

describe('objects are placed so nothing collides', () => {
  it('nudges a clash downward and keeps reading order', () => {
    const placed = avoidCollisions([
      { x: 0, y: 0, w: 100, h: 40 },
      { x: 0, y: 10, w: 100, h: 40 },
    ]);
    expect(placed[0]).toEqual({ x: 0, y: 0, w: 100, h: 40 });
    expect(placed[1]?.y).toBeGreaterThanOrEqual(40);
  });

  it('flows a derivation left to right and wraps', () => {
    const rows = flowRows(
      [
        { w: 200, h: 40 },
        { w: 200, h: 40 },
        { w: 200, h: 40 },
      ],
      { x: 0, y: 0, w: 430, h: 400 },
      10,
    );
    expect(rows[0]?.x).toBe(0);
    expect(rows[1]?.x).toBe(210);
    expect(rows[2]).toEqual({ x: 0, y: 50, w: 200, h: 40 });
  });
});

describe('the camera follows the ink', () => {
  it('rests when the board is empty', () => {
    expect(contentBounds([])).toBeNull();
    expect(fitCamera(null, frame)).toEqual({ zoom: 1, panX: 0, panY: 0 });
  });

  it('never zooms past life size for a half-empty board', () => {
    const bounds = contentBounds([{ x: 100, y: 100, w: 200, h: 100 }]);
    expect(fitCamera(bounds, frame).zoom).toBe(1);
  });

  it('zooms out when the ink has outgrown the view', () => {
    const bounds = contentBounds([{ x: 0, y: 0, w: 2000, h: 300 }]);
    const cam = fitCamera(bounds, frame);
    expect(cam.zoom).toBeLessThan(1);
    expect(cam.zoom).toBeGreaterThanOrEqual(0.35);
  });

  it('knows when it has to move at all', () => {
    expect(needsCamera({ x: 10, y: 10, w: 100, h: 100 }, frame)).toBe(false);
    expect(needsCamera({ x: 900, y: 10, w: 300, h: 100 }, frame)).toBe(true);
    expect(needsCamera(null, frame)).toBe(false);
  });

  it('the board area is 1000 wide by the surface’s own aspect', () => {
    expect(boardArea(frame)).toEqual({ x: 0, y: 0, w: 1000, h: 620 });
  });
});
