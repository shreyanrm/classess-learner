/**
 * The shared pointer, and the promise that it leaves nothing behind.
 *
 * The landing page is one route inside an app, so the interesting assertion here is not "the
 * pointer moves" — it is that after a mount and an unmount the host has exactly as many listeners
 * as it started with, and that four consumers of the pointer share ONE tracker rather than
 * installing four.
 */

import { describe, expect, it } from 'bun:test';
import {
  acquirePointer,
  createPointerState,
  pointerIdle,
  pointerRefCount,
  trackPointer,
  vectorTo,
} from './pointer';

/** A window-shaped double that counts what is listening to it. */
function fakeHost() {
  const listeners = new Map<string, Set<EventListener>>();
  return {
    innerWidth: 1200,
    innerHeight: 800,
    addEventListener(type: string, handler: EventListener) {
      const set = listeners.get(type) ?? new Set();
      set.add(handler);
      listeners.set(type, set);
    },
    removeEventListener(type: string, handler: EventListener) {
      listeners.get(type)?.delete(handler);
    },
    emit(type: string, event: Record<string, unknown>) {
      for (const handler of listeners.get(type) ?? []) handler(event as unknown as Event);
    },
    get count() {
      let n = 0;
      for (const set of listeners.values()) n += set.size;
      return n;
    },
  };
}

describe('createPointerState', () => {
  it('parks at the middle of the viewport, having not moved', () => {
    const state = createPointerState(1200, 800);
    expect(state).toEqual({ x: 600, y: 400, has: false, down: false, movedAt: 0 });
  });
});

describe('trackPointer', () => {
  it('follows a mouse and stamps when it last moved', () => {
    const host = fakeHost();
    const state = createPointerState(1200, 800);
    let clock = 5000;
    const stop = trackPointer(state, { host, now: () => clock });

    host.emit('pointermove', { pointerType: 'mouse', clientX: 120, clientY: 240 });
    expect(state).toMatchObject({ x: 120, y: 240, has: true, movedAt: 5000 });

    clock = 5200;
    host.emit('pointermove', { pointerType: 'pen', clientX: 130, clientY: 250 });
    expect(state.movedAt).toBe(5200);
    stop();
  });

  it('ignores touch — a finger has no hover to draw behind', () => {
    const host = fakeHost();
    const state = createPointerState(1200, 800);
    const stop = trackPointer(state, { host, now: () => 0 });
    host.emit('pointermove', { pointerType: 'touch', clientX: 999, clientY: 999 });
    expect(state.has).toBe(false);
    expect(state.x).toBe(600);
    stop();
  });

  it('knows when the pen is pressed, and lets go on cancel', () => {
    const host = fakeHost();
    const state = createPointerState();
    const stop = trackPointer(state, { host, now: () => 0 });
    host.emit('pointerdown', { pointerType: 'mouse' });
    expect(state.down).toBe(true);
    host.emit('pointercancel', { pointerType: 'mouse' });
    expect(state.down).toBe(false);
    stop();
  });

  it('removes every listener it added', () => {
    const host = fakeHost();
    expect(host.count).toBe(0);
    const stop = trackPointer(createPointerState(), { host, now: () => 0 });
    expect(host.count).toBe(4);
    stop();
    expect(host.count).toBe(0);
  });
});

describe('acquirePointer', () => {
  it('tracks once however many consumers there are, and stops with the last of them', () => {
    const host = fakeHost();
    expect(pointerRefCount()).toBe(0);

    const a = acquirePointer({ host, now: () => 0 });
    const b = acquirePointer({ host, now: () => 0 });
    expect(host.count).toBe(4);
    expect(pointerRefCount()).toBe(2);
    expect(a.state).toBe(b.state);

    a.release();
    expect(host.count).toBe(4);
    b.release();
    expect(host.count).toBe(0);
    expect(pointerRefCount()).toBe(0);
  });

  it('survives a double release, as an unmount racing an unmount would', () => {
    const host = fakeHost();
    const holder = acquirePointer({ host, now: () => 0 });
    holder.release();
    holder.release();
    expect(pointerRefCount()).toBe(0);
    expect(host.count).toBe(0);
  });

  it('starts again cleanly after the last consumer left', () => {
    const host = fakeHost();
    acquirePointer({ host, now: () => 0 }).release();
    const next = acquirePointer({ host, now: () => 0 });
    expect(host.count).toBe(4);
    expect(next.state.has).toBe(false);
    next.release();
  });
});

describe('pointerIdle', () => {
  it('is idle until the pointer has ever moved', () => {
    expect(pointerIdle(createPointerState(), 0)).toBe(true);
  });

  it('goes idle once the pointer has been still for long enough', () => {
    const state = createPointerState();
    state.has = true;
    state.movedAt = 1000;
    expect(pointerIdle(state, 1500)).toBe(false);
    expect(pointerIdle(state, 3000)).toBe(true);
  });
});

describe('vectorTo', () => {
  it('measures from a box centre to the pointer', () => {
    const state = createPointerState();
    state.x = 30;
    state.y = 40;
    expect(vectorTo(state, 0, 0)).toEqual({ dx: 30, dy: 40, d: 50 });
  });

  it('never returns a zero length, so nothing divides by it', () => {
    const state = createPointerState();
    state.x = 10;
    state.y = 10;
    expect(vectorTo(state, 10, 10).d).toBe(1);
  });
});
