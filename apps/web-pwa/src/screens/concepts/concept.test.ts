/**
 * A concept renders on the lesson plane, so concept.css must add almost nothing: the plane, its
 * canvas, its say row and its side column are lesson.css's rules. What is here is the step made
 * into a control — and it is held, declaration for declaration, to the step the prototype draws.
 */

import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = join(import.meta.dir, '..', '..', '..', '..', '..');
const APP = readFileSync(join(REPO, 'design', 'prototypes', 'app-v1.html'), 'utf8');
const CSS = readFileSync(join(import.meta.dir, 'concept.css'), 'utf8');

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

/** concept selector → prototype selector, for the rules that are a straight port. */
const PORT: Record<string, string> = {
  '.cn-steps': '.steps',
  '.cn-step': '.steps div',
  '.cn-step i': '.steps i',
  '.cn-step.cn-on': '.steps div.on',
  '.cn-step.cn-on i': '.steps div.on i',
};

describe('the concept’s steps are the prototype’s steps', () => {
  for (const [ours, theirs] of Object.entries(PORT)) {
    it(`${ours} ← ${theirs}`, () => {
      const source = proto.get(theirs);
      expect(source).toBeDefined();
      const ported = mine.get(ours);
      expect(ported).toBeDefined();
      for (const decl of source ?? []) expect(ported).toContain(decl);
    });
  }

  it('a step is a button, so it carries a button’s reset and nothing else', () => {
    const step = mine.get('.cn-step') ?? [];
    const source = new Set(proto.get('.steps div') ?? []);
    const own = step.filter((d) => !source.has(d) && !d.startsWith('min-height:'));
    expect(own.sort()).toEqual(
      [
        'background:transparent',
        'border:0',
        'cursor:pointer',
        'font-family:inherit',
        'line-height:1.35',
        'padding:0',
        'text-align:left',
        'width:100%',
      ].sort(),
    );
  });

  it('the phone block puts the step and the board’s handles on the 44px touch floor', () => {
    expect(mine.get('.cn-step')).toContain('min-height:44px');
    expect(mine.get('.cn-board input[type=range]')).toContain('min-height:44px');
  });
});

describe('the concept stylesheet keeps the law (DESIGN.md §2, §3)', () => {
  it('prefixes every class, so nothing meets an older screen’s rule', () => {
    for (const selector of mine.keys()) {
      for (const cls of selector.matchAll(/\.([\w-]+)/g)) {
        const c = cls[1] ?? '';
        expect(c.startsWith('cn-') || c.startsWith('wk-') || c.startsWith('ls-')).toBe(true);
      }
    }
  });

  it('draws no hairline and no border', () => {
    expect(CSS).not.toMatch(/border[^;]*:\s*1px/);
    expect(CSS).not.toMatch(/border[^;]*:\s*0?\.\d+px/);
    for (const [selector, decls] of mine) {
      for (const d of decls) {
        if (d.startsWith('border:')) expect(`${selector}{${d}}`).toBe(`${selector}{border:0}`);
      }
    }
  });

  it('has no corner under 10px and names no colour of its own', () => {
    for (const [, decls] of mine) {
      for (const d of decls) {
        const radius = d.match(/^border-radius:(\d+)px/);
        if (radius) expect(Number(radius[1])).toBeGreaterThanOrEqual(10);
      }
    }
    // the one white is the prototype's own (the lit step's numeral on Wobo blue)
    const hexes = new Set([...CSS.matchAll(/#[0-9a-f]{3,8}\b/gi)].map((m) => m[0].toLowerCase()));
    for (const h of hexes) expect(['#fff']).toContain(h);
  });

  it('uses the two faces only, through the tokens', () => {
    expect(CSS).not.toMatch(/font-family\s*:\s*(?!inherit|var\()/);
  });
});
