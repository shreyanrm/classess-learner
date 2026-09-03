/**
 * The Wave 5 board seams, held against the real golden boards (docs/BOARD.md §6, §7).
 *
 * Not pixels: geometry. Every one of these was a visible failure on a proof shot — an arrow driven
 * through the word it pointed at, a written power showing its caret, a note landing beside the
 * thing it was asked to sit under, three objects at a fifth of the plane.
 */

import { beforeAll, describe, expect, it } from 'bun:test';
import {
  type AnchorContext,
  type BoardObject,
  type BoardRect,
  cameraBox,
  contentBounds,
  fitCamera,
  frameOf,
  geometryOf,
  type HandFont,
  parseHandFont,
} from '@wobo/wobo';
import { GOLDEN_BOARDS } from './goldens';

const FONT_PATH = new URL('../../public/fonts/Caveat-Regular.ttf', import.meta.url).pathname;

let font: HandFont | null = null;
beforeAll(async () => {
  font = await parseHandFont(await Bun.file(FONT_PATH).arrayBuffer());
});

/** The plane, at the size the app actually gives it. */
const frame = frameOf({ x: 0, y: 0, width: 1000, height: 620 });

/** Every ink object of one golden, in order. */
function objectsOf(name: string): BoardObject[] {
  const board = GOLDEN_BOARDS.find((b) => b.name === name);
  if (!board) throw new Error(`no golden board called ${name}`);
  return board.plan.flatMap((e) => (e.type === 'ink' ? [e.object as BoardObject] : []));
}

/**
 * Build a whole golden the way the renderer does: object boxes accumulate, so a mark anchored to
 * an earlier object resolves against the box that object actually took.
 */
function buildBoard(
  name: string,
  over: Partial<AnchorContext & { font: HandFont | null }> = {},
): Map<string, { box: BoardRect; strokes: { d: string }[]; lines: string[] }> {
  const boxes = new Map<string, BoardRect>();
  const out = new Map<string, { box: BoardRect; strokes: { d: string }[]; lines: string[] }>();
  const occupied: BoardRect[] = [];
  for (const object of objectsOf(name)) {
    const geometry = geometryOf(object, {
      frame,
      targetRect: () => null,
      focusRect: () => null,
      objectBox: (id: string) => boxes.get(id) ?? null,
      font,
      occupied,
      ...over,
    });
    if (!geometry) continue;
    boxes.set(object.id, geometry.box);
    occupied.push(geometry.box);
    out.set(object.id, {
      box: geometry.box,
      strokes: geometry.strokes,
      lines: geometry.text?.lines ?? [],
    });
  }
  return out;
}

/** The middle vertex of an arrowhead path `M a L tip L b` — where the arrow actually lands. */
function tipOf(d: string): [number, number] {
  const n = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  return [n[2] ?? 0, n[3] ?? 0];
}

const inside = (box: BoardRect, [x, y]: [number, number]): boolean =>
  x > box.x && x < box.x + box.w && y > box.y && y < box.y + box.h;

describe('an arrow lands on the outline of what it points at', () => {
  it('the plant cell’s labels point AT their organelles, never through them', () => {
    const built = buildBoard('plant-cell');
    const arrows = objectsOf('plant-cell').filter((o) => o.kind === 'arrow');
    expect(arrows.length).toBeGreaterThan(3);
    for (const arrow of arrows) {
      const anchor = 'anchor' in arrow ? arrow.anchor : undefined;
      if (!anchor || !('object' in anchor)) continue;
      const target = built.get(anchor.object);
      const drawn = built.get(arrow.id);
      if (!target || !drawn) continue;
      const tip = tipOf(drawn.strokes[1]?.d ?? '');
      // Outside the box, not driven to its centre.
      expect(inside(target.box, tip)).toBe(false);
    }
  });

  it('the food web’s arrows stop short of the words they connect', () => {
    const built = buildBoard('food-web');
    const eats = objectsOf('food-web').filter((o) => o.id.startsWith('eats-'));
    expect(eats).toHaveLength(6);
    for (const arrow of eats) {
      const anchor = 'anchor' in arrow ? arrow.anchor : undefined;
      if (!anchor || !('object' in anchor)) continue;
      const target = built.get(anchor.object);
      const drawn = built.get(arrow.id);
      if (!target || !drawn) continue;
      const tip = tipOf(drawn.strokes[1]?.d ?? '');
      expect(inside(target.box, tip)).toBe(false);
      // …and near it, not stranded halfway across the board.
      const cx = target.box.x + target.box.w / 2;
      const cy = target.box.y + target.box.h / 2;
      expect(Math.hypot(tip[0] - cx, tip[1] - cy)).toBeLessThan(
        Math.hypot(target.box.w, target.box.h),
      );
    }
  });
});

describe('a written power is written as a power', () => {
  it('the Pythagoras law writes a² + b² = c², never its own carets', () => {
    for (const withFont of [font, null]) {
      const built = buildBoard('pythagoras', { font: withFont });
      const law = built.get('law');
      expect(law).toBeDefined();
      for (const line of law?.lines ?? []) expect(line).not.toContain('^');
    }
  });

  it('no golden board writes a caret or an underscore-index at a learner', () => {
    for (const board of GOLDEN_BOARDS) {
      const built = buildBoard(board.name, { font: null });
      for (const [id, drawn] of built) {
        for (const line of drawn.lines) {
          expect(`${id}: ${line}`).not.toMatch(/\^\d/);
          expect(`${id}: ${line}`).not.toMatch(/[A-Za-z]_\d/);
        }
      }
    }
  });
});

describe('a note anchored to a side lands on that side', () => {
  it('{object, at:"bottom"} sits under the organelle, left-aligned to it', () => {
    const boxes = new Map<string, BoardRect>([['nucleus', { x: 330, y: 260, w: 140, h: 90 }]]);
    const note: BoardObject = {
      id: 'under',
      kind: 'label',
      anchor: { object: 'nucleus', at: 'bottom' },
      text: 'holds the DNA',
    } as BoardObject;
    const geometry = geometryOf(note, {
      frame,
      targetRect: () => null,
      focusRect: () => null,
      objectBox: (id: string) => boxes.get(id) ?? null,
      font,
      occupied: [],
    });
    const anchor = boxes.get('nucleus') as BoardRect;
    expect(geometry?.box.x).toBeCloseTo(anchor.x, 4);
    expect(geometry?.box.y).toBeGreaterThanOrEqual(anchor.y + anchor.h);
  });
});

describe('the plane fits what Wobo has drawn', () => {
  it('three objects fill the box instead of sitting at a fifth of it', () => {
    const drawn: BoardRect[] = [
      { x: 300, y: 260, w: 90, h: 40 },
      { x: 420, y: 260, w: 90, h: 40 },
      { x: 300, y: 330, w: 210, h: 40 },
    ];
    const bounds = contentBounds(drawn) as BoardRect;
    const view = cameraBox(fitCamera(bounds, frame), frame);
    const fill = Math.max(bounds.w / view.w, bounds.h / view.h);
    expect(fill).toBeGreaterThanOrEqual(0.7);
    expect(fill).toBeLessThanOrEqual(0.85);
    expect(view.x + view.w / 2).toBeCloseTo(bounds.x + bounds.w / 2, 6);
  });

  it('follows a whole golden board as it grows, and never crops it', () => {
    const built = buildBoard('food-web');
    const boxes = [...built.values()].map((b) => b.box);
    for (let n = 1; n <= boxes.length; n += 1) {
      const bounds = contentBounds(boxes.slice(0, n)) as BoardRect;
      const view = cameraBox(fitCamera(bounds, frame), frame);
      const fill = Math.max(bounds.w / view.w, bounds.h / view.h);
      expect(fill).toBeLessThanOrEqual(0.851);
      // Everything drawn so far is inside the window the camera shows.
      expect(bounds.x).toBeGreaterThanOrEqual(view.x - 0.001);
      expect(bounds.y).toBeGreaterThanOrEqual(view.y - 0.001);
      expect(bounds.x + bounds.w).toBeLessThanOrEqual(view.x + view.w + 0.001);
      expect(bounds.y + bounds.h).toBeLessThanOrEqual(view.y + view.h + 0.001);
    }
  });
});
