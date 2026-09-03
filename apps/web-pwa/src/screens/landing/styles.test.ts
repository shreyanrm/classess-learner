/**
 * The stylesheet, checked as data.
 *
 * A CSS-in-a-template-literal has one failure mode nothing else catches: a stray backtick inside it
 * ends the literal early, and the rest of the sheet is parsed as JavaScript. That happened once
 * here, and the page did not render at all. So the sheet is evaluated and measured, every class the
 * components use is asserted present, and the design laws that live in CSS — no shadows, 3px
 * corners, tokens rather than hexes — are asserted with it.
 */

import { describe, expect, it } from 'bun:test';
import { LANDING_CSS } from './styles';

describe('the landing stylesheet', () => {
  it('is whole — the template literal was not cut short', () => {
    expect(LANDING_CSS.length).toBeGreaterThan(6000);
    expect(LANDING_CSS.trimEnd().endsWith('}')).toBe(true);
  });

  it('interpolated every token it references', () => {
    expect(LANDING_CSS).not.toContain('undefined');
    expect(LANDING_CSS).not.toContain('[object Object]');
    expect(LANDING_CSS).not.toContain('${');
  });

  it('balances its braces', () => {
    const open = (LANDING_CSS.match(/{/g) ?? []).length;
    const close = (LANDING_CSS.match(/}/g) ?? []).length;
    expect(open).toBe(close);
  });

  it('defines every class the page renders', () => {
    for (const cls of [
      '.lp',
      '.lp-field',
      '.lp-trail',
      '.lp-nib',
      '.lp-wrap',
      '.lp-section',
      '.lp-reveal',
      '.lp-kicker',
      '.lp-h1',
      '.lp-h2',
      '.lp-lead',
      '.lp-hand',
      '.lp-btn',
      '.lp-nav',
      '.lp-nav-inner',
      '.lp-mark',
      '.lp-nav-links',
      '.lp-hero',
      '.lp-stage',
      '.lp-frame',
      '.lp-board',
      '.lp-steps',
      '.lp-step',
      '.lp-demo',
      '.lp-ask',
      '.lp-note',
      '.lp-chips',
      '.lp-chip',
      '.lp-cards',
      '.lp-card',
      '.lp-tiers',
      '.lp-tier',
      '.lp-price',
      '.lp-closing',
      '.lp-footer',
    ]) {
      expect(LANDING_CSS).toContain(`${cls} `);
    }
  });

  it('has no shadows anywhere (DESIGN.md §2: depth is hairlines and tonal steps)', () => {
    expect(LANDING_CSS).not.toContain('box-shadow');
    expect(LANDING_CSS).not.toContain('text-shadow');
    expect(LANDING_CSS).not.toContain('drop-shadow');
  });

  it('keeps corners sharp — 3px, nothing rounder except the round nib', () => {
    const radii = [...LANDING_CSS.matchAll(/border-radius:\s*([^;]+);/g)].map((m) =>
      (m[1] ?? '').trim(),
    );
    expect(radii.length).toBeGreaterThan(3);
    for (const r of radii) expect(['3px', '50%']).toContain(r);
  });

  it('paints from the token layer, so dark mode is free', () => {
    // The one literal is #fff on the ultramarine button, where the token layer has no "on-pigment"
    // colour and white is correct in both themes.
    const hexes = [...LANDING_CSS.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0]);
    expect(hexes).toEqual(['#fff']);
    expect(LANDING_CSS).toContain('var(--wobo-ultramarine)');
    expect(LANDING_CSS).toContain('var(--wobo-ink-900)');
  });

  it('answers reduced motion', () => {
    expect(LANDING_CSS).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('composes for the three proof widths', () => {
    expect(LANDING_CSS).toContain('@media (max-width: 980px)');
    expect(LANDING_CSS).toContain('@media (max-width: 680px)');
  });

  it('never hides the section anchors — on a phone they become a scrolling row', () => {
    // Four of the page's six sections are only reachable through these four links. The phone
    // breakpoint used to `display: none` them and put nothing in their place (WOBO-PLAN §18).
    const phone = LANDING_CSS.slice(LANDING_CSS.indexOf('@media (max-width: 680px)'));
    expect(phone).toContain('.lp-nav-links');
    expect(phone).not.toMatch(/\.lp-nav-links\s*{[^}]*display:\s*none/);
    expect(phone).toMatch(/\.lp-nav-links\s*{[^}]*overflow-x:\s*auto/s);
  });

  it('sets no body copy below the 14px floor the app is measured against', () => {
    // tests/helpers/proof.ts fails any run of 20+ characters set under 14px. These are the only
    // rules allowed under it, and every one of them sets a glyph the eye reads by shape — never a
    // phrase somebody reads.
    const SHORT_LABELS = new Set(['.lp-step-index']);
    const rules = [...LANDING_CSS.matchAll(/([^{}]+){([^}]*)}/g)];
    const tooSmall: string[] = [];
    for (const rule of rules) {
      const selector = (rule[1] ?? '').trim().split('\n').pop()?.trim() ?? '';
      if (SHORT_LABELS.has(selector)) continue;
      for (const size of (rule[2] ?? '').matchAll(/font-size:\s*([\d.]+)px/g)) {
        if (Number.parseFloat(size[1] ?? '99') < 14) tooSmall.push(`${selector} → ${size[1]}px`);
      }
    }
    expect(tooSmall).toEqual([]);
  });

  it('gives every control a 44px thumb', () => {
    expect(LANDING_CSS).toMatch(/\.lp-btn\s*{[^}]*min-height:\s*44px/s);
    expect(LANDING_CSS).toMatch(/\.lp-ask\s*{[^}]*min-height:\s*44px/s);
    expect(LANDING_CSS).toMatch(/\.lp-nav-links a\s*{[^}]*min-height:\s*44px/s);
    expect(LANDING_CSS).toMatch(/\.lp-nav-links a\s*{[^}]*min-width:\s*44px/s);
    expect(LANDING_CSS).toMatch(/\.lp-footer-links a\s*{[^}]*min-height:\s*44px/s);
    expect(LANDING_CSS).toMatch(/\.lp-footer-links a\s*{[^}]*min-width:\s*44px/s);
    expect(LANDING_CSS).toMatch(/\.lp-mark\s*{[^}]*min-height:\s*44px/s);
  });

  it('spends its pigment on ink, not on selection chrome', () => {
    // The demo's selected ask and the Plus plan card both used to carry an ultramarine border, a
    // few hundred pixels from a board drawn in the same ultramarine. Ink-as-meaning is the sacred
    // use (DESIGN.md §2), so selection here is an ink hairline and a change of weight.
    expect(LANDING_CSS).not.toContain('lp-tier--pigment');
    expect(LANDING_CSS).toMatch(
      /\.lp-ask\[aria-pressed='true'\]\s*{[^}]*border-color:\s*var\(--wobo-ink-900\)/s,
    );
  });

  it('sets no uppercase anywhere — the page is sentence case (DESIGN.md)', () => {
    expect(LANDING_CSS).not.toContain('text-transform: uppercase');
  });
});
