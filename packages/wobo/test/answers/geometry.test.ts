import { describe, expect, it } from 'bun:test';
import {
  angleAt,
  axisTolerance,
  boxCenter,
  clamp,
  FIGURE_BOX,
  figureParts,
  hullOf,
  insideLoop,
  isLasso,
  partAt,
  partCount,
  pointToSegment,
  rdp,
  reduceToVertices,
  settle,
  snap,
  straightness,
} from '../../src/answers/geometry';

describe('a figure is cut once, and both halves read the same cut', () => {
  it('numbers a grid in reading order', () => {
    const parts = figureParts({ shape: 'grid', rows: 2, cols: 3 });
    expect(parts).toHaveLength(6);
    expect(parts[0]?.box).toEqual([0, 0, 33.333, 50]);
    // Part three is the start of the second row, not the end of the first.
    expect(parts[3]?.box[1]).toBe(50);
  });

  it('counts a grid by its cells and everything else by its parts', () => {
    expect(partCount({ shape: 'grid', rows: 3, cols: 4 })).toBe(12);
    expect(partCount({ shape: 'pie', parts: 6 })).toBe(6);
    expect(partCount({ shape: 'number_line', parts: 5, min: 0, max: 1 })).toBe(5);
  });

  it('draws a pie clockwise from twelve, so the first slice is the one a finger reaches for', () => {
    const parts = figureParts({ shape: 'pie', parts: 4 });
    expect(parts[0]?.center[0]).toBeGreaterThan(50);
    expect(parts[0]?.center[1]).toBeLessThan(50);
    expect(parts[1]?.center[0]).toBeGreaterThan(50);
    expect(parts[1]?.center[1]).toBeGreaterThan(50);
  });

  it('makes a bar a band and a number line a band on its rule, never a full square', () => {
    const bar = figureParts({ shape: 'bar', parts: 4 })[0];
    expect(bar?.box[3]).toBeCloseTo(100 / 3, 2);
    const line = figureParts({ shape: 'number_line', parts: 4, min: 0, max: 1 })[0];
    expect(line?.box[3]).toBeCloseTo(20, 6);
  });
});

describe('hit-testing a figure', () => {
  it('finds the cell under a point on a grid', () => {
    const figure = { shape: 'grid', rows: 2, cols: 2 } as const;
    expect(partAt(figure, [10, 10])).toBe(0);
    expect(partAt(figure, [90, 10])).toBe(1);
    expect(partAt(figure, [10, 90])).toBe(2);
    expect(partAt(figure, [90, 90])).toBe(3);
  });

  it('finds a pie slice by angle, and nothing at all outside the circle', () => {
    const figure = { shape: 'pie', parts: 4 } as const;
    expect(partAt(figure, [60, 40])).toBe(0);
    expect(partAt(figure, [60, 60])).toBe(1);
    expect(partAt(figure, [40, 60])).toBe(2);
    expect(partAt(figure, [40, 40])).toBe(3);
    expect(partAt(figure, [99, 99])).toBeNull();
  });

  it('misses the gaps above and below a bar', () => {
    expect(partAt({ shape: 'bar', parts: 3 }, [50, 2])).toBeNull();
  });
});

describe('snapping', () => {
  it('snaps to the nearest step, measured from the axis start', () => {
    expect(snap(0.31, 0.25, 0)).toBeCloseTo(0.25, 9);
    expect(snap(0.4, 0.25, 0)).toBeCloseTo(0.5, 9);
    expect(snap(7, 2, 1)).toBe(7);
    expect(snap(7.4, 2, 1)).toBe(7);
  });

  it('a step of zero is continuous and passes the value straight through', () => {
    expect(snap(7.6543, 0)).toBe(7.6543);
  });

  it('settles inside the axis after snapping, never one step past its end', () => {
    expect(settle(11, 0, 10, 3)).toBe(10);
    expect(settle(-4, 0, 10, 3)).toBe(0);
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('slackens by half a step, or by a hundredth of the extent when continuous', () => {
    expect(axisTolerance(0, 10, 2)).toBe(1);
    expect(axisTolerance(0, 10, 0)).toBeCloseTo(0.1, 9);
    expect(axisTolerance(0, 10, 2, 0.25)).toBe(0.25);
  });
});

describe('reading a freehand path back', () => {
  const straightLine = Array.from({ length: 20 }, (_, i): [number, number] => [i * 10, 0]);

  it('keeps corners where a radial thinning would lose them', () => {
    const bent: [number, number][] = [
      [0, 0],
      [50, 1],
      [100, 0],
      [100, 50],
      [100, 100],
    ];
    expect(rdp(bent, 5)).toEqual([
      [0, 0],
      [100, 0],
      [100, 100],
    ]);
  });

  it('measures the distance from a point to a segment, and to its ends beyond them', () => {
    expect(pointToSegment([50, 10], [0, 0], [100, 0])).toBe(10);
    expect(pointToSegment([-30, 0], [0, 0], [100, 0])).toBe(30);
  });

  it('thins a stroke down to exactly the corners a shape needs', () => {
    const triangle: [number, number][] = [];
    const corners: [number, number][] = [
      [0, 0],
      [100, 0],
      [50, 90],
      [0, 0],
    ];
    for (let i = 0; i < corners.length - 1; i++) {
      const a = corners[i] as [number, number];
      const b = corners[i + 1] as [number, number];
      for (let t = 0; t < 10; t++) {
        triangle.push([a[0] + ((b[0] - a[0]) * t) / 10, a[1] + ((b[1] - a[1]) * t) / 10]);
      }
    }
    triangle.push([0, 0]);
    expect(reduceToVertices(triangle, 4)).toHaveLength(4);
  });

  it('leaves a path alone when it already has few enough points', () => {
    expect(
      reduceToVertices(
        [
          [0, 0],
          [1, 1],
        ],
        4,
      ),
    ).toEqual([
      [0, 0],
      [1, 1],
    ]);
  });

  it('measures the angle between two rays from a vertex', () => {
    expect(angleAt([1, 0], [0, 0], [0, 1])).toBeCloseTo(90, 9);
    expect(angleAt([1, 0], [0, 0], [-1, 0])).toBeCloseTo(180, 9);
    expect(angleAt([1, 0], [0, 0], [1, 1])).toBeCloseTo(45, 9);
    // A degenerate ray has no angle to report, and does not divide by zero.
    expect(angleAt([0, 0], [0, 0], [1, 1])).toBe(0);
  });

  it('scores a ruler at one and a bowed line above it', () => {
    expect(straightness(straightLine)).toBeCloseTo(1, 6);
    expect(
      straightness([
        [0, 0],
        [50, 50],
        [100, 0],
      ]),
    ).toBeGreaterThan(1.3);
  });
});

describe('lassos', () => {
  const circle = (cx: number, cy: number, r: number): [number, number][] =>
    Array.from({ length: 20 }, (_, i) => {
      const a = (i / 20) * Math.PI * 2;
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    });

  it('reads a loop as a loop and a line as not one', () => {
    expect(isLasso(circle(50, 50, 30))).toBe(true);
    expect(
      isLasso([
        [0, 0],
        [50, 0],
        [100, 0],
      ]),
    ).toBe(false);
    expect(isLasso([[0, 0]])).toBe(false);
  });

  it('knows what a loop encloses', () => {
    const loop = circle(50, 50, 30);
    expect(insideLoop([50, 50], loop)).toBe(true);
    expect(insideLoop([95, 95], loop)).toBe(false);
  });

  it('builds a loop from boxes that contains all of their centres', () => {
    const boxes: [number, number, number, number][] = [
      [0, 0, 20, 20],
      [80, 80, 20, 20],
    ];
    const hull = hullOf(boxes);
    expect(hull.length).toBeGreaterThanOrEqual(3);
    for (const box of boxes) expect(insideLoop(boxCenter(box), hull)).toBe(true);
    expect(insideLoop([50, 5], hull)).toBe(false);
  });

  it('centres a box where a ring should land', () => {
    expect(boxCenter([10, 20, 40, 60])).toEqual([30, 50]);
  });
});

describe('the default figure box', () => {
  it('is a hundred units square, so every figure scales from one number', () => {
    expect(FIGURE_BOX).toEqual([0, 0, 100, 100]);
  });
});
