import { describe, expect, it } from 'bun:test';
import { woboHighlight } from '@wobo/config';
import { inkRng } from '../src/freehand';
import {
  HIGHLIGHT_FROST,
  HIGHLIGHT_INK,
  highlightRing,
  wobbledBox,
} from '../src/highlight-overlay';

const rect = { left: 100, top: 40, width: 180, height: 24 };
const ring = (age: number, reduced = false, ttl = 6000) =>
  highlightRing(rect, age, ttl, reduced, 'step-1');

/** Every colour literal the ring emits, var fallbacks included. */
const colours = (value: string): string[] => value.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)/g) ?? [];

describe('Wobo pointing at a region draws the pigment, never a wash', () => {
  it('inks the ring in ultramarine only — no warm token is reachable', () => {
    const r = ring(160);
    expect(r).not.toBeNull();
    if (!r) return;
    expect(colours(r.stroke)).toEqual([woboHighlight.ink]);
    expect(r.stroke).toContain('var(--wobo-highlight-ink');
    expect(r.stroke.toLowerCase()).not.toContain('ff5a1f');
  });

  it('fills with at most a 4% ultramarine frost and nothing else', () => {
    const r = ring(160);
    if (!r) throw new Error('expected a live ring');
    expect(r.fill).toBe(HIGHLIGHT_FROST);
    const fills = colours(r.fill);
    expect(fills).toEqual([woboHighlight.frost]);
    for (const fill of fills) {
      const [red, green, blue, alpha] = (fill.match(/[\d.]+/g) ?? []).map(Number);
      expect([red, green, blue]).toEqual([31, 53, 224]); // ultramarine, not a hue of its own
      expect(alpha).toBeLessThanOrEqual(0.04);
    }
  });

  it('holds a 1.5px nib on the target box, padded, with 3px corners', () => {
    const r = ring(160);
    if (!r) throw new Error('expected a live ring');
    expect(r.strokeWidth).toBe(woboHighlight.ringWidth);
    expect(r.strokeWidth).toBe(1.5);
    expect(r.left).toBeLessThan(rect.left); // the ring sits outside the box it points at
    expect(r.top).toBeLessThan(rect.top);
    expect(r.width).toBeGreaterThan(rect.width);
    expect(r.height).toBeGreaterThan(rect.height);
    expect(r.d).toContain('Q'); // rounded corners, not a hard box
    expect(r.d).not.toContain('NaN');
  });

  it('draws itself on over 320ms and is finished after it', () => {
    const start = ring(0);
    const mid = ring(woboHighlight.drawMs / 2);
    const done = ring(woboHighlight.drawMs + 1);
    if (!start || !mid || !done) throw new Error('expected live rings');
    expect(start.strokeDashoffset).toBeCloseTo(1, 5);
    expect(mid.strokeDashoffset).toBeGreaterThan(0);
    expect(mid.strokeDashoffset).toBeLessThan(1);
    expect(done.strokeDashoffset).toBe(0);
    expect(done.strokeDasharray).toBe('1');
    expect(done.pathLength).toBe(1);
  });

  it('draws instantly under reduced motion', () => {
    const r = ring(0, true);
    if (!r) throw new Error('expected a live ring');
    expect(r.strokeDashoffset).toBe(0);
  });

  it('fades over the last 600ms of its life, then stops rendering', () => {
    const ttl = 6000;
    const alive = ring(ttl - woboHighlight.fadeMs - 1, false, ttl);
    const fading = ring(ttl - woboHighlight.fadeMs / 2, false, ttl);
    if (!alive || !fading) throw new Error('expected live rings');
    expect(alive.opacity).toBe(1);
    expect(fading.opacity).toBeCloseTo(0.5, 2);
    expect(ring(ttl, false, ttl)).toBeNull();
    expect(ring(ttl + 500, false, ttl)).toBeNull();
  });

  it('wobbles by hand: seeded, repeatable, and off true by under a pixel and a half', () => {
    const once = wobbledBox(60, 20, 3, inkRng('a', 'highlight', 'ring'));
    const again = wobbledBox(60, 20, 3, inkRng('a', 'highlight', 'ring'));
    expect(once).toBe(again);
    expect(once).not.toBe(wobbledBox(60, 20, 3, inkRng('b', 'highlight', 'ring')));
    const numbers = (once.match(/-?[\d.]+/g) ?? []).map(Number);
    expect(numbers.every((n) => Number.isFinite(n))).toBe(true);
    expect(Math.min(...numbers)).toBeGreaterThanOrEqual(-1.5);
    expect(Math.max(...numbers)).toBeLessThanOrEqual(61.5);
  });

  it('exports the ink as a theme var so a dark root swaps the pigment, not the design', () => {
    expect(HIGHLIGHT_INK).toBe(`var(--wobo-highlight-ink, ${woboHighlight.ink})`);
    expect(HIGHLIGHT_FROST).toBe(`var(--wobo-highlight-frost, ${woboHighlight.frost})`);
  });
});
