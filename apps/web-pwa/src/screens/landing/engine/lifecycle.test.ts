/**
 * The whole engine's one non-negotiable property: a mount/unmount cycle leaves the document as it
 * found it.
 *
 * The landing page is a route inside an app, and everything this engine starts is invasive — it
 * hides the system cursor, holds a full-viewport canvas, runs animation frames, and displaces
 * buttons and eyes with inline styles. So the cycle is asserted directly, and asserted TWICE: a
 * disposer that works once but leaves the shared pointer's reference count wrong would strand a
 * listener on the second visit, which is exactly the leak nobody notices until a laptop fan does.
 *
 * The doubles here are deliberately thin — the point is to count listeners, frames, timers and
 * inline styles, not to simulate a browser.
 */

import { describe, expect, it } from 'bun:test';
import { mountBlink, mountGaze, mountMagnets } from './motion';
import { mountNib } from './nib';
import { acquirePointer, pointerRefCount } from './pointer';
import { mountRibbon } from './ribbon';

/** A listener-counting event target, standing in for `window` or `document`. */
function target() {
  const listeners = new Map<string, Set<EventListener>>();
  return {
    listeners,
    addEventListener(type: string, handler: EventListener) {
      const set = listeners.get(type) ?? new Set();
      set.add(handler);
      listeners.set(type, set);
    },
    removeEventListener(type: string, handler: EventListener) {
      listeners.get(type)?.delete(handler);
    },
    get count() {
      let n = 0;
      for (const set of listeners.values()) n += set.size;
      return n;
    },
  };
}

/** An element-shaped double: classes, inline style with custom properties, and a box. */
function element(box = { left: 0, top: 0, width: 100, height: 100 }) {
  const classes = new Set<string>();
  const props = new Map<string, string>();
  const style: Record<string, string> & {
    setProperty(name: string, value: string): void;
    removeProperty(name: string): void;
  } = {
    setProperty(name: string, value: string) {
      props.set(name, value);
    },
    removeProperty(name: string) {
      props.delete(name);
    },
  } as never;
  const eyes = { style: {} as Record<string, string> };
  return {
    classes,
    props,
    eyes,
    style,
    classList: {
      add: (...names: string[]) => {
        for (const name of names) classes.add(name);
      },
      remove: (...names: string[]) => {
        for (const name of names) classes.delete(name);
      },
      toggle: (name: string, on: boolean) => (on ? classes.add(name) : classes.delete(name)),
    },
    getBoundingClientRect: () => box,
    querySelector: (selector: string) => (selector === '.eyes' ? eyes : null),
  };
}

/** A root that answers the three selectors the page's per-frame motions ask it for. */
function root(parts: { btn: unknown[]; wobo: unknown[]; blink: unknown[] }) {
  return {
    querySelectorAll: (selector: string) => {
      if (selector === '.btn') return parts.btn;
      if (selector === '.wobo') return parts.wobo;
      if (selector === '.blink') return parts.blink;
      return [];
    },
  } as unknown as ParentNode;
}

/** A window with hand-cranked frames, so a leaked loop is a number rather than a hang. */
function world() {
  const win = target() as ReturnType<typeof target> & Record<string, unknown>;
  const pending = new Set<number>();
  let next = 1;
  win.innerWidth = 1200;
  win.innerHeight = 800;
  win.devicePixelRatio = 2;
  win.matchMedia = (query: string) => ({ matches: !query.includes('reduce') });
  win.requestAnimationFrame = () => {
    const id = next++;
    pending.add(id);
    return id;
  };
  win.cancelAnimationFrame = (id: number) => pending.delete(id);
  const doc = target() as ReturnType<typeof target> & Record<string, unknown>;
  const body = element();
  doc.body = body;
  return { win, doc, body, pending };
}

/** A canvas-shaped double whose 2D context records nothing and throws at nothing. */
function canvas() {
  const noop = () => {};
  return {
    width: 0,
    height: 0,
    style: {} as Record<string, string>,
    ownerDocument: { documentElement: { getAttribute: () => null } },
    getContext: () =>
      ({
        setTransform: noop,
        clearRect: noop,
        beginPath: noop,
        moveTo: noop,
        lineTo: noop,
        quadraticCurveTo: noop,
        closePath: noop,
        fill: noop,
        arc: noop,
        fillStyle: '',
      }) as unknown as CanvasRenderingContext2D,
  };
}

/**
 * One visit to the landing page: the pen, the ribbon, the magnets and the gaze all mount off the
 * one shared pointer, run a frame, and come down again.
 */
function visit() {
  const { win, doc, body, pending } = world();
  const nibEl = element();
  const button = element({ left: 100, top: 100, width: 120, height: 50 });
  const head = element({ left: 400, top: 300, width: 80, height: 80 });
  const page = root({ btn: [button], wobo: [head], blink: [] });

  const { state, release } = acquirePointer({ host: win as never });
  state.x = 140;
  state.y = 140;
  state.has = true;

  const nib = mountNib(nibEl as unknown as HTMLElement, {
    pointer: state,
    win: win as unknown as Window,
    doc: doc as unknown as Document,
  });
  const ribbon = mountRibbon(canvas() as unknown as HTMLCanvasElement, {
    pointer: state,
    win: win as unknown as Window,
  });
  const magnets = mountMagnets(page, state, true);
  const gaze = mountGaze(page, state);

  nib.frame();
  ribbon.frame();
  magnets.frame();
  gaze.frame();

  return {
    win,
    doc,
    body,
    pending,
    nibEl,
    button,
    head,
    down() {
      gaze.dispose();
      magnets.dispose();
      ribbon.dispose();
      nib.dispose();
      release();
    },
  };
}

describe('a visit to the landing page', () => {
  it('does its work while it is mounted', () => {
    const page = visit();
    expect(page.win.count).toBeGreaterThan(0);
    expect(page.pending.size).toBeGreaterThan(0);
    expect(page.body.classes.has('cursor-on')).toBe(true);
    expect(page.button.style.transform).toMatch(/translate/);
    expect(page.head.eyes.style.transform).toMatch(/translate/);
    expect(page.head.props.get('--gaze-x')).toBeDefined();
    page.down();
  });

  it('leaves nothing behind — no listener, no frame, no cursor, no displaced element', () => {
    const page = visit();
    page.down();
    expect(page.win.count).toBe(0);
    expect(page.doc.count).toBe(0);
    expect(page.pending.size).toBe(0);
    expect(page.body.classes.has('cursor-on')).toBe(false);
    expect(page.button.style.transform).toBe('');
    expect(page.head.eyes.style.transform).toBe('');
    expect(page.head.props.size).toBe(0);
    expect(pointerRefCount()).toBe(0);
  });

  it('survives being visited, left and visited again', () => {
    for (let i = 0; i < 3; i++) {
      const page = visit();
      expect(page.win.count).toBeGreaterThan(0);
      page.down();
      expect(page.win.count).toBe(0);
      expect(page.pending.size).toBe(0);
      expect(pointerRefCount()).toBe(0);
    }
  });

  it('hands the shared pointer back only once every holder has let go', () => {
    const { win } = world();
    const a = acquirePointer({ host: win as never });
    const b = acquirePointer({ host: win as never });
    expect(pointerRefCount()).toBe(2);
    expect(a.state).toBe(b.state);
    a.release();
    a.release();
    expect(pointerRefCount()).toBe(1);
    expect(win.count).toBeGreaterThan(0);
    b.release();
    expect(pointerRefCount()).toBe(0);
    expect(win.count).toBe(0);
  });
});

describe('mountBlink', () => {
  it('blinks, then stops dead on dispose', async () => {
    const lid = element();
    const writes: string[] = [];
    Object.defineProperty(lid.style, 'transform', {
      get: () => writes[writes.length - 1] ?? '',
      set: (value: string) => {
        writes.push(value);
      },
    });
    const stop = mountBlink(root({ btn: [], wobo: [], blink: [lid] }), {
      first: 1,
      random: () => 0,
    });

    await Bun.sleep(30);
    expect(writes).toContain('scaleY(.08)');

    stop();
    const after = writes.length;
    expect(lid.style.transform).toBe('');
    // The 110 ms timer that would have opened the eye again must have been cleared with the rest.
    await Bun.sleep(180);
    expect(writes).toHaveLength(after);
  });

  it('is inert on a page with nothing to blink', () => {
    const stop = mountBlink(root({ btn: [], wobo: [], blink: [] }));
    stop();
  });
});
