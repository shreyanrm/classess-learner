/**
 * The practice screen's stylesheet is a port of board 04 of design/prototypes/app-v1.html, rule
 * for rule, and the set it runs is the answer library's own fraction items. This holds every
 * ported `pr-` rule to its source, the answer skin to the prototype's numbers, and the prompt
 * splitter to its one job.
 */

import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AnswerStateOf } from '@wobo/contracts';
import { ANSWER_CSS, check, resetState } from '@wobo/wobo';
import { FRACTIONS_SET, promptParts, quarterMoment } from './set';

const REPO = join(import.meta.dir, '..', '..', '..', '..', '..');
const APP = readFileSync(join(REPO, 'design', 'prototypes', 'app-v1.html'), 'utf8');
const CSS = readFileSync(join(import.meta.dir, 'practice.css'), 'utf8');

/** Every `selector{declarations}` in a stylesheet, media blocks flattened, comments dropped. */
function rules(css: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const flat = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@media[^{]+\{/g, '');
  for (const m of flat.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = (m[1] as string).replace(/\s+/g, ' ').trim();
    const decls = (m[2] as string)
      .split(';')
      .map((d) =>
        d
          .replace(/\s+/g, ' ')
          .trim()
          .replace(/\s*:\s*/, ':'),
      )
      .filter(Boolean);
    if (!selector || selector.startsWith('@')) continue;
    out.set(selector, [...(out.get(selector) ?? []), ...decls]);
  }
  return out;
}

const proto = rules(APP);
const mine = rules(CSS);
const answer = rules(ANSWER_CSS);

/** practice selector → prototype selector, for the rules that are a straight port. */
const PORT: Record<string, string> = {
  '.pr-prac': '.prac',
  '.pr-item': '.item',
  '.pr-q': '.item .q',
  '.pr-q i': '.item .q i',
  '.pr-row': '.item .row',
  '.pr-say': '.item .say',
  '.pr-say.pr-win': '.item .say.win',
  '.pr-set': '.set',
  '.pr-set button': '.set div',
  '.pr-set button.pr-on': '.set div.on',
  '.pr-set .pr-ok': '.set .ok',
  '.pr-set .pr-ok svg': '.set .ok svg',
  '.pr-set .pr-dot': '.set .dot',
};

describe('every ported practice rule is the prototype’s rule', () => {
  for (const [ours, theirs] of Object.entries(PORT)) {
    it(`${ours} ← ${theirs}`, () => {
      const source = proto.get(theirs);
      expect(source).toBeDefined();
      const ported = mine.get(ours);
      expect(ported).toBeDefined();
      for (const decl of source ?? []) expect(ported).toContain(decl);
    });
  }

  it('the phone block stacks the column, tightens the card, hides the head, shrinks the hand', () => {
    expect(mine.get('.pr-prac')).toContain('grid-template-columns:1fr');
    expect(mine.get('.pr-item')).toContain('padding:24px 16px');
    expect(mine.get('.pr-item>.wk-head')).toContain('display:none');
    expect(mine.get('.pr-say')).toContain('font-size:24px');
  });

  it('draws no hairline and no border', () => {
    for (const [selector, decls] of mine) {
      for (const d of decls) {
        if (d.startsWith('border:')) expect(`${selector}{${d}}`).toBe(`${selector}{border:0}`);
        expect(d).not.toMatch(/\b0\.5px\b|\b1px solid\b/);
      }
    }
  });
});

describe('the answer skin takes the prototype’s numbers', () => {
  it('rings in Wobo blue at 4px, in Wobo’s hand, never scaling with the figure', () => {
    const ring = answer.get('.wobo-answer-ring') ?? [];
    expect(ring).toContain('stroke:var(--wa-ring)');
    expect(ring).toContain('stroke-width:4');
    expect(ring).toContain('vector-effect:non-scaling-stroke');
    expect(answer.get('.wobo-answer')).toContain('--wa-ring:var(--pig,#2B45FF)');
  });

  it('parts are paper in 6px ink gutters, and Wobo blue when chosen', () => {
    const part = answer.get('.wobo-answer-part') ?? [];
    expect(part).toContain('fill:var(--wa-surface)');
    expect(part).toContain('stroke:var(--wa-ink)');
    expect(part).toContain('stroke-width:6');
    expect(answer.get('.wobo-answer-part[data-on="true"]')).toContain('fill:var(--wa-mark)');
  });

  it('has no line thinner than 2.5px, no border, and no corner under 10px', () => {
    for (const [selector, decls] of mine) {
      for (const d of decls) {
        const width = d.match(/stroke-width:([\d.]+)/);
        if (width) expect(Number(width[1])).toBeGreaterThanOrEqual(2.5);
        const radius = d.match(/border-radius:(\d+)px/);
        if (radius) expect(Number(radius[1])).toBeGreaterThanOrEqual(10);
        if (d.startsWith('border:')) expect(`${selector}{${d}}`).toBe(`${selector}{border:0}`);
      }
    }
    for (const [selector, decls] of answer) {
      for (const d of decls) {
        const width = d.match(/stroke-width:([\d.]+)/);
        if (width) expect(Number(width[1])).toBeGreaterThanOrEqual(2.5);
        const radius = d.match(/border-radius:(\d+)px/);
        if (radius) expect(Number(radius[1])).toBeGreaterThanOrEqual(10);
        if (d.startsWith('border:')) expect(`${selector}{${d}}`).toBe(`${selector}{border:0}`);
        expect(d).not.toMatch(/\b0\.5px\b|\b1px solid\b/);
      }
    }
  });

  it('resolves every colour through the palette, with the palette as its fallback', () => {
    const root = answer.get('.wobo-answer') ?? [];
    for (const token of ['--wa-ink', '--wa-mark', '--wa-surface', '--wa-tonal', '--wa-pressed']) {
      expect(root.some((d) => d.startsWith(`${token}:var(--`))).toBe(true);
    }
    expect(root.join(';')).not.toMatch(/--wobo-/);
  });
});

describe('the fractions set', () => {
  it('is five real items the library can check, answered empty to a wrong', () => {
    expect(FRACTIONS_SET).toHaveLength(5);
    for (const spec of FRACTIONS_SET) {
      const blank = check(spec, resetState(spec));
      expect(blank.correct).toBe(false);
      expect(spec.prompt).toBeTruthy();
    }
  });

  it('sets a fraction in the prompt in Wobo’s hand, and nothing else', () => {
    expect(promptParts('Colour ½ of the shape.')).toEqual([
      { text: 'Colour ', fraction: false },
      { text: '½', fraction: true },
      { text: ' of the shape.', fraction: false },
    ]);
    expect(promptParts('Build 3/4 on the number pad')).toEqual([
      { text: 'Build ', fraction: false },
      { text: '3/4', fraction: true },
      { text: ' on the number pad', fraction: false },
    ]);
    expect(promptParts('Colour a half of the shape')).toEqual([
      { text: 'Colour a half of the shape', fraction: false },
    ]);
  });

  it('lists the board’s five items, in its order, word for word', () => {
    expect(FRACTIONS_SET.map((s) => s.prompt)).toEqual([
      'Colour ½ of the shape.',
      'Which is bigger, ⅓ or ¼?',
      'Drag the point to ⅔',
      'Build 3/4 on the number pad',
      'Draw a line that cuts it in half',
    ]);
    expect(FRACTIONS_SET.map((s) => s.kind)).toEqual([
      'shade_regions',
      'choose_visual',
      'place_points',
      'number_pad',
      'draw',
    ]);
  });

  it('says "one more" only when the learner is exactly one part short', () => {
    const half = FRACTIONS_SET[0];
    if (half.kind !== 'shade_regions') throw new Error('the first item shades a half');
    const one = check(half, { kind: 'shade_regions', shaded: [0] });
    expect(one.correct).toBe(false);
    expect(one.feedback.some((f) => f.code === 'too_few' && f.count === 1)).toBe(true);
    const three = check(half, { kind: 'shade_regions', shaded: [0, 1, 2] });
    expect(three.feedback.some((f) => f.code === 'too_few')).toBe(false);
    expect(check(half, { kind: 'shade_regions', shaded: [0, 3] }).correct).toBe(true);
  });

  it('rings the learner’s own quarter and writes the board’s line beside it', () => {
    const half = FRACTIONS_SET[0];
    const state: AnswerStateOf<'shade_regions'> = { kind: 'shade_regions', shaded: [2] };
    const moment = quarterMoment(half, state, check(half, state));
    expect(moment?.note).toBe("that's a quarter, not half");
    expect(moment?.result.highlight).toEqual([{ on: 'part', index: 2 }]);
    // nothing to ring before a check, after a right answer, or on any other item
    expect(quarterMoment(half, state, null)).toBeNull();
    const two: AnswerStateOf<'shade_regions'> = { kind: 'shade_regions', shaded: [0, 1] };
    expect(quarterMoment(half, two, check(half, two))).toBeNull();
  });
});
