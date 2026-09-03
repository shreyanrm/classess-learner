import { describe, expect, it } from 'bun:test';
import type { WoboMood } from '../identity';
import {
  BLINK_CLOSED_AT,
  EXPRESSION_NAMES,
  EXPRESSIONS,
  EYE_RADIUS,
  expressionFor,
  expressionNote,
  expressionSpec,
  eyeGeometry,
  isExpression,
  MOOD_TO_EXPRESSION,
  type WoboExpression,
} from './expressions';

const MOODS: WoboMood[] = [
  'idle',
  'thinking',
  'listening',
  'correct',
  'celebrate',
  'waiting',
  'hint',
  'explaining',
  'resting',
  'oops',
];

describe('the expression table', () => {
  it('has the twenty the owner approved, in order', () => {
    expect(EXPRESSION_NAMES).toEqual([
      'idle',
      'listening',
      'thinking',
      'computing',
      'aha',
      'explaining',
      'drawing',
      'celebrating',
      'encouraging',
      'curious',
      'surprised',
      'wink',
      'supportive',
      'bored',
      'sleepy',
      'loading',
      'proud',
      'shy',
      'focused',
      'happy',
    ]);
    expect(EXPRESSION_NAMES).toHaveLength(20);
  });

  it('gives every expression two eyes, a tilt and a lean', () => {
    for (const name of EXPRESSION_NAMES) {
      const spec = EXPRESSIONS[name];
      expect(spec.left.kind).toBeTruthy();
      expect(spec.right.kind).toBeTruthy();
      expect(Number.isFinite(spec.tilt)).toBe(true);
      expect(Number.isFinite(spec.lean)).toBe(true);
    }
  });

  it('carries the pen on drawing only, and the spark on the aha only', () => {
    const withPen = EXPRESSION_NAMES.filter((n) => expressionSpec(n).pen);
    const withSpark = EXPRESSION_NAMES.filter((n) => expressionSpec(n).spark);
    expect(withPen).toEqual(['drawing']);
    expect(withSpark).toEqual(['aha']);
  });

  it("keeps Wobo's notes in Wobo's voice — sentence case, no emoji, no exclamation marks", () => {
    for (const name of EXPRESSION_NAMES) {
      const note = expressionNote(name);
      expect(note).not.toContain('!');
      // no emoji / pictographs
      expect(/\p{Extended_Pictographic}/u.test(note)).toBe(false);
      if (note) expect(note[0]).toBe((note[0] as string).toLowerCase());
    }
  });
});

describe('resolving what a caller asked for', () => {
  it('maps every legacy mood onto a real expression', () => {
    for (const mood of MOODS) {
      const resolved = MOOD_TO_EXPRESSION[mood];
      expect(isExpression(resolved)).toBe(true);
      expect(expressionFor(mood)).toBe(resolved);
    }
  });

  it('keeps the five states named in the design law', () => {
    expect(expressionFor('listening')).toBe('listening');
    expect(expressionFor('thinking')).toBe('thinking');
    expect(expressionFor('explaining')).toBe('explaining');
    expect(expressionFor('celebrate')).toBe('celebrating');
    expect(expressionFor('celebrating')).toBe('celebrating');
    expect(expressionFor('resting')).toBe('sleepy');
  });

  it('passes the new expression names straight through', () => {
    for (const name of EXPRESSION_NAMES) expect(expressionFor(name)).toBe(name);
  });

  it('falls back to idle for nothing and for nonsense', () => {
    expect(expressionFor(undefined)).toBe('idle');
    expect(expressionFor('nope' as WoboExpression)).toBe('idle');
  });

  it('rests on the note that sanctions rest, never guilt', () => {
    expect(expressionNote('resting')).toBe('rest is part of learning');
  });
});

describe('eye geometry', () => {
  it('fills the round shapes and strokes the lid shapes', () => {
    expect(eyeGeometry(0, 0, { kind: 'dot' }).filled).toBe(true);
    expect(eyeGeometry(0, 0, { kind: 'wide' }).filled).toBe(true);
    expect(eyeGeometry(0, 0, { kind: 'half' }).filled).toBe(true);
    expect(eyeGeometry(0, 0, { kind: 'scan' }).filled).toBe(true);
    for (const kind of ['dash', 'equals', 'arc', 'sad', 'closed', 'wink'] as const) {
      const g = eyeGeometry(0, 0, { kind });
      expect(g.filled).toBe(false);
      expect(g.strokeWidth).toBeGreaterThan(0);
    }
  });

  it('scales the dot by the spec scale, around the given centre', () => {
    const small = eyeGeometry(0, 0, { kind: 'dot', scale: 0.5 });
    const big = eyeGeometry(0, 0, { kind: 'dot', scale: 2 });
    expect(small.d).toContain(String(-EYE_RADIUS * 0.5));
    expect(big.d).toContain(String(-EYE_RADIUS * 2));
  });

  it('moves with the eye centre, so the gaze is geometry and not a transform', () => {
    const a = eyeGeometry(10, 20, { kind: 'dash' });
    const b = eyeGeometry(14, 20, { kind: 'dash' });
    expect(a.d).not.toBe(b.d);
    expect(a.d).toBe('M3 20h14');
    expect(b.d).toBe('M7 20h14');
  });

  it('borrows the closed lid past the blink threshold, whatever the expression wanted', () => {
    const closed = eyeGeometry(0, 0, { kind: 'closed' });
    const open = eyeGeometry(0, 0, { kind: 'wide' }, BLINK_CLOSED_AT);
    const blinking = eyeGeometry(0, 0, { kind: 'wide' }, BLINK_CLOSED_AT + 0.01);
    expect(open.filled).toBe(true);
    expect(blinking.d).toBe(closed.d);
    expect(blinking.filled).toBe(false);
  });

  it('sweeps the scanning eye over time and nowhere else', () => {
    const t0 = eyeGeometry(0, 0, { kind: 'scan' }, 0, 0);
    const t1 = eyeGeometry(0, 0, { kind: 'scan' }, 0, 300);
    expect(t0.d).not.toBe(t1.d);
    const dotA = eyeGeometry(0, 0, { kind: 'dot' }, 0, 0);
    const dotB = eyeGeometry(0, 0, { kind: 'dot' }, 0, 300);
    expect(dotA.d).toBe(dotB.d);
  });
});
