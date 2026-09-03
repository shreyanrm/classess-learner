/**
 * The ground the engine stands on.
 *
 * `disposeAll` is the one with teeth: teardown runs in reverse, so a thing that was built on top
 * of another is taken down first, and the list is emptied — a disposer that ran once must never be
 * able to run again on a second unmount.
 */

import { describe, expect, it } from 'bun:test';
import {
  clamp01,
  type Disposer,
  disposeAll,
  isDark,
  lerp,
  media,
  prefersReducedMotion,
} from './env';

describe('lerp', () => {
  it('closes a fraction of the gap each call, never overshooting', () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
    expect(lerp(0, 10, 0.55)).toBeCloseTo(5.5);
  });

  it('converges rather than arriving', () => {
    let v = 0;
    for (let i = 0; i < 10; i++) v = lerp(v, 100, 0.45);
    expect(v).toBeLessThan(100);
    expect(v).toBeGreaterThan(99);
  });
});

describe('clamp01', () => {
  it('holds the ends', () => {
    expect(clamp01(-3)).toBe(0);
    expect(clamp01(0.4)).toBe(0.4);
    expect(clamp01(9)).toBe(1);
  });

  it('reads an unmeasurable box as not started, rather than passing NaN into a transform', () => {
    expect(clamp01(Number.NaN)).toBe(0);
  });
});

describe('disposeAll', () => {
  it('tears down in reverse and empties the list', () => {
    const order: number[] = [];
    const disposers: Disposer[] = [() => order.push(1), () => order.push(2), () => order.push(3)];
    disposeAll(disposers);
    expect(order).toEqual([3, 2, 1]);
    expect(disposers).toHaveLength(0);
  });

  it('cannot run the same disposer twice across two unmounts', () => {
    let runs = 0;
    const disposers: Disposer[] = [
      () => {
        runs++;
      },
    ];
    disposeAll(disposers);
    disposeAll(disposers);
    expect(runs).toBe(1);
  });
});

describe('the environment readers', () => {
  it('answer false where there is no browser, rather than throwing', () => {
    expect(media('(pointer: fine)', undefined)).toBe(false);
    expect(prefersReducedMotion(undefined)).toBe(false);
    expect(isDark(undefined)).toBe(false);
  });

  it('answer false when matchMedia throws on an unknown query', () => {
    const win = {
      matchMedia: () => {
        throw new Error('unsupported');
      },
    } as unknown as Window;
    expect(media('(pointer: fine)', win)).toBe(false);
  });

  it('reads the night theme off the document element', () => {
    const doc = {
      documentElement: { getAttribute: (name: string) => (name === 'data-theme' ? 'dark' : null) },
    } as unknown as Document;
    expect(isDark(doc)).toBe(true);
  });
});
