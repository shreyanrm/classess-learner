import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetFocusIds } from '../src/focus';
import {
  armLasso,
  chipPosition,
  DEFAULT_HOTKEY,
  FOCUS_FROST,
  FOCUS_RING_FADE_MS,
  FOCUS_RING_WIDTH,
  focusRingPath,
  isTypingTarget,
  lassoArmed,
  matchesHotkey,
  pathD,
  resolveFocus,
  targetIdsInPath,
} from '../src/gesture';
import { type Rect, SurfaceRegistry, type SurfaceTarget } from '../src/registry';

const chord = (over: Partial<KeyboardEvent> = {}) =>
  ({
    code: 'Space',
    key: ' ',
    altKey: false,
    ctrlKey: false,
    shiftKey: false,
    metaKey: false,
    ...over,
  }) as Pick<KeyboardEvent, 'code' | 'key' | 'altKey' | 'ctrlKey' | 'shiftKey' | 'metaKey'>;

const rect = (x: number, y: number, w: number, h: number): Rect => ({ x, y, width: w, height: h });

const target = (id: string, box: Rect, over: Partial<SurfaceTarget> = {}): SurfaceTarget => ({
  id,
  kind: 'cell',
  label: `the ${id}`,
  rect: () => box,
  ...over,
});

beforeEach(() => resetFocusIds());
afterEach(() => armLasso(false));

describe('the hold-to-talk hotkey', () => {
  it('defaults to alt and space', () => {
    expect(DEFAULT_HOTKEY).toEqual({ code: 'Space', alt: true });
    expect(matchesHotkey(chord({ altKey: true }))).toBe(true);
  });

  it('refuses the key without its modifier — space still types a space', () => {
    expect(matchesHotkey(chord())).toBe(false);
  });

  it('refuses extra modifiers, so a different chord is a different action', () => {
    expect(matchesHotkey(chord({ altKey: true, shiftKey: true }))).toBe(false);
  });

  it('is configurable, by code or by key', () => {
    expect(
      matchesHotkey(chord({ code: 'KeyK', key: 'k', metaKey: true }), { code: 'KeyK', meta: true }),
    ).toBe(true);
    expect(
      matchesHotkey(chord({ code: 'KeyK', key: 'K', ctrlKey: true }), { key: 'k', ctrl: true }),
    ).toBe(true);
    expect(
      matchesHotkey(chord({ code: 'KeyJ', key: 'j', ctrlKey: true }), { key: 'k', ctrl: true }),
    ).toBe(false);
  });
});

describe('typing is typing, never a gesture', () => {
  it('recognises fields and contenteditable', () => {
    expect(isTypingTarget({ tagName: 'INPUT' } as unknown as EventTarget)).toBe(true);
    expect(isTypingTarget({ tagName: 'TEXTAREA' } as unknown as EventTarget)).toBe(true);
    expect(isTypingTarget({ tagName: 'SELECT' } as unknown as EventTarget)).toBe(true);
    expect(
      isTypingTarget({ tagName: 'DIV', isContentEditable: true } as unknown as EventTarget),
    ).toBe(true);
  });

  it('leaves ordinary content alone', () => {
    expect(isTypingTarget({ tagName: 'P' } as unknown as EventTarget)).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
    expect(isTypingTarget({} as unknown as EventTarget)).toBe(false);
  });
});

describe('arming the circle', () => {
  it('is off until it is asked for, and notifies', () => {
    expect(lassoArmed()).toBe(false);
    armLasso();
    expect(lassoArmed()).toBe(true);
    armLasso(false);
    expect(lassoArmed()).toBe(false);
  });
});

describe('the chip stays on screen and out of the way', () => {
  const viewport = { width: 400, height: 300 };

  it('sits just under the focus', () => {
    expect(chipPosition(rect(40, 40, 100, 20), viewport)).toEqual({ x: 40, y: 68 });
  });

  it('flips above when the focus is at the bottom edge', () => {
    const at = chipPosition(rect(40, 260, 100, 20), viewport);
    expect(at.y).toBeLessThan(260);
  });

  it('never runs off the right edge', () => {
    expect(chipPosition(rect(390, 10, 10, 10), viewport).x).toBe(400 - 168 - 8);
  });

  it('never runs off the top or the left', () => {
    const at = chipPosition(rect(-50, -50, 10, 10), viewport);
    expect(at.x).toBeGreaterThanOrEqual(8);
    expect(at.y).toBeGreaterThanOrEqual(8);
  });
});

describe('the live trace', () => {
  it('draws exactly where the pointer went, at whole pixels', () => {
    expect(
      pathD([
        { x: 0.4, y: 0.6 },
        { x: 10.2, y: 4 },
      ]),
    ).toBe('M 0 1 L 10 4');
    expect(pathD([])).toBe('');
  });
});

describe('resolving a circle against the registry', () => {
  const registry = new SurfaceRegistry();
  registry.registerSurface({
    id: 'workbook',
    title: 'The workbook',
    targets: [
      target('cell-a', rect(10, 10, 40, 40), {
        text: () => '2x + 3 = 11',
        value: () => ({ answer: null }),
      }),
      target('cell-b', rect(300, 300, 40, 40), { text: () => 'x = 4' }),
    ],
  });

  const loop = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
    { x: 0, y: 0 },
  ];

  it('catches only the targets whose centre is inside the loop', () => {
    expect(targetIdsInPath(loop, registry)).toEqual(['cell-a']);
  });

  it('builds a focus with the target text, its numbers and its live state', () => {
    const focus = resolveFocus({
      kind: 'lasso',
      rect: { x: 0, y: 0, width: 100, height: 100 },
      targetIds: targetIdsInPath(loop, registry),
      path: loop,
      registry,
    });
    expect(focus.kind).toBe('lasso');
    expect(focus.targetIds).toEqual(['cell-a']);
    expect(focus.text).toBe('2x + 3 = 11');
    expect(focus.numbers).toEqual([2, 3, 11]);
    expect(focus.ownerState).toEqual({ 'cell-a': { answer: null } });
    expect(focus.surfaceId).toBe('workbook');
    expect(focus.path?.length).toBeGreaterThan(1);
  });

  it('prefers the text the gesture itself carries, e.g. a selection', () => {
    const focus = resolveFocus({
      kind: 'selection',
      rect: rect(10, 10, 40, 40),
      targetIds: ['cell-a'],
      text: 'moved across',
      registry,
    });
    expect(focus.text).toBe('moved across');
  });

  it('still resolves over unregistered space, with honest empty target ids', () => {
    const focus = resolveFocus({ kind: 'lasso', rect: rect(900, 900, 10, 10), registry });
    expect(focus.targetIds).toEqual([]);
    expect(focus.text).toBe('');
  });
});

// --- Wave 5 polish: the region Wobo circled is a ring, never a fill --------------------------------

describe("the focus region is drawn as Wobo's own line round it", () => {
  const lasso = [
    { x: 100, y: 100 },
    { x: 220, y: 96 },
    { x: 240, y: 200 },
    { x: 110, y: 210 },
  ];

  it('is a 1.5 px line with at most a 4% ultramarine frost — never a warm fill', () => {
    expect(FOCUS_RING_WIDTH).toBe(1.5);
    const [, r, g, b, alpha] = /rgba\((\d+),(\d+),(\d+),([\d.]+)\)/.exec(FOCUS_FROST) ?? [];
    expect(Number(alpha)).toBeLessThanOrEqual(0.04);
    // Ultramarine (#1F35E0): blue-dominant. A salmon fill would be red-dominant.
    expect(Number(b)).toBeGreaterThan(Number(r));
    expect(Number(b)).toBeGreaterThan(Number(g));
    expect(FOCUS_FROST).toBe('rgba(31,53,224,0.04)');
  });

  it('follows the path the finger took, and closes it', () => {
    const focus = { id: 'focus-1', rect: rect(100, 96, 140, 114), path: lasso };
    const d = focusRingPath(focus);
    expect(d.startsWith('M ')).toBe(true);
    expect(d.trimEnd().endsWith('Z')).toBe(true);
    const xs = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number).filter((_, i) => i % 2 === 0);
    // Within a wobble of the region the learner drew, not a box round the whole page.
    expect(Math.min(...xs)).toBeGreaterThan(90);
    expect(Math.max(...xs)).toBeLessThan(250);
  });

  it('is hand-wobbled, and the same hand every time for one region', () => {
    const focus = { id: 'focus-1', rect: rect(100, 96, 140, 114), path: lasso };
    expect(focusRingPath(focus)).toBe(focusRingPath(focus));
    // A different region is a different hand.
    expect(focusRingPath({ ...focus, id: 'focus-2' })).not.toBe(focusRingPath(focus));
    // And it is not the bare polyline: the ink strays from the points the finger passed through.
    expect(focusRingPath(focus)).not.toBe(pathD(lasso));
  });

  it('rings a region that never had a path — a selection, a hover', () => {
    const d = focusRingPath({ id: 'focus-3', rect: rect(300, 300, 120, 40) });
    expect(d.length).toBeGreaterThan(40);
    expect(d.trimEnd().endsWith('Z')).toBe(true);
  });

  it('travels with the thing it is about', () => {
    const focus = { id: 'focus-4', rect: rect(100, 96, 140, 114), path: lasso };
    const still = focusRingPath(focus);
    const moved = focusRingPath(focus, { x: 0, y: -300 });
    expect(moved).not.toBe(still);
    const ysOf = (d: string) =>
      (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number).filter((_, i) => i % 2 === 1);
    expect(Math.min(...ysOf(moved))).toBeCloseTo(Math.min(...ysOf(still)) - 300, 1);
  });

  it('fades after the turn rather than vanishing with it', () => {
    expect(FOCUS_RING_FADE_MS).toBeGreaterThan(200);
  });
});
