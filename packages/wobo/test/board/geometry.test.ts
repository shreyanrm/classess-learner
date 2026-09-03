import { beforeAll, describe, expect, it } from 'bun:test';
import { type AnchorContext, type BoardRect, frameOf } from '../../src/board/anchors';
import { formatQuantity, geometryOf } from '../../src/board/geometry';
import { type HandFont, parseHandFont } from '../../src/board/handwriting';
import type { BoardObject } from '../../src/board/schema';

const FONT_PATH = new URL(
  '../../../../apps/web-pwa/public/fonts/Caveat-Regular.ttf',
  import.meta.url,
).pathname;

let font: HandFont | null = null;
beforeAll(async () => {
  font = await parseHandFont(await Bun.file(FONT_PATH).arrayBuffer());
});

const frame = frameOf({ x: 0, y: 0, width: 1000, height: 620 });
const TARGET = { x: 200, y: 100, width: 120, height: 40 };
const boxes = new Map<string, BoardRect>([['prev', { x: 400, y: 400, w: 60, h: 30 }]]);

function ctx(over: Partial<AnchorContext & { font: HandFont | null }> = {}) {
  return {
    frame,
    targetRect: (id: string) => (id === 'btn' ? TARGET : null),
    focusRect: (id: string) => (id === 'f1' ? TARGET : null),
    objectBox: (id: string) => boxes.get(id) ?? null,
    font,
    occupied: [],
    ...over,
  };
}

/** One representative of every kind in the grammar, so nothing can be added without geometry. */
const SPECIMENS: BoardObject[] = [
  { id: 'k1', kind: 'point', anchor: { target: 'btn' } },
  { id: 'k2', kind: 'circle', anchor: { target: 'btn' } },
  { id: 'k3', kind: 'underline', anchor: { target: 'btn' } },
  { id: 'k4', kind: 'arrow', anchor: { target: 'btn' }, from: { board: [50, 50] } },
  { id: 'k5', kind: 'bracket', anchor: { target: 'btn' }, side: 'left', label: 'both of these' },
  { id: 'k6', kind: 'strike', anchor: { target: 'btn' } },
  { id: 'k7', kind: 'number', anchor: { board: [10, 10] }, value: 25, verified: true },
  { id: 'k8', kind: 'write', anchor: { board: [10, 60] }, text: 'so c = 5' },
  { id: 'k9', kind: 'erase', anchor: { board: [0, 0] }, object: 'prev' },
  { id: 'k10', kind: 'wipe' },
  { id: 'k11', kind: 'line', anchor: { board: [0, 0] }, to: { board: [100, 100] } },
  {
    id: 'k12',
    kind: 'polyline',
    anchor: { board: [0, 0] },
    points: [
      [0, 0],
      [50, 20],
    ],
  },
  {
    id: 'k13',
    kind: 'curve',
    anchor: { board: [0, 0] },
    points: [
      [0, 0],
      [40, -30],
      [80, 0],
    ],
  },
  {
    id: 'k14',
    kind: 'polygon',
    anchor: { board: [0, 0] },
    points: [
      [0, 0],
      [60, 0],
      [0, 45],
    ],
  },
  { id: 'k15', kind: 'ellipse', anchor: { board: [200, 200] }, rx: 40, ry: 25 },
  {
    id: 'k16',
    kind: 'axis',
    anchor: { board: [100, 500] },
    orientation: 'x',
    min: 0,
    max: 10,
    step: 2,
    length: 400,
    label: 'x',
  },
  { id: 'k17', kind: 'grid', anchor: { board: [0, 0] }, cols: 4, rows: 4, w: 200, h: 200 },
  {
    id: 'k18',
    kind: 'table',
    anchor: { board: [0, 0] },
    rows: [
      ['a', 'b'],
      ['1', '2'],
    ],
    w: 200,
  },
  { id: 'k19', kind: 'label', anchor: { target: 'btn' }, text: 'here' },
  { id: 'k20', kind: 'tex', anchor: { board: [0, 0] }, tex: 'a^2 + b^2 = c^2' },
  { id: 'k21', kind: 'bond', anchor: { board: [100, 100] }, to: [60, 0], order: 2 },
  { id: 'k22', kind: 'atom', anchor: { board: [300, 300] }, symbol: 'O', charge: -2, lonePairs: 2 },
  { id: 'k23', kind: 'region', anchor: { board: [0, 0] }, w: 300, h: 200, title: 'step one' },
  {
    id: 'k24',
    kind: 'image',
    anchor: { board: [0, 0] },
    href: '/x.png',
    w: 100,
    h: 80,
    alt: 'a leaf',
  },
  {
    id: 'k25',
    kind: 'slider',
    anchor: { board: [100, 300] },
    variable: 'theta',
    min: 0,
    max: 90,
    value: 30,
    label: 'angle',
  },
  { id: 'k26', kind: 'toggle', anchor: { board: [100, 350] }, variable: 'showAll', value: true },
  { id: 'k27', kind: 'input', anchor: { board: [100, 400] }, variable: 'x', value: '5' },
  { id: 'k28', kind: 'drag', anchor: { board: [100, 450] }, variable: 'p', value: [20, 10] },
];

describe('every kind in the grammar has geometry', () => {
  it('draws something for all twenty-eight, with a real box', () => {
    for (const object of SPECIMENS) {
      const geometry = geometryOf(object, ctx());
      expect(geometry, object.kind).not.toBeNull();
      if (!geometry) continue;
      const drew =
        geometry.strokes.length + geometry.glyphs.length > 0 ||
        geometry.image !== undefined ||
        geometry.text !== undefined;
      expect(drew, object.kind).toBe(true);
      expect(Number.isFinite(geometry.box.x), object.kind).toBe(true);
      expect(Number.isFinite(geometry.box.w), object.kind).toBe(true);
      for (const s of geometry.strokes) expect(s.d, object.kind).not.toContain('NaN');
    }
  });

  it('is deterministic — the same object twice draws the same ink', () => {
    for (const object of SPECIMENS.slice(0, 8)) {
      const a = geometryOf(object, ctx());
      const b = geometryOf(object, ctx());
      expect(a?.strokes.map((s) => s.d)).toEqual(b?.strokes.map((s) => s.d) ?? []);
    }
  });
});

describe('anchors decide where the ink lands', () => {
  it('a mark on a live target sits on that target', () => {
    const g = geometryOf({ id: 'u', kind: 'underline', anchor: { target: 'btn' } }, ctx());
    // The target rect in board units is x 200..320, y 100..140.
    expect(g?.box.x).toBeLessThan(210);
    expect(g?.box.y).toBeGreaterThan(135);
  });

  it('a mark whose target is gone has no geometry at all', () => {
    expect(
      geometryOf({ id: 'u', kind: 'underline', anchor: { target: 'ghost' } }, ctx()),
    ).toBeNull();
  });

  it('reads a learner focus region', () => {
    expect(geometryOf({ id: 'c', kind: 'circle', anchor: { focus: 'f1' } }, ctx())).not.toBeNull();
  });

  it('an erase swipes across the object it takes off the board', () => {
    const g = geometryOf(
      { id: 'e', kind: 'erase', anchor: { board: [0, 0] }, object: 'prev' },
      ctx(),
    );
    expect(g?.box.x ?? 0).toBeLessThan(400);
    expect((g?.box.x ?? 0) + (g?.box.w ?? 0)).toBeGreaterThan(460);
  });

  it('shape points are offsets from the anchor, so a shape travels with what it hangs off', () => {
    const near = geometryOf(
      {
        id: 'p',
        kind: 'polyline',
        anchor: { board: [0, 0] },
        points: [
          [0, 0],
          [10, 0],
        ],
      },
      ctx(),
    );
    const far = geometryOf(
      {
        id: 'p',
        kind: 'polyline',
        anchor: { board: [500, 0] },
        points: [
          [0, 0],
          [10, 0],
        ],
      },
      ctx(),
    );
    expect((far?.box.x ?? 0) - (near?.box.x ?? 0)).toBeCloseTo(500, 5);
  });
});

describe('written objects', () => {
  it('a note beside a target is placed clear of it', () => {
    const g = geometryOf(
      { id: 'w', kind: 'write', anchor: { target: 'btn' }, text: 'look' },
      ctx(),
    );
    expect(g?.box.x).toBeGreaterThan(320); // to the right of the target, with a margin
  });

  it('a note in free board space is exactly where it was put', () => {
    const g = geometryOf({ id: 'w', kind: 'write', anchor: { board: [40, 90] }, text: 'x' }, ctx());
    expect(g?.box.x).toBe(40);
    expect(g?.box.y).toBe(90);
  });

  it('falls back to plain text when the font never arrived', () => {
    const g = geometryOf(
      { id: 'w', kind: 'write', anchor: { board: [0, 0] }, text: 'hello' },
      ctx({ font: null }),
    );
    expect(g?.glyphs).toHaveLength(0);
    expect(g?.text?.lines).toEqual(['hello']);
  });

  it('a number is written as it was computed, with its unit', () => {
    expect(formatQuantity(25, undefined, undefined)).toBe('25');
    expect(formatQuantity(9.80665, 2, 'm/s²')).toBe('9.81 m/s²');
  });
});

describe('controls carry their own hit area and variable', () => {
  it('a slider knob follows its value', () => {
    const low = geometryOf(
      {
        id: 's',
        kind: 'slider',
        anchor: { board: [0, 100] },
        variable: 'v',
        min: 0,
        max: 10,
        value: 0,
      },
      ctx(),
    );
    const high = geometryOf(
      {
        id: 's',
        kind: 'slider',
        anchor: { board: [0, 100] },
        variable: 'v',
        min: 0,
        max: 10,
        value: 10,
      },
      ctx(),
    );
    expect((high?.control?.knob?.x ?? 0) - (low?.control?.knob?.x ?? 0)).toBeCloseTo(200, 5);
    expect(low?.control?.variable).toBe('v');
    expect(low?.control?.kind).toBe('slider');
  });

  it('every control exposes a hit area', () => {
    for (const object of SPECIMENS.filter((s) =>
      ['slider', 'toggle', 'input', 'drag'].includes(s.kind),
    )) {
      const g = geometryOf(object, ctx());
      expect(g?.control?.hit.w, object.kind).toBeGreaterThan(0);
      expect(g?.control?.hit.h, object.kind).toBeGreaterThan(0);
    }
  });
});
