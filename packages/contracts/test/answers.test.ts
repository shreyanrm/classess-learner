import { describe, expect, it } from 'bun:test';
import {
  ANSWER_FEEDBACK_CODES,
  ANSWER_KINDS,
  AnswerCheck,
  AnswerFigure,
  AnswerHighlight,
  AnswerSpec,
  AnswerState,
  parseAnswerSpec,
  parseAnswerState,
  stateMatchesSpec,
} from '../src/answers';

describe('the answer taxonomy', () => {
  it('is the eight interactive kinds of WOBO-PLAN §16, spelled out', () => {
    expect(ANSWER_KINDS).toEqual([
      'shade_regions',
      'place_points',
      'slider',
      'order',
      'match',
      'number_pad',
      'expression',
      'draw',
      'circle_part',
      'choose_visual',
    ]);
  });

  it('has a spec and a state for every kind, and no kind without both', () => {
    const specs = AnswerSpec.options.map((o) => o.shape.kind.value);
    const states = AnswerState.options.map((o) => o.shape.kind.value);
    expect([...specs].sort()).toEqual([...ANSWER_KINDS].sort());
    expect([...states].sort()).toEqual([...ANSWER_KINDS].sort());
  });

  it('carries codes and counts, never a sentence — Wobo owns the words', () => {
    for (const code of ANSWER_FEEDBACK_CODES) expect(code).toMatch(/^[a-z_]+$/);
    const withProse = AnswerCheck.safeParse({
      correct: false,
      feedback: [{ code: 'too_many', message: 'try again' }],
      highlight: [],
    });
    // Unknown keys are stripped rather than kept: there is no smuggling prose through the seam.
    expect(withProse.success).toBe(true);
    expect(withProse.success && 'message' in (withProse.data.feedback[0] ?? {})).toBe(false);
  });
});

describe('parsing what arrives over the wire', () => {
  const spec = {
    kind: 'shade_regions',
    id: 'half',
    figure: { shape: 'grid', rows: 2, cols: 4 },
    want: 4,
  };

  it('accepts a real spec and a real state', () => {
    expect(parseAnswerSpec(spec)?.kind).toBe('shade_regions');
    expect(parseAnswerState({ kind: 'shade_regions', shaded: [0, 1] })?.kind).toBe('shade_regions');
  });

  it('returns null rather than throwing on rubbish', () => {
    expect(parseAnswerSpec({ kind: 'nonsense' })).toBeNull();
    expect(parseAnswerSpec(null)).toBeNull();
    expect(parseAnswerState({ kind: 'slider', value: 'a lot' })).toBeNull();
  });

  it('refuses a figure that cannot be cut into parts', () => {
    expect(AnswerFigure.safeParse({ shape: 'pie', parts: 1 }).success).toBe(false);
    expect(AnswerFigure.safeParse({ shape: 'grid', rows: 0, cols: 4 }).success).toBe(false);
  });

  it('pairs a spec with its own state, and nothing else', () => {
    const parsed = parseAnswerSpec(spec);
    if (!parsed) throw new Error('spec should parse');
    expect(stateMatchesSpec(parsed, { kind: 'shade_regions', shaded: [] })).toBe(true);
    expect(stateMatchesSpec(parsed, { kind: 'slider', value: null })).toBe(false);
  });

  it('lets a slider be untouched, which is not the same as zero', () => {
    expect(parseAnswerState({ kind: 'slider', value: null })).toEqual({
      kind: 'slider',
      value: null,
    });
  });
});

describe('a check result', () => {
  it('only carries partial credit strictly between nothing and everything', () => {
    const base = { correct: false, feedback: [], highlight: [] };
    expect(AnswerCheck.safeParse({ ...base, partial: 0.5 }).success).toBe(true);
    expect(AnswerCheck.safeParse({ ...base, partial: 0 }).success).toBe(false);
    expect(AnswerCheck.safeParse({ ...base, partial: 1 }).success).toBe(false);
  });

  it('can ring every kind of thing a learner can have marked', () => {
    const shapes = [
      { on: 'part', index: 2 },
      { on: 'region', id: 'nucleus' },
      { on: 'item', id: 'divide' },
      { on: 'option', id: 'b' },
      { on: 'pair', left: 'mass', right: 'joule' },
      { on: 'point', at: [1, 2] },
      { on: 'track', value: 90 },
      { on: 'entry' },
      { on: 'box', box: [0, 0, 10, 10] },
    ];
    for (const shape of shapes) expect(AnswerHighlight.safeParse(shape).success).toBe(true);
    expect(AnswerHighlight.safeParse({ on: 'everything' }).success).toBe(false);
  });
});
