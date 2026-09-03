/**
 * The hero's lesson clock, and the pen's place on it.
 *
 * The loop has to be a loop — fourteen seconds of drawing, three and a half holding the finished
 * board, then back to a clean board — and the learner's question has to clear off the board while
 * the drawing happens and be back when it starts again. Both are arithmetic, and both are the kind
 * of thing that quietly stops looping when a modulus moves.
 */

import { describe, expect, it } from 'bun:test';
import {
  activeSpan,
  bubbleGone,
  createLesson,
  DEMO_HOLD,
  DEMO_MS,
  demoPhase,
  type StrokeSpan,
  strokeAmount,
  tiltAngles,
} from './demo';
import { createPointerState } from './pointer';

describe('demoPhase', () => {
  it('draws across the demo and holds the finished board', () => {
    expect(demoPhase(0)).toBe(0);
    expect(demoPhase(DEMO_MS / 2)).toBeCloseTo(0.5);
    expect(demoPhase(DEMO_MS)).toBe(1);
    expect(demoPhase(DEMO_MS + DEMO_HOLD / 2)).toBe(1);
  });

  it('starts over on a clean board', () => {
    expect(demoPhase(DEMO_MS + DEMO_HOLD)).toBe(0);
    expect(demoPhase(2 * (DEMO_MS + DEMO_HOLD) + 1000)).toBeCloseTo(1000 / DEMO_MS);
  });
});

describe('bubbleGone', () => {
  it('keeps the question up while the board is still empty', () => {
    expect(bubbleGone(0)).toBe(false);
    expect(bubbleGone(0.12)).toBe(false);
  });

  it('clears it off while Wobo draws', () => {
    expect(bubbleGone(0.5)).toBe(true);
  });

  it('brings it back for the next pass', () => {
    expect(bubbleGone(1)).toBe(false);
  });
});

describe('strokeAmount', () => {
  it('is 0 before its window, 1 after, and linear inside', () => {
    const span: StrokeSpan = { s: 0.2, e: 0.4 };
    expect(strokeAmount(0.1, span)).toBe(0);
    expect(strokeAmount(0.3, span)).toBeCloseTo(0.5);
    expect(strokeAmount(0.9, span)).toBe(1);
  });
});

describe('activeSpan', () => {
  const spans: StrokeSpan[] = [
    { s: 0, e: 0.2 },
    { s: 0.15, e: 0.5 },
    { s: 0.5, e: 1 },
  ];

  it('finds the mark being drawn', () => {
    expect(activeSpan(spans, 0.05)?.index).toBe(0);
    expect(activeSpan(spans, 0.4)?.index).toBe(1);
    expect(activeSpan(spans, 0.75)?.index).toBe(2);
  });

  it('puts the pen on the newer line where two windows overlap', () => {
    expect(activeSpan(spans, 0.18)?.index).toBe(1);
  });

  it('has nothing active on a finished board, so the pen can fade out', () => {
    expect(activeSpan(spans, 1)).toBeNull();
  });
});

describe('tiltAngles', () => {
  const rect = { left: 200, top: 100, width: 400, height: 300 };
  const viewport = { width: 1200, height: 800 };

  it('sits flat when the pointer is over the middle of the card', () => {
    const pointer = createPointerState();
    pointer.x = 400;
    pointer.y = 250;
    expect(tiltAngles(pointer, rect, viewport)).toEqual({ rx: -0, ry: 0 });
  });

  it('turns toward the pointer, and no further than six degrees', () => {
    const pointer = createPointerState();
    pointer.x = 1200;
    pointer.y = 800;
    const { rx, ry } = tiltAngles(pointer, rect, viewport);
    expect(ry).toBeGreaterThan(0);
    expect(rx).toBeLessThan(0);
    expect(Math.abs(ry)).toBeLessThanOrEqual(6);
    expect(Math.abs(rx)).toBeLessThanOrEqual(6);
  });

  it('reads a viewport with no size as flat rather than as infinity', () => {
    const pointer = createPointerState();
    expect(tiltAngles(pointer, rect, { width: 0, height: 0 })).toEqual({ rx: 0, ry: 0 });
  });
});

/** A path-shaped double: a straight line 100 units long, so the pen's place on it is arithmetic. */
function path(s: string, e: string) {
  return {
    tagName: 'path',
    style: {} as Record<string, string>,
    getAttribute: (name: string) => (name === 'data-s' ? s : name === 'data-e' ? e : null),
    getTotalLength: () => 100,
    getPointAtLength: (l: number) => ({ x: l, y: 50 }),
    getBBox: () => ({ x: 0, y: 0, width: 100, height: 20 }),
  };
}

/** A handwriting-shaped double — it fades in rather than drawing. */
function word(s: string, e: string) {
  return {
    tagName: 'text',
    style: {} as Record<string, string>,
    getAttribute: (name: string) => (name === 'data-s' ? s : name === 'data-e' ? e : null),
    getBBox: () => ({ x: 400, y: 100, width: 80, height: 30 }),
  };
}

function board() {
  const marks = [path('0', '0.5'), word('0.5', '1')];
  const root = { querySelectorAll: () => marks };
  const attrs: Record<string, string> = {};
  const pen = { setAttribute: (name: string, value: string) => (attrs[name] = value) };
  const eyes = { style: {} as Record<string, string> };
  const wobo = { querySelector: () => eyes };
  return { marks, root, pen, attrs, eyes, wobo };
}

function lessonOf(parts: ReturnType<typeof board>) {
  return createLesson(
    parts.root as unknown as Element,
    parts.pen as unknown as SVGGraphicsElement,
    parts.wobo as unknown as Element,
  );
}

describe('createLesson', () => {
  it('starts with every mark undrawn', () => {
    const parts = board();
    lessonOf(parts);
    expect(parts.marks[0]?.style.strokeDashoffset).toBe('100');
    expect(parts.marks[0]?.style.strokeDasharray).toBe('100');
    expect(parts.marks[1]?.style.opacity).toBe('0');
  });

  it('draws a path by lifting its dash offset', () => {
    const parts = board();
    const lesson = lessonOf(parts);
    lesson.draw(0.25);
    expect(parts.marks[0]?.style.strokeDashoffset).toBe('50');
    lesson.draw(0.5);
    expect(parts.marks[0]?.style.strokeDashoffset).toBe('0');
  });

  it('fades handwriting in rather than drawing it', () => {
    const parts = board();
    const lesson = lessonOf(parts);
    lesson.draw(0.75);
    expect(Number(parts.marks[1]?.style.opacity)).toBeCloseTo(0.8);
  });

  it('carries the pen along the mark being drawn, and shows it only then', () => {
    const parts = board();
    const lesson = lessonOf(parts);
    for (let i = 0; i < 40; i++) lesson.draw(0.25);
    // Half way through the first mark's window is half way along its length.
    const [x, y] = (parts.attrs.transform ?? '')
      .replace(/[^\d. ]/g, '')
      .trim()
      .split(' ')
      .map(Number);
    expect(x).toBeCloseTo(50, 1);
    expect(y).toBeCloseTo(50, 1);
    expect(Number(parts.attrs.opacity)).toBe(1);
  });

  it('fades the pen out once the board is finished', () => {
    const parts = board();
    const lesson = lessonOf(parts);
    lesson.draw(0.25);
    for (let i = 0; i < 40; i++) lesson.draw(1);
    expect(Number(parts.attrs.opacity)).toBeLessThan(0.01);
  });

  it("turns Wobo's eyes toward the pen", () => {
    const parts = board();
    const lesson = lessonOf(parts);
    for (let i = 0; i < 20; i++) lesson.draw(0.25);
    expect(parts.eyes.style.transform).toMatch(/^translate\(-?\d/);
  });

  it('puts the board back on reset, so a remount starts from a clean frame', () => {
    const parts = board();
    const lesson = lessonOf(parts);
    lesson.draw(0.75);
    lesson.reset();
    expect(parts.marks[0]?.style.strokeDashoffset).toBe('100');
    expect(parts.marks[1]?.style.opacity).toBe('0');
    expect(parts.attrs.opacity).toBe('0');
  });

  it('is inert on a page with no board', () => {
    const lesson = createLesson(null, null, null);
    expect(lesson.count).toBe(0);
    lesson.draw(0.5);
    lesson.reset();
  });
});
