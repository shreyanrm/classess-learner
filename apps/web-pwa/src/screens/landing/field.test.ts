/**
 * The ink field's geometry.
 *
 * Nothing here touches WebGL — the point of splitting `bakeField` out of `startField` is that the
 * part with the arithmetic in it can be checked without a GPU. What these assert is the three
 * properties the shader depends on: every stroke's vertices share one origin (so a stroke wraps
 * whole instead of tearing), the buffers are the same length as each other, and the field is
 * deterministic (so a screenshot taken today matches one taken tomorrow).
 */

import { describe, expect, it } from 'bun:test';
import { bakeField, FIELD_OPACITY, fieldOpacity, fieldStrokes, hexToRgb, rng } from './field';

describe('fieldStrokes', () => {
  const strokes = fieldStrokes();

  it('draws from all three subjects', () => {
    const subjects = new Set(strokes.map((s) => s.subject));
    expect([...subjects].sort()).toEqual(['chemistry', 'math', 'physics']);
  });

  it('gives every stroke at least one segment', () => {
    for (const stroke of strokes) expect(stroke.points.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps every point finite and inside the local unit box', () => {
    for (const stroke of strokes) {
      for (const [x, y] of stroke.points) {
        expect(Number.isFinite(x)).toBe(true);
        expect(Number.isFinite(y)).toBe(true);
        expect(Math.abs(x)).toBeLessThanOrEqual(0.75);
        expect(Math.abs(y)).toBeLessThanOrEqual(0.75);
      }
    }
  });

  it('is the same field on every load', () => {
    expect(fieldStrokes()).toEqual(fieldStrokes());
  });

  it('is a different field on a different seed', () => {
    expect(fieldStrokes(1)).not.toEqual(fieldStrokes(2));
  });
});

describe('rng', () => {
  it('produces values in [0, 1)', () => {
    const next = rng(7);
    for (let i = 0; i < 500; i++) {
      const v = next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('never degenerates on a zero seed', () => {
    const next = rng(0);
    expect(next()).not.toBe(next());
  });
});

describe('bakeField', () => {
  const geometry = bakeField({ instances: 12 });

  it('emits gl.LINES pairs — always an even vertex count', () => {
    expect(geometry.count % 2).toBe(0);
    expect(geometry.count).toBeGreaterThan(0);
  });

  it('keeps every attribute buffer in step with the vertex count', () => {
    expect(geometry.local.length).toBe(geometry.count * 2);
    expect(geometry.origin.length).toBe(geometry.count * 2);
    expect(geometry.params.length).toBe(geometry.count * 4);
  });

  it('places every origin inside the field', () => {
    for (const v of geometry.origin) {
      expect(v).toBeGreaterThan(-0.3);
      expect(v).toBeLessThan(1.3);
    }
  });

  it('gives the two ends of a segment the same origin, so a stroke wraps whole', () => {
    for (let i = 0; i < geometry.count; i += 2) {
      expect(geometry.origin[i * 2]).toBe(geometry.origin[(i + 1) * 2] as number);
      expect(geometry.origin[i * 2 + 1]).toBe(geometry.origin[(i + 1) * 2 + 1] as number);
    }
  });

  it('gives the two ends of a segment the same drift parameters', () => {
    for (let i = 0; i < geometry.count; i += 2) {
      for (let k = 0; k < 4; k++) {
        expect(geometry.params[i * 4 + k]).toBe(geometry.params[(i + 1) * 4 + k] as number);
      }
    }
  });

  it('keeps every alpha inside the low-attention band the design asks for', () => {
    for (let i = 3; i < geometry.params.length; i += 4) {
      expect(geometry.params[i]).toBeGreaterThan(0.4);
      expect(geometry.params[i]).toBeLessThanOrEqual(1);
    }
  });

  it('scales with the instance count and stays bounded', () => {
    const small = bakeField({ instances: 4 });
    const large = bakeField({ instances: 40 });
    expect(large.count).toBeGreaterThan(small.count);
    // The whole background is one draw call; this is the ceiling that keeps it cheap.
    expect(large.count).toBeLessThan(6000);
  });

  it('is deterministic', () => {
    expect([...bakeField({ instances: 6 }).local]).toEqual([...bakeField({ instances: 6 }).local]);
  });
});

describe('hexToRgb', () => {
  it('reads the signature pigment', () => {
    const [r, g, b] = hexToRgb('#1F35E0');
    expect(r).toBeCloseTo(31 / 255, 5);
    expect(g).toBeCloseTo(53 / 255, 5);
    expect(b).toBeCloseTo(224 / 255, 5);
  });

  it('reads the short form and tolerates whitespace', () => {
    expect(hexToRgb(' #fff ')).toEqual([1, 1, 1]);
  });
});

describe('fieldOpacity', () => {
  it('lays the field on far lighter in dark than in light', () => {
    // Matched by number, the two themes were not the same page: the same alpha is paper texture on
    // white and a drawn line on graphite. The proof of the bug was strokes crossing the copy.
    expect(fieldOpacity('dark')).toBeLessThan(fieldOpacity('light'));
    expect(fieldOpacity('dark')).toBeLessThan(fieldOpacity('light') / 2);
  });

  it('drops a little further for a still frame, which is looked at rather than glimpsed', () => {
    expect(fieldOpacity('light', true)).toBeLessThan(fieldOpacity('light'));
    expect(fieldOpacity('dark', true)).toBeLessThan(fieldOpacity('dark'));
  });

  it('stays atmosphere in every combination — never a layer with information in it', () => {
    for (const value of Object.values(FIELD_OPACITY)) {
      expect(value).toBeGreaterThan(0);
      expect(value).toBeLessThan(0.4);
    }
  });
});
