/**
 * The lesson screen's stylesheet is a port of board 03 of design/prototypes/app-v1.html, rule for
 * rule. This holds every ported `ls-` rule to its source — the same declarations, the same values —
 * and names the two rules that are deliberately the screen's own.
 */

import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = join(import.meta.dir, '..', '..', '..', '..', '..');
const APP = readFileSync(join(REPO, 'design', 'prototypes', 'app-v1.html'), 'utf8');
const CSS = readFileSync(join(import.meta.dir, 'lesson.css'), 'utf8');

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

/** lesson selector → prototype selector, for the rules that are a straight port. */
const PORT: Record<string, string> = {
  '.ls-plane': '.plane',
  '.ls-bar': '.plane .bar',
  '.ls-bar b': '.plane .bar b',
  '.ls-live': '.plane .bar .live',
  '.ls-live i': '.plane .bar .live i',
  '.ls-canvas': '.plane .canvas',
  '.ls-say': '.plane .say',
  '.ls-say .hand': '.plane .say .hand',
  '.ls-side': '.side',
  '.ls-side .wk-card': '.side .card',
  '.ls-steps': '.steps',
  '.ls-steps div': '.steps div',
  '.ls-steps i': '.steps i',
  '.ls-steps div.ls-on': '.steps div.on',
  '.ls-steps div.ls-on i': '.steps div.on i',
  '.ls-tools': '.tools',
};

describe('every ported lesson rule is the prototype’s rule', () => {
  for (const [ours, theirs] of Object.entries(PORT)) {
    it(`${ours} ← ${theirs}`, () => {
      const source = proto.get(theirs);
      expect(source).toBeDefined();
      const ported = mine.get(ours);
      expect(ported).toBeDefined();
      for (const decl of source ?? []) expect(ported).toContain(decl);
    });
  }

  it('.ls-lesson is the prototype’s grid, at the viewport’s height rather than the artboard’s', () => {
    const source = proto.get('.lesson') ?? [];
    const ported = mine.get('.ls-lesson') ?? [];
    for (const decl of source.filter((d) => !d.startsWith('height:'))) {
      expect(ported).toContain(decl);
    }
    expect(source.some((d) => d.startsWith('height:calc(900px'))).toBe(true);
    expect(ported.some((d) => d.startsWith('height:calc(100dvh'))).toBe(true);
    // the phone block: one column, its own height
    expect(ported).toContain('grid-template-columns:1fr');
    expect(ported).toContain('height:auto');
  });

  it('the phone block keeps the canvas’s floor and the smaller hand', () => {
    expect(mine.get('.ls-canvas')).toContain('min-height:300px');
    expect(mine.get('.ls-say .hand')).toContain('font-size:20px');
  });

  it('the say row’s button stays on a phone — a lesson the learner cannot move on is a trap', () => {
    expect(proto.get('.plane .say .btn')).toContain('display:none');
    for (const [selector, decls] of mine) {
      if (selector.includes('.wk-btn')) expect(decls).not.toContain('display:none');
    }
  });
});

describe('the lesson stylesheet is bold ink on good paper', () => {
  it('draws no hairline and no border', () => {
    for (const [selector, decls] of mine) {
      for (const d of decls) {
        if (d.startsWith('border:')) expect(`${selector}{${d}}`).toBe(`${selector}{border:0}`);
        expect(d).not.toMatch(/\b0\.5px\b|\b1px solid\b/);
      }
    }
  });

  it('has no corner under 10px and no colour of its own', () => {
    for (const [, decls] of mine) {
      for (const d of decls) {
        const radius = d.match(/^border-radius:(\d+)px/);
        if (radius) expect(Number(radius[1])).toBeGreaterThanOrEqual(10);
        // the one white is the prototype's own (the on-step's numeral on Wobo blue)
        expect(d.replace('#fff', '')).not.toMatch(/#[0-9a-f]{3,6}\b/i);
      }
    }
  });
});
