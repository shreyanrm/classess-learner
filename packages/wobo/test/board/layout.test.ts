import { describe, expect, it } from 'bun:test';
import { boxesOverlap, frameOf } from '../../src/board/anchors';
import {
  avoidCollisions,
  boardArea,
  CAMERA_FILL_MAX,
  CAMERA_FILL_MIN,
  CAMERA_MAX_ZOOM,
  CAMERA_MIN_ZOOM,
  cameraBox,
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

  /** How much of the visible box the ink actually fills, on its limiting axis. */
  const fillOf = (bounds: { x: number; y: number; w: number; h: number }) => {
    const cam = fitCamera(bounds, frame);
    const view = cameraBox(cam, frame);
    return { cam, view, fill: Math.max(bounds.w / view.w, bounds.h / view.h) };
  };

  it('fits three objects to the box instead of leaving them at a fifth of it', () => {
    // Three small marks in one corner — the failure this replaced showed them at ~0.2 of the box.
    const bounds = contentBounds([
      { x: 100, y: 100, w: 60, h: 30 },
      { x: 180, y: 100, w: 60, h: 30 },
      { x: 100, y: 150, w: 140, h: 30 },
    ]) as { x: number; y: number; w: number; h: number };
    const { cam, fill } = fillOf(bounds);
    expect(cam.zoom).toBeGreaterThan(1);
    expect(fill).toBeGreaterThanOrEqual(CAMERA_FILL_MIN);
    expect(fill).toBeLessThanOrEqual(CAMERA_FILL_MAX);
  });

  it('centres the ink in the box it shows', () => {
    const bounds = { x: 120, y: 90, w: 240, h: 120 };
    const { cam, view } = fillOf(bounds);
    expect(view.x + view.w / 2).toBeCloseTo(bounds.x + bounds.w / 2, 6);
    expect(view.y + view.h / 2).toBeCloseTo(bounds.y + bounds.h / 2, 6);
    expect(cam.zoom).toBeLessThanOrEqual(CAMERA_MAX_ZOOM);
  });

  it('keeps the aspect: one zoom for both axes, whatever the shape of the ink', () => {
    const wide = fitCamera({ x: 0, y: 0, w: 600, h: 40 }, frame);
    const tall = fitCamera({ x: 0, y: 0, w: 40, h: 400 }, frame);
    for (const cam of [wide, tall]) {
      const view = cameraBox(cam, frame);
      // The window keeps the surface's own aspect — nothing is stretched to make the ink fit.
      expect(view.w / view.h).toBeCloseTo(1000 / 620, 6);
    }
  });

  it('grows the camera as the ink grows, one board at a time', () => {
    const zooms = [
      fitCamera({ x: 400, y: 300, w: 80, h: 40 }, frame).zoom,
      fitCamera({ x: 400, y: 300, w: 300, h: 160 }, frame).zoom,
      fitCamera({ x: 400, y: 300, w: 700, h: 420 }, frame).zoom,
    ];
    expect(zooms[0]).toBeGreaterThan(zooms[1] as number);
    expect(zooms[1]).toBeGreaterThan(zooms[2] as number);
  });

  it('zooms out when the ink has outgrown the view', () => {
    const bounds = contentBounds([{ x: 0, y: 0, w: 2000, h: 300 }]);
    const cam = fitCamera(bounds, frame);
    expect(cam.zoom).toBeLessThan(1);
    expect(cam.zoom).toBeGreaterThanOrEqual(CAMERA_MIN_ZOOM);
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
