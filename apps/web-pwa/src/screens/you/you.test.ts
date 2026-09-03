/**
 * The You screen's own rules are a port of board 05 of design/prototypes/app-v1.html and the
 * parent-view mock in design/prototypes/site-parents.html, rule for rule. This holds every `wy-`
 * rule to its source — the same declarations, the same values — and keeps the sheet free of any
 * line, corner or colour of its own.
 */

import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = join(import.meta.dir, '..', '..', '..', '..', '..');
const PROTO_DIR = join(REPO, 'design', 'prototypes');
const APP = readFileSync(join(PROTO_DIR, 'app-v1.html'), 'utf8');
const PARENTS = readFileSync(join(PROTO_DIR, 'site-parents.html'), 'utf8');
const SHEET = readFileSync(join(import.meta.dir, 'you.css'), 'utf8');

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

const app = rules(APP);
const parents = rules(PARENTS);
const sheet = rules(SHEET);

/** wy- selector → its source and the selector there. */
const PORT: Record<string, [Map<string, string[]>, string]> = {
  '.wy-you': [app, '.you'],
  '.wy-strengths': [app, '.strengths'],
  '.wy-strengths > div': [app, '.strengths > div'],
  '.wy-strengths b': [app, '.strengths b'],
  '.wy-strengths svg': [app, '.strengths svg'],
  '.wy-chart': [app, '.chart'],
  '.wy-chart i': [app, '.chart i'],
  '.wy-chart i.wy-k': [app, '.chart i.k'],
  '.wy-mock': [parents, '.mock'],
  '.wy-mock .wy-top': [parents, '.mock .top'],
  '.wy-mock .wy-top b': [parents, '.mock .top b'],
  '.wy-mock .wy-row': [parents, '.mock .row'],
  '.wy-mock .wy-row b': [parents, '.mock .row b'],
  '.wy-mock .wy-row span': [parents, '.mock .row span'],
  '.wy-mock .wy-row .wy-ok': [parents, '.mock .row .ok'],
  '.wy-mock .wy-row .wy-now': [parents, '.mock .row .now'],
  '.wy-mock .wy-note': [parents, '.mock .note'],
  '.wy-mock .wy-note em': [parents, '.mock .note em'],
  '.wy-mock .wy-lock': [parents, '.mock .lock'],
  '.wy-mock .wy-lock svg': [parents, '.mock .lock svg'],
  '.wy-art': [parents, '.art'],
  '.wy-art.wy-lilac': [parents, '.art.lilac'],
};

/** Element resets, the two lines the screen needs that the prototype drew as chrome, and the rail
 * kept in view on a page taller than the artboard. */
const OWN = new Set([
  '.wy-crumb-btn',
  '.wy-strengths p',
  '.wy-you .wk-card>p a',
  '.wy-shell .wk-rail',
]);

describe('you.css is board 05, rule for rule', () => {
  it('ports every rule declaration for declaration', () => {
    for (const [mine, [source, theirs]] of Object.entries(PORT)) {
      expect(sheet.get(mine), mine).toEqual(source.get(theirs));
    }
  });
  it('has no rule the prototype does not, beyond element resets', () => {
    for (const selector of sheet.keys()) {
      expect(selector in PORT || OWN.has(selector), selector).toBe(true);
    }
  });
  it('keeps the phone block', () => {
    expect(SHEET).toContain('@media (max-width:900px){\n  .wy-you{grid-template-columns:1fr}');
    expect(SHEET).toContain('.wy-art{min-height:0}');
  });
  it('draws no hairline, no border on a surface, and no colour of its own', () => {
    expect(SHEET).not.toMatch(/0\.5px|1px solid|hairline/);
    const colours = SHEET.match(/#[0-9a-f]{3,8}\b/gi) ?? [];
    // the prototype's own two: the pigment's white text, and the ink under the floating mock
    expect(new Set(colours.map((c) => c.toLowerCase()))).toEqual(new Set(['#fff']));
  });
});
