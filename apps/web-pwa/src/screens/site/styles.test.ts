import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SITE_CSS } from './styles';

const HERE = import.meta.dir;
const SOURCES = readdirSync(HERE)
  .filter((f) => (f.endsWith('.tsx') || f.endsWith('.ts')) && !f.endsWith('.test.ts'))
  .map((f) => readFileSync(join(HERE, f), 'utf8'));

/** Every `st-…` class name the components ask for. */
function classesUsed(): string[] {
  const found = new Set<string>();
  for (const source of SOURCES) {
    for (const attr of source.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\}|\{'([^']*)'\})/g)) {
      const value = attr[1] ?? attr[2] ?? attr[3] ?? '';
      for (const name of value.split(/[\s{}$]+/)) if (name.startsWith('st-')) found.add(name);
    }
  }
  return [...found].sort();
}

describe('the site stylesheet', () => {
  it('defines every class the pages ask for', () => {
    const used = classesUsed();
    expect(used.length).toBeGreaterThan(10);
    for (const name of used) expect(SITE_CSS, name).toContain(`.${name}`);
  });

  /**
   * The stylesheet is a template literal. A backtick inside it — in a rule or, more easily, inside a
   * comment quoting a selector — ends the string and the module stops parsing. It is a build error
   * rather than a silent one, but only once someone loads the page, so it is caught here.
   */
  it('carries no backtick that would end its own template literal', () => {
    expect(SITE_CSS).not.toContain('`');
  });

  /**
   * Every colour is a token, so dark mode costs nothing — with one deliberate exception. The print
   * block forces pure black on pure white, because a printer has no theme and a legal page printed
   * in the light theme's near-black on near-white wastes toner and reads worse. So the check runs
   * over the screen rules, and then names the only two hexes the print block is allowed.
   */
  it('writes every colour as a token, so dark mode costs nothing', () => {
    const screenRules = SITE_CSS.replace(/\/\*[\s\S]*?\*\//g, '').replace(
      /@media print \{[\s\S]*?\n\}/,
      '',
    );
    expect(screenRules).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(screenRules).not.toMatch(/\brgba?\(/);
  });

  it('spends its only two hexes on the print block, on paper with no theme', () => {
    const print = /@media print \{[\s\S]*?\n\}/.exec(SITE_CSS)?.[0] ?? '';
    expect(print).toContain('#fff');
    expect(print).toContain('#000');
    const hexes = [...new Set([...print.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0]))];
    expect(hexes.sort()).toEqual(['#000', '#fff']);
  });

  /**
   * The accessibility floor (WOBO-PLAN §18). It is written once, here, and every public page wears
   * it because every public page wears the one shell — so this asserts the floor exists rather
   * than each page re-deriving it. The measured proof is tests/responsive.spec.ts.
   */
  it('raises the body-copy floor to 14px for the small landing classes it reuses', () => {
    const floor = SITE_CSS.slice(SITE_CSS.indexOf('.st .lp-note'));
    for (const name of ['.lp-note', '.lp-cta small', '.lp-footer', '.lp-tier-cadence']) {
      expect(floor, name).toContain(name);
    }
    expect(floor).toContain('font-size: 14px');
  });

  it('gives every chrome link and control a 44px thumb target', () => {
    const floor = SITE_CSS.slice(SITE_CSS.indexOf('.st .lp-note'));
    expect(floor).toContain('.st .lp-btn { min-height: 44px; }');
    for (const name of ['.st .lp-nav-links a', '.st .lp-footer-links a', '.st .lp-home']) {
      expect(floor, name).toContain(name);
    }
    expect(floor).toContain('min-height: 44px;');
  });

  it('keeps the public navigation visible on a phone rather than hiding it', () => {
    // The landing sheet drops `.lp-nav-links` under 680px because they are anchors into the page
    // under it. On a document page they are the only way to another page, so they wrap instead.
    const phone = /@media \(max-width: 680px\) \{[\s\S]*?\n\}/.exec(SITE_CSS)?.[0] ?? '';
    expect(phone).toContain('.st .lp-nav-links');
    expect(phone).toContain('display: flex');
    expect(phone).not.toContain('.st .lp-nav-links { display: none');
  });

  // DESIGN.md §2: depth is a hairline and a tonal step, never a shadow.
  it('casts no shadow', () => {
    expect(SITE_CSS).not.toContain('box-shadow');
    expect(SITE_CSS).not.toContain('text-shadow');
  });

  it('keeps the reduced-motion escape hatch', () => {
    expect(SITE_CSS).toContain('prefers-reduced-motion');
  });
});
