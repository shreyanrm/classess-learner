import { describe, expect, it } from 'bun:test';
import { ANSWER_KINDS, AnswerCheck, type AnswerSpecOf } from '@wobo/contracts';
import { check } from '../../src/answers/check';
import {
  CHOOSE_HALF,
  CIRCLE_CELL,
  DRAW_ANGLE,
  DRAW_SEGMENT,
  DRAW_TRIANGLE,
  EXPRESSION_AREA,
  MATCH_UNITS,
  ORDER_STEPS,
  PAD_FRACTION,
  PAD_VALUE,
  PLACE_LINE,
  PLACE_PLANE,
  SAMPLE_SPECS,
  SHADE_EXACT,
  SHADE_HALF,
  SLIDER_ANGLE,
} from '../../src/answers/samples';
import { resetState } from '../../src/answers/state';

/** Codes only, in order — the shape a truth table asserts on. */
const codes = (result: { feedback: { code: string }[] }): string[] =>
  result.feedback.map((f) => f.code);

describe('the check contract itself', () => {
  it('answers every kind the contract lists, and returns a result the contract accepts', () => {
    expect(SAMPLE_SPECS.map((s) => s.kind).sort()).toEqual([...ANSWER_KINDS].sort());
    for (const spec of SAMPLE_SPECS) {
      const result = check(spec, resetState(spec));
      expect(AnswerCheck.safeParse(result).success).toBe(true);
    }
  });

  it('an empty attempt is empty, never wrong-with-a-reason', () => {
    for (const spec of SAMPLE_SPECS) {
      const result = check(spec, resetState(spec));
      expect(result.correct).toBe(false);
      // Order is the exception: its cards always sit in SOME sequence, so the spec's own opening
      // order is already a real attempt — a wrong one, with whatever happens to be in place.
      if (spec.kind === 'order') continue;
      expect(codes(result)).toEqual(['empty']);
      expect(result.partial).toBeUndefined();
    }
  });

  it('refuses a state of the wrong kind rather than throwing on bad data', () => {
    const result = check(SHADE_HALF, { kind: 'slider', value: 3 });
    expect(result).toEqual({ correct: false, feedback: [{ code: 'malformed' }], highlight: [] });
  });

  it('never reports partial credit on a correct answer', () => {
    const result = check(SLIDER_ANGLE, { kind: 'slider', value: 90 });
    expect(result.correct).toBe(true);
    expect(result.partial).toBeUndefined();
  });
});

describe('shade regions', () => {
  it('counts parts when the count is what was asked', () => {
    expect(check(SHADE_HALF, { kind: 'shade_regions', shaded: [0, 1, 2, 3] }).correct).toBe(true);
    // Any four of the eight is a half. The figure does not care which four.
    expect(check(SHADE_HALF, { kind: 'shade_regions', shaded: [0, 2, 5, 7] }).correct).toBe(true);
  });

  it('rings the surplus, and only the surplus', () => {
    const result = check(SHADE_HALF, { kind: 'shade_regions', shaded: [0, 1, 2, 3, 4, 5] });
    expect(result.correct).toBe(false);
    expect(codes(result)).toEqual(['too_many']);
    expect(result.feedback[0]).toMatchObject({ count: 2, expected: 4, actual: 6 });
    expect(result.highlight).toEqual([
      { on: 'part', index: 4 },
      { on: 'part', index: 5 },
    ]);
  });

  it('says how many are missing, and rings nothing — the answer stays the learner’s to find', () => {
    const result = check(SHADE_HALF, { kind: 'shade_regions', shaded: [0, 1] });
    expect(codes(result)).toEqual(['too_few']);
    expect(result.feedback[0]).toMatchObject({ count: 2 });
    expect(result.highlight).toEqual([]);
    expect(result.partial).toBeCloseTo(0.5, 6);
  });

  it('ignores a repeated or out-of-range part rather than counting it twice', () => {
    expect(check(SHADE_HALF, { kind: 'shade_regions', shaded: [0, 0, 1, 2, 3, 99] }).correct).toBe(
      true,
    );
  });

  it('checks WHICH parts when the spec names them', () => {
    expect(check(SHADE_EXACT, { kind: 'shade_regions', shaded: [0, 1, 2] }).correct).toBe(true);
    const wrong = check(SHADE_EXACT, { kind: 'shade_regions', shaded: [3, 4, 5] });
    expect(wrong.correct).toBe(false);
    expect(codes(wrong)).toEqual(['wrong_parts', 'too_few']);
    expect(wrong.highlight).toEqual([
      { on: 'part', index: 3 },
      { on: 'part', index: 4 },
      { on: 'part', index: 5 },
    ]);
  });

  it('gives partial credit for the right parts among the wrong ones', () => {
    const result = check(SHADE_EXACT, { kind: 'shade_regions', shaded: [0, 1, 5] });
    expect(result.partial).toBeCloseTo(2 / 3, 6);
  });
});

describe('place points', () => {
  it('accepts the targets in either order — a point has no name', () => {
    expect(
      check(PLACE_PLANE, {
        kind: 'place_points',
        points: [
          [-1, -2],
          [2, 3],
        ],
      }).correct,
    ).toBe(true);
  });

  it('counts a near miss as missing, and rings the learner’s own stray point', () => {
    const result = check(PLACE_PLANE, {
      kind: 'place_points',
      points: [
        [2, 3],
        [4, 4],
      ],
    });
    expect(result.correct).toBe(false);
    expect(codes(result)).toEqual(['missing_point', 'extra_point']);
    expect(result.highlight).toEqual([{ on: 'point', at: [4, 4] }]);
    expect(result.partial).toBeCloseTo(0.5, 6);
  });

  it('half a step of slack, so a snapped point is right or plainly wrong', () => {
    expect(check(PLACE_LINE, { kind: 'place_points', points: [[0.75, 0]] }).correct).toBe(true);
    expect(check(PLACE_LINE, { kind: 'place_points', points: [[0.875, 0]] }).correct).toBe(true);
    expect(check(PLACE_LINE, { kind: 'place_points', points: [[1, 0]] }).correct).toBe(false);
  });

  it('ignores the y coordinate on a number line', () => {
    expect(check(PLACE_LINE, { kind: 'place_points', points: [[0.75, 99]] }).correct).toBe(true);
  });
});

describe('slider', () => {
  it('an untouched slider is empty, not zero', () => {
    expect(codes(check(SLIDER_ANGLE, { kind: 'slider', value: null }))).toEqual(['empty']);
  });

  it('lands on the step it snapped to', () => {
    expect(check(SLIDER_ANGLE, { kind: 'slider', value: 90 }).correct).toBe(true);
    expect(check(SLIDER_ANGLE, { kind: 'slider', value: 95 }).correct).toBe(false);
  });

  it('reports how far off it is, and rings the thumb where the learner left it', () => {
    const result = check(SLIDER_ANGLE, { kind: 'slider', value: 120 });
    expect(result.feedback[0]).toEqual({ code: 'off_by', expected: 90, actual: 120 });
    expect(result.highlight).toEqual([{ on: 'track', value: 120 }]);
    expect(result.partial).toBeCloseTo(1 - 30 / 180, 6);
  });

  it('honours an explicit tolerance over the step', () => {
    const loose: AnswerSpecOf<'slider'> = { ...SLIDER_ANGLE, tolerance: 15 };
    expect(check(loose, { kind: 'slider', value: 100 }).correct).toBe(true);
  });
});

describe('order', () => {
  it('is right only in the one right sequence', () => {
    expect(
      check(ORDER_STEPS, { kind: 'order', order: ['subtract', 'divide', 'check'] }).correct,
    ).toBe(true);
  });

  it('rings the cards that are out of place, and scores the ones that are not', () => {
    const result = check(ORDER_STEPS, {
      kind: 'order',
      order: ['divide', 'subtract', 'check'],
    });
    expect(codes(result)).toEqual(['wrong_order']);
    expect(result.feedback[0]).toMatchObject({ count: 2, ids: ['divide', 'subtract'] });
    expect(result.highlight).toEqual([
      { on: 'item', id: 'divide' },
      { on: 'item', id: 'subtract' },
    ]);
    expect(result.partial).toBeCloseTo(1 / 3, 6);
  });

  it('a list of the wrong length is bad data, not a wrong answer', () => {
    expect(codes(check(ORDER_STEPS, { kind: 'order', order: ['divide'] }))).toEqual(['malformed']);
  });
});

describe('match', () => {
  const right = [
    { left: 'mass', right: 'kilogram' },
    { left: 'force', right: 'newton' },
    { left: 'energy', right: 'joule' },
  ];

  it('is right when every pair is drawn', () => {
    expect(check(MATCH_UNITS, { kind: 'match', links: right }).correct).toBe(true);
  });

  it('rings the crossed wires and counts what is still unjoined', () => {
    const result = check(MATCH_UNITS, {
      kind: 'match',
      links: [
        { left: 'mass', right: 'kilogram' },
        { left: 'force', right: 'joule' },
      ],
    });
    expect(codes(result)).toEqual(['wrong_pair', 'unpaired']);
    expect(result.highlight).toEqual([{ on: 'pair', left: 'force', right: 'joule' }]);
    expect(result.partial).toBeCloseTo(1 / 3, 6);
  });
});

describe('number pad', () => {
  it('reads a decimal, including its sign', () => {
    expect(check(PAD_VALUE, { kind: 'number_pad', entry: '-12.5' }).correct).toBe(true);
  });

  it('names a sign error as a sign error, not as a distance', () => {
    const result = check(PAD_VALUE, { kind: 'number_pad', entry: '12.5' });
    expect(codes(result)).toEqual(['wrong_sign']);
    expect(result.partial).toBe(0.5);
  });

  it('wants the fraction it asked for, in the form it asked for', () => {
    expect(check(PAD_FRACTION, { kind: 'number_pad', entry: '3/4' }).correct).toBe(true);
    expect(codes(check(PAD_FRACTION, { kind: 'number_pad', entry: '6/8' }))).toEqual([
      'not_simplified',
    ]);
    expect(codes(check(PAD_FRACTION, { kind: 'number_pad', entry: '0.75' }))).toEqual([
      'wrong_unit',
    ]);
    expect(codes(check(PAD_FRACTION, { kind: 'number_pad', entry: '1/4' }))).toEqual(['off_by']);
  });

  it('a half-typed entry is malformed, and the ring goes on the display', () => {
    const result = check(PAD_VALUE, { kind: 'number_pad', entry: '-' });
    expect(codes(result)).toEqual(['malformed']);
    expect(check(PAD_VALUE, { kind: 'number_pad', entry: '-12.5' }).highlight).toEqual([
      { on: 'entry' },
    ]);
  });

  it('applies a tolerance when the item allows one', () => {
    const loose: AnswerSpecOf<'number_pad'> = { ...PAD_VALUE, tolerance: 0.6 };
    expect(check(loose, { kind: 'number_pad', entry: '-12' }).correct).toBe(true);
  });
});

describe('expression', () => {
  it('accepts the wanted form and the spellings the item allows', () => {
    expect(check(EXPRESSION_AREA, { kind: 'expression', latex: '\\pi r^{2}' }).correct).toBe(true);
    expect(check(EXPRESSION_AREA, { kind: 'expression', latex: '\\pi\\times r^{2}' }).correct).toBe(
      true,
    );
    expect(check(EXPRESSION_AREA, { kind: 'expression', latex: '\\pi r^2' }).correct).toBe(true);
  });

  it('rejects a different expression, without pretending to do algebra', () => {
    const result = check(EXPRESSION_AREA, { kind: 'expression', latex: '2\\pi r' });
    expect(codes(result)).toEqual(['wrong_expression']);
    expect(result.highlight).toEqual([{ on: 'entry' }]);
  });
});

describe('draw', () => {
  it('accepts a segment drawn either way round', () => {
    expect(
      check(DRAW_SEGMENT, {
        kind: 'draw',
        path: [
          [500, 100],
          [500, 500],
        ],
      }).correct,
    ).toBe(true);
    expect(
      check(DRAW_SEGMENT, {
        kind: 'draw',
        path: [
          [510, 490],
          [495, 110],
        ],
      }).correct,
    ).toBe(true);
  });

  it('calls a bowed line the wrong shape before it calls it the wrong place', () => {
    const result = check(DRAW_SEGMENT, {
      kind: 'draw',
      path: [
        [500, 100],
        [700, 300],
        [500, 500],
      ],
    });
    expect(codes(result)).toEqual(['wrong_shape']);
  });

  it('measures a drawn angle, and says the degrees rather than a verdict', () => {
    const rightAngle = check(DRAW_ANGLE, {
      kind: 'draw',
      path: [
        [700, 300],
        [500, 300],
        [500, 100],
      ],
    });
    expect(rightAngle.correct).toBe(true);

    const shallow = check(DRAW_ANGLE, {
      kind: 'draw',
      path: [
        [700, 300],
        [500, 300],
        [700, 100],
      ],
    });
    expect(codes(shallow)).toEqual(['wrong_angle']);
    expect(shallow.feedback[0]).toMatchObject({ expected: 90, actual: 45 });
  });

  it('accepts a triangle whatever corner it was started from', () => {
    const drawn = check(DRAW_TRIANGLE, {
      kind: 'draw',
      path: [
        [500, 150],
        [300, 450],
        [700, 450],
        [500, 150],
      ],
    });
    expect(drawn.correct).toBe(true);
  });

  it('a single point is nothing drawn yet', () => {
    expect(codes(check(DRAW_SEGMENT, { kind: 'draw', path: [[500, 100]] }))).toEqual(['empty']);
  });
});

describe('circle the part', () => {
  const loop = (cx: number, cy: number, r: number): [number, number][] =>
    Array.from({ length: 16 }, (_, i) => {
      const a = (i / 16) * Math.PI * 2;
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    });

  it('reads a loop by what it encloses', () => {
    expect(check(CIRCLE_CELL, { kind: 'circle_part', lasso: loop(500, 300, 120) }).correct).toBe(
      true,
    );
  });

  it('rings the parts the loop wrongly swallowed', () => {
    const result = check(CIRCLE_CELL, { kind: 'circle_part', lasso: loop(500, 300, 460) });
    expect(codes(result)).toEqual(['wrong_parts']);
    expect(result.highlight).toEqual([
      { on: 'region', id: 'wall' },
      { on: 'region', id: 'vacuole' },
    ]);
  });

  it('a loop around nothing is an empty answer', () => {
    expect(codes(check(CIRCLE_CELL, { kind: 'circle_part', lasso: loop(60, 560, 20) }))).toEqual([
      'empty',
    ]);
  });

  it('a stroke that never came back is not a loop', () => {
    const result = check(CIRCLE_CELL, {
      kind: 'circle_part',
      lasso: [
        [0, 0],
        [500, 0],
        [1000, 0],
      ],
    });
    expect(codes(result)).toEqual(['malformed']);
  });
});

describe('choose among visuals', () => {
  it('is right on the one right option', () => {
    expect(check(CHOOSE_HALF, { kind: 'choose_visual', selected: ['b'] }).correct).toBe(true);
  });

  it('a single-answer item refuses two picks before it judges them', () => {
    const result = check(CHOOSE_HALF, { kind: 'choose_visual', selected: ['a', 'b'] });
    expect(codes(result)).toEqual(['too_many']);
  });

  it('rings the wrong pick, and never the right one', () => {
    const result = check(CHOOSE_HALF, { kind: 'choose_visual', selected: ['c'] });
    expect(codes(result)).toEqual(['wrong_option', 'missing_option']);
    expect(result.highlight).toEqual([{ on: 'option', id: 'c' }]);
  });

  it('a multi-answer item scores the overlap', () => {
    const multi: AnswerSpecOf<'choose_visual'> = { ...CHOOSE_HALF, multi: true, want: ['b', 'c'] };
    const result = check(multi, { kind: 'choose_visual', selected: ['b'] });
    expect(result.partial).toBe(0.5);
    expect(check(multi, { kind: 'choose_visual', selected: ['b', 'c'] }).correct).toBe(true);
  });

  it('ignores an option id the item does not have', () => {
    expect(check(CHOOSE_HALF, { kind: 'choose_visual', selected: ['zzz'] }).feedback).toEqual([
      { code: 'empty' },
    ]);
  });
});
