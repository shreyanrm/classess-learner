/**
 * onboarding.css is a port of design/prototypes/onboarding-v2.html, rule for rule. This holds every
 * `ob-` rule to its source and lists, by name, the few departures: the artboard chrome the screen
 * does not have, the element resets, and the handwritten reply in the aha canvas.
 */

import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = join(import.meta.dir, '..', '..', '..', '..', '..');
const PROTO = readFileSync(join(REPO, 'design', 'prototypes', 'onboarding-v2.html'), 'utf8');
const SHEET = readFileSync(join(import.meta.dir, 'onboarding.css'), 'utf8');

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

const proto = rules(PROTO);
const sheet = rules(SHEET);

/** ob- selector → the prototype's. */
const PORT: Record<string, string> = {
  '.ob-btn': '.btn',
  '.ob-btn.ob-pig': '.btn.pig',
  '.ob-btn.ob-quiet': '.btn.quiet',
  '.ob-btn.ob-link': '.btn.link',
  '.ob-btn:focus-visible,.ob-field input:focus-visible': '.btn:focus-visible,input:focus-visible',
  '.ob-top': '.top',
  '.ob-top .ob-wm svg': '.top .wm svg',
  '.ob-top .ob-dots': '.top .dots',
  '.ob-top .ob-dots i': '.top .dots i',
  '.ob-top .ob-dots i.ob-on': '.top .dots i.on',
  '.ob-top .ob-dots i.ob-done': '.top .dots i.done',
  '.ob-top .ob-skip': '.top .skip',
  '.ob-body': '.body',
  '.ob-card': '.card',
  '.ob-card .ob-wobo': '.card .wobo',
  '.ob-card .ob-bub': '.card .bub',
  '.ob-card h1': '.card h1',
  '.ob-card p.ob-sub': '.card p.sub',
  '.ob-form': '.form',
  '.ob-field': '.field',
  '.ob-field label,.ob-field legend': '.field label',
  '.ob-field input': '.field input',
  '.ob-field input::placeholder': '.field input::placeholder',
  '.ob-fine': '.fine',
  '.ob-or': '.or',
  '.ob-or::before,.ob-or::after': '.or::before,.or::after',
  '.ob-ta': '.ta',
  '.ob-ta .ob-list': '.ta .list',
  '.ob-ta .ob-opt': '.ta .opt',
  '.ob-ta .ob-opt.ob-on': '.ta .opt.on',
  '.ob-ta .ob-opt span': '.ta .opt span',
  '.ob-ta .ob-opt mark': '.ta .opt mark',
  '.ob-ta .ob-own': '.ta .own',
  '.ob-ta .ob-own b': '.ta .own b',
  '.ob-chips': '.chips',
  '.ob-chips span': '.chips span',
  '.ob-chips span.ob-on': '.chips span.on',
  '.ob-aha': '.aha',
  '.ob-aha .ob-bar': '.aha .bar',
  '.ob-aha .ob-bar b': '.aha .bar b',
  '.ob-aha .ob-live': '.aha .live',
  '.ob-aha .ob-live i': '.aha .live i',
  '.ob-aha .ob-canvas': '.aha .canvas',
  '.ob-aha .ob-ask': '.aha .ask',
  '.ob-aha .ob-ask input': '.aha .ask input',
  '.ob-aha .ob-ask .ob-btn': '.aha .ask .btn',
  '.ob-chipsq': '.chipsq',
  '.ob-chipsq span': '.chipsq span',
  '.ob-parent': '.parent',
  '.ob-note': '.note',
  '.ob-note em': '.note em',
  '.ob-note small': '.note small',
  '.ob-allow': '.allow',
  '.ob-allow b': '.allow b',
  '.ob-allow .ob-bar': '.allow .bar',
  '.ob-allow .ob-bar i': '.allow .bar i',
  '.ob-allow span': '.allow span',
  '.ob-confetti': '.confetti',
  '.ob-confetti i': '.confetti i',
};

/** Named departures: the screen is the page (no artboard corners), resets, the written reply. */
const OWN = new Set([
  '.ob-screen',
  'button.ob-skip',
  'button.ob-opt,button.ob-own',
  '.ob-chips button',
  '.ob-chips button:disabled',
  '.ob-chipsq button',
  '.ob-chips button,.ob-chipsq button',
  'fieldset.ob-field',
  '.ob-field legend',
  '.ob-aha .ob-canvas .ob-hw',
  '.ob-aha .ob-canvas .ob-hw.ob-pig',
]);

/**
 * The touch floor (DESIGN.md §2: "touch targets are 44 px or more"): on a phone the sheet grows a
 * pressable box to 44px and moves nothing else. The only declarations added to a ported rule.
 */
const FLOOR = new Set(['min-height:44px', 'display:inline-flex', 'align-items:center']);

describe('onboarding.css is onboarding-v2, rule for rule', () => {
  it('ports every rule declaration for declaration', () => {
    for (const [mine, theirs] of Object.entries(PORT)) {
      const source = proto.get(theirs) ?? [];
      const ported = sheet.get(mine) ?? [];
      expect(
        ported.filter((d) => !FLOOR.has(d) || source.includes(d)),
        mine,
      ).toEqual(source);
    }
  });
  it('has no rule the prototype does not, beyond the named departures', () => {
    for (const selector of sheet.keys()) {
      expect(selector in PORT || OWN.has(selector), selector).toBe(true);
    }
  });
  it('is the page, not an artboard', () => {
    const screen = sheet.get('.ob-screen') ?? [];
    expect(screen).toContain('background:var(--paper)');
    expect(screen).toContain('min-height:100dvh');
    expect(screen.some((d) => d.startsWith('border-radius'))).toBe(false);
  });
  it('draws no hairline and no border on a surface', () => {
    expect(SHEET).not.toMatch(/0\.5px|1px solid|hairline/);
  });
});
