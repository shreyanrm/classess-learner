import { describe, expect, it } from 'bun:test';
import { BoardStore, createFocus, focusRectNow, parseBoardEvent } from '@wobo/wobo';
import { boardTargets, focusRegionsFor, lessonStore, screenStore } from './board-turn';

const RECT = { x: 4, y: 8, width: 100, height: 30 };

describe("the focus regions Wobo's ink can anchor to", () => {
  it('is empty when the learner has pointed at nothing', () => {
    expect(focusRegionsFor(null)).toEqual([]);
  });
  it('carries the region they circled, by id, as a live rect', () => {
    const focus = createFocus({ kind: 'lasso', rect: RECT });
    const regions = focusRegionsFor(focus);
    expect(regions).toHaveLength(1);
    expect(regions[0]?.id).toBe(focus.id);
    // A thunk, not a value: BOARD.md §3 re-resolves an anchor on scroll and it never floats.
    expect(typeof regions[0]?.rect).toBe('function');
    expect(regions[0]?.rect()).toEqual(RECT);
  });
});

describe('a region the learner circled, after the page has moved', () => {
  it('follows the target it was drawn round, keeping the shape Wobo drew', () => {
    const film = { x: 0, y: 0, width: 540, height: 320 };
    const focus = createFocus({
      kind: 'lasso',
      rect: RECT,
      targetIds: ['video-frame'],
      anchorRect: film,
    });
    // The film scrolled 300 px up; the ring is on the film, not on the pixels it used to occupy.
    expect(focusRectNow(focus, { target: () => ({ ...film, y: -300 }) })).toEqual({
      ...RECT,
      y: RECT.y - 300,
    });
  });

  it('falls back to the page scroll when nothing under it was registered', () => {
    const focus = createFocus({ kind: 'selection', rect: RECT, scroll: { x: 0, y: 0 } });
    expect(focusRectNow(focus, { scroll: { x: 0, y: 300 } })).toEqual({ ...RECT, y: 8 - 300 });
  });

  it('is the rect it was made with when the page has not moved', () => {
    const focus = createFocus({ kind: 'selection', rect: RECT, scroll: { x: 0, y: 40 } });
    expect(focusRectNow(focus, { scroll: { x: 0, y: 40 } })).toEqual(RECT);
  });
});

describe('the surfaces the app mounts', () => {
  it('the screen fades like a whiteboard; a lesson board keeps its ink', () => {
    expect(screenStore.presentation).toBe('screen');
    expect(lessonStore.presentation).toBe('full');
  });
  it('offers every registered target to the renderer as a live rect', () => {
    // With nothing registered there is nothing to anchor to — and that is a list, never a throw.
    expect(Array.isArray(boardTargets())).toBe(true);
  });
});

/**
 * The pen is on the voice's clock: `t.start` is measured from the instant the utterance opens, so
 * an object timed at 900 ms does not begin the moment its frame lands off the wire.
 */
describe('the utterance clock the plan is timed against', () => {
  const plan = (t: number) =>
    parseBoardEvent({
      type: 'ink',
      t,
      object: {
        id: 'v1',
        kind: 'circle',
        anchor: { target: 'card-3' },
        pad: 8,
        t: { start: t, dur: 400 },
      },
    });

  it('measures every object from the moment Wobo begins to speak', () => {
    let clock = 1000;
    const store = new BoardStore({ presentation: 'plane', clock: () => clock });
    store.beginUtterance();
    clock = 1050; // the frame lands 50 ms later, but it is timed at 900 ms into the utterance
    const event = plan(900);
    if (event) store.applyEvent(event);
    expect(store.get('v1')?.startAt).toBe(1900);
  });

  it('lands ink now when there is no utterance to measure from', () => {
    let clock = 500;
    const store = new BoardStore({ presentation: 'screen', clock: () => clock });
    clock = 700;
    const event = parseBoardEvent({
      type: 'ink',
      t: 0,
      object: { id: 'v2', kind: 'circle', anchor: { target: 'card-3' }, pad: 8 },
    });
    if (event) store.applyEvent(event);
    expect(store.get('v2')?.startAt).toBe(700);
  });

  it('the pen lifts where it is on an interrupt, and ink that had not begun never lands', () => {
    let clock = 0;
    const store = new BoardStore({ presentation: 'plane', clock: () => clock });
    store.beginUtterance();
    for (const [id, start] of [
      ['a', 0],
      ['b', 500],
      ['c', 2000],
    ] as const) {
      const event = parseBoardEvent({
        type: 'ink',
        t: start,
        object: {
          id,
          kind: 'circle',
          anchor: { target: 'card-3' },
          pad: 8,
          t: { start, dur: 400 },
        },
      });
      if (event) store.applyEvent(event);
    }
    clock = 600;
    expect(store.interrupt()).toBe('b'); // the nib was on b
    const left = store.snapshot().map((s) => s.object.id);
    expect(left).toContain('a');
    expect(left).toContain('b');
    expect(left).not.toContain('c'); // c had not begun
  });
});
