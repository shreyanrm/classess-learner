/**
 * The pen of light: who it appears for, how it moves, and — the part that matters to the rest of
 * the app — what it leaves behind when the route unmounts.
 *
 * The cursor takeover is the most invasive thing on this page: it hides the system cursor for the
 * whole document. So the mount/unmount cycle is asserted directly. After a dispose the fake window
 * and document hold zero listeners, the animation frame is cancelled, and the class that hides the
 * cursor is off `<body>` — whatever happened while it was mounted.
 */

import { describe, expect, it } from 'bun:test';
import { CURSOR_ON_CLASS, isHoverTarget, mountNib, NIB_EASE, nibTransform } from './nib';
import { createPointerState } from './pointer';

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
    emit(type: string, event: Record<string, unknown> = {}) {
      for (const handler of listeners.get(type) ?? []) handler(event as unknown as Event);
    },
    get count() {
      let n = 0;
      for (const set of listeners.values()) n += set.size;
      return n;
    },
  };
}

/** An element-shaped double with the two things the nib touches: classes and inline style. */
function element() {
  const classes = new Set<string>();
  return {
    classes,
    classList: {
      add: (...names: string[]) => {
        for (const name of names) classes.add(name);
      },
      remove: (...names: string[]) => {
        for (const name of names) classes.delete(name);
      },
      toggle: (name: string, on: boolean) => (on ? classes.add(name) : classes.delete(name)),
    },
    style: {} as Record<string, string>,
  };
}

/** A window with a hand-cranked animation frame, so a leaked loop is a number rather than a hang. */
function world(options: { fine?: boolean; reduced?: boolean } = {}) {
  const win = target() as ReturnType<typeof target> & Record<string, unknown>;
  const pending = new Set<number>();
  let next = 1;
  win.matchMedia = (query: string) => ({
    matches: query.includes('reduce') ? (options.reduced ?? false) : (options.fine ?? true),
  });
  win.requestAnimationFrame = (cb: FrameRequestCallback) => {
    const id = next++;
    pending.add(id);
    void cb;
    return id;
  };
  win.cancelAnimationFrame = (id: number) => pending.delete(id);
  const doc = target() as ReturnType<typeof target> & Record<string, unknown>;
  const body = element();
  doc.body = body;
  return { win, doc, body, pending };
}

function mount(options: { fine?: boolean; reduced?: boolean } = {}) {
  const { win, doc, body, pending } = world(options);
  const el = element();
  const pointer = createPointerState(1000, 600);
  const handle = mountNib(el as unknown as HTMLElement, {
    pointer,
    win: win as unknown as Window,
    doc: doc as unknown as Document,
  });
  return { win, doc, body, pending, el, pointer, handle };
}

describe('mountNib', () => {
  it('takes over for a fine pointer, and hides the native cursor only while it is mounted', () => {
    const { win, doc, body, handle } = mount();
    expect(win.count).toBeGreaterThan(0);
    expect(doc.count).toBeGreaterThan(0);
    expect(body.classes.has(CURSOR_ON_CLASS)).toBe(true);
    handle.dispose();
    expect(body.classes.has(CURSOR_ON_CLASS)).toBe(false);
  });

  it('leaves a touch device its own cursor', () => {
    const { win, doc, body } = mount({ fine: false });
    expect(win.count).toBe(0);
    expect(doc.count).toBe(0);
    expect(body.classes.has(CURSOR_ON_CLASS)).toBe(false);
  });

  it('leaves reduced motion alone', () => {
    const { win, body } = mount({ reduced: true });
    expect(win.count).toBe(0);
    expect(body.classes.has(CURSOR_ON_CLASS)).toBe(false);
  });

  it('eases toward the pointer rather than snapping to it', () => {
    const { pointer, el, handle } = mount();
    pointer.x = 1000;
    pointer.y = 600;
    handle.frame();
    expect(el.style.transform).toBe(nibTransform(500 + 500 * NIB_EASE, 300 + 300 * NIB_EASE));
    handle.dispose();
  });

  it('swells over a control and presses on pointerdown', () => {
    const { win, el, handle } = mount();
    win.emit('pointerover', { target: { closest: () => ({}) } });
    expect(el.classes.has('hover')).toBe(true);
    win.emit('pointerover', { target: { closest: () => null } });
    expect(el.classes.has('hover')).toBe(false);
    win.emit('pointerdown');
    expect(el.classes.has('press')).toBe(true);
    win.emit('pointerup');
    expect(el.classes.has('press')).toBe(false);
    handle.dispose();
  });

  it('fades out when the pointer leaves the document, and back when it returns', () => {
    const { doc, el, handle } = mount();
    doc.emit('mouseleave');
    expect(el.style.opacity).toBe('0');
    doc.emit('mouseenter');
    expect(el.style.opacity).toBe('1');
    handle.dispose();
  });

  it('leaves nothing behind after a mount and unmount', () => {
    const { win, doc, body, pending, el, handle } = mount();
    win.emit('pointerdown');
    win.emit('pointerover', { target: { closest: () => ({}) } });
    expect(pending.size).toBe(1);

    handle.dispose();

    expect(win.count).toBe(0);
    expect(doc.count).toBe(0);
    expect(pending.size).toBe(0);
    expect(body.classes.has(CURSOR_ON_CLASS)).toBe(false);
    expect(el.classes.size).toBe(0);
    expect(el.style.transform).toBe('');
  });

  it('is inert without an element to attach to', () => {
    const { win, doc } = world();
    const handle = mountNib(null, {
      pointer: createPointerState(),
      win: win as unknown as Window,
      doc: doc as unknown as Document,
    });
    handle.frame();
    handle.dispose();
    expect(win.count).toBe(0);
  });
});

describe('nibTransform', () => {
  it('is a plain translate — the nib is positioned, never laid out', () => {
    expect(nibTransform(12.5, 40)).toBe('translate(12.5px,40px)');
  });
});

describe('isHoverTarget', () => {
  it('is false for a target with nothing to act on', () => {
    expect(isHoverTarget(null)).toBe(false);
    expect(isHoverTarget({} as EventTarget)).toBe(false);
  });
});
