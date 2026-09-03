/**
 * The stylesheet's laws, asserted over the string.
 *
 * The page is a port, so most of what matters is "is this still the prototype's number". These are
 * the ones a later edit is most likely to break by accident: palette v4 character for character,
 * the 8/16/24/40/64/120 spacing scale, no line under 2.5px, both themes defined, no font CDN, and
 * nothing leaking out of the page's own root.
 */

import { describe, expect, it } from 'bun:test';
import { LANDING_CSS, ROOT } from './page-styles';

describe('the landing stylesheet', () => {
  it('scopes every rule to the page root', () => {
    // Every selector in the sheet has to mention `.wb` somewhere, or it is styling the whole app.
    const body = LANDING_CSS.replace(/\/\*[\s\S]*?\*\//g, '');
    const selectors = body
      .split('}')
      .map((block) => block.split('{')[0]?.trim() ?? '')
      .filter((s) => s.length > 0 && !s.startsWith('@') && !s.startsWith('to') && !s.includes(':'));
    // NOTHING is unscoped. The one rule that used to be — an override of the app wrapper's
    // `will-change` so a pinned chapter could be `position: fixed` — is gone: the chapters pin with
    // `pinType: 'transform'` instead (engine/chapters.ts), which needs no containing block at all.
    const leaking = selectors.filter((s) => !s.includes(`.${ROOT}`));
    expect(leaking).toEqual([]);
  });

  it('carries palette v4, character for character (DESIGN.md §2)', () => {
    for (const token of [
      '--paper:#FAF7F0',
      '--ink:#14142B',
      '--pig:#2B45FF',
      '--marigold:#FFB629',
      '--rose:#FF6B57',
      '--mint:#22C48B',
      '--lilac:#B7A6FF',
      '--violet:#7C5CFF',
    ]) {
      expect(LANDING_CSS).toContain(token);
    }
  });

  it('designs night on its own rather than inverting it', () => {
    expect(LANDING_CSS).toContain('--paper:#0F1226');
    expect(LANDING_CSS).toContain('--pig:#7C8CFF');
    expect(LANDING_CSS).toContain('--marigold:#FFC85A');
    expect(LANDING_CSS).toContain(`[data-theme="dark"] .${ROOT}`);
  });

  it('holds the 8/16/24/40/64/120 spacing scale', () => {
    expect(LANDING_CSS).toContain('--s1:8px');
    expect(LANDING_CSS).toContain('--s2:16px');
    expect(LANDING_CSS).toContain('--s3:24px');
    expect(LANDING_CSS).toContain('--s4:40px');
    expect(LANDING_CSS).toContain('--s5:64px');
    expect(LANDING_CSS).toContain('--s6:120px');
  });

  it('draws no line thinner than 2.5px (DESIGN.md law 2)', () => {
    const widths = [...LANDING_CSS.matchAll(/stroke-width:\s*([\d.]+)/g)].map((m) => Number(m[1]));
    for (const w of widths) expect(w).toBeGreaterThanOrEqual(2.5);
    // And no hairline borders: the only `border:` in the sheet is the chevron and a reset to 0.
    const borders = [...LANDING_CSS.matchAll(/border(?:-\w+)?:\s*([^;}]+)/g)].map(
      (m) => m[1] ?? '',
    );
    for (const border of borders) {
      const px = /(\d+(?:\.\d+)?)px/.exec(border);
      if (px) expect(Number(px[1])).toBeGreaterThanOrEqual(2.5);
    }
  });

  it('rounds every SURFACE to at least 12px (DESIGN.md law 2)', () => {
    // Asserted on the surfaces the law is about — cards, tiles, panels, controls — not on the few
    // small radii inside a drawing (the film's bar caps, its 6px progress bar), which are strokes
    // of an illustration rather than edges of an interface.
    const surfaces = [
      '.btn{',
      '.tile{',
      '.subj{',
      '.promise{',
      '.demo{',
      '.film{',
      '.askbox{',
      '.faq details{',
      '.store{',
      '#close .panel{',
    ].map((rule) => `.${ROOT} ${rule}`);
    for (const rule of surfaces) {
      const at = LANDING_CSS.indexOf(rule);
      expect(at).toBeGreaterThan(-1);
      const block = LANDING_CSS.slice(at, LANDING_CSS.indexOf('}', at));
      const radius = /border-radius:\s*(?:clamp\([^)]*\)|(\d+(?:\.\d+)?)px)/.exec(block);
      expect(radius).not.toBeNull();
      if (radius?.[1]) expect(Number(radius[1])).toBeGreaterThanOrEqual(12);
    }
  });

  it('never reaches a font CDN, and leads with the law’s face', () => {
    expect(LANDING_CSS).not.toContain('fonts.googleapis');
    expect(LANDING_CSS).not.toContain('@import');
    expect(LANDING_CSS).toContain("'Poppins'");
    expect(LANDING_CSS).toContain('Caveat');
  });

  it('self-hosts both faces from our own origin, at the weights the page sets', () => {
    // Every src is a same-origin path under /fonts/ — an absolute URL here is a face leaving us.
    const srcs = [...LANDING_CSS.matchAll(/src:url\(([^)]+)\)/g)].map((m) => m[1] ?? '');
    expect(srcs.length).toBeGreaterThan(0);
    for (const src of srcs) expect(src.startsWith('/fonts/')).toBe(true);
    // The prototype set Poppins at 400/500/600/700 and Caveat across 500–700. Every weight the
    // sheet asks for has a face declared for it, or the browser synthesises a fake bold.
    const declared = new Set(
      [
        ...LANDING_CSS.matchAll(/@font-face\{font-family:'([^']+)';[^}]*?font-weight:([^;]+);/g),
      ].map((m) => `${m[1]}:${m[2]}`),
    );
    for (const face of [
      'Poppins:400',
      'Poppins:500',
      'Poppins:600',
      'Poppins:700',
      'Caveat:400 700',
    ])
      expect(declared.has(face)).toBe(true);
    // Nothing may block first paint on a face that is still in flight.
    const faces = LANDING_CSS.match(/@font-face\{[^}]+\}/g) ?? [];
    for (const face of faces) expect(face).toContain('font-display:swap');
  });

  it('has no dust, particles or noise — the owner rejected them', () => {
    // Comments stripped: the sheet's own header explains WHY there is no dust, and the word in that
    // sentence is not a dust background.
    const body = LANDING_CSS.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(/particle|dust|noise\(/i.test(body)).toBe(false);
    // Depth is four blurred colour blobs and nothing else.
    expect(LANDING_CSS).toContain('#depth i');
    expect(LANDING_CSS).toContain('blur(60px)');
  });

  it('hands every control a 44px thumb target', () => {
    const controls = [
      '.btn{',
      'header .right .sign{',
      '.chips button{',
      '.store{',
      '.faq summary{',
    ];
    for (const rule of controls.map((r) => `.${ROOT} ${r}`)) {
      const at = LANDING_CSS.indexOf(rule);
      expect(at).toBeGreaterThan(-1);
      const block = LANDING_CSS.slice(at, LANDING_CSS.indexOf('}', at));
      const min = /min-height:\s*(\d+)px/.exec(block);
      expect(min).not.toBeNull();
      expect(Number(min?.[1])).toBeGreaterThanOrEqual(44);
    }
  });

  it('keeps a visible focus ring on everything focusable', () => {
    expect(LANDING_CSS).toContain('outline:3px solid var(--pig)');
    expect(LANDING_CSS).toContain('button:focus-visible');
    expect(LANDING_CSS).toContain('a:focus-visible');
    expect(LANDING_CSS).toContain('summary:focus-visible');
    // The ask box's text field. The prototype turns its outline off and never puts one back, which
    // left the one input on the page invisible to a keyboard reader.
    expect(LANDING_CSS).toContain('input:focus-visible');
  });

  it('honours reduced motion by settling, never by hiding', () => {
    const at = LANDING_CSS.indexOf('@media (prefers-reduced-motion:reduce)');
    expect(at).toBeGreaterThan(-1);
    const block = LANDING_CSS.slice(at);
    expect(block).toContain('opacity:1');
    expect(block).toContain('animation:none');
  });

  it('unstacks the Tuesday-night chapter under reduced motion, so all four captions read', () => {
    // Pinned, the four captions sit on top of one another and only one is ever visible. With no
    // scroll to hand them over, the chapter has to lay out as ordinary prose or three quarters of
    // its copy is unreachable.
    const block = LANDING_CSS.slice(LANDING_CSS.indexOf('@media (prefers-reduced-motion:reduce)'));
    expect(block).toContain(`.${ROOT} #night .cap > div{position:relative;opacity:1}`);
    expect(block).toContain(`.${ROOT} #night .pin{height:auto`);
    expect(block).toContain(`.${ROOT} #night .board{position:relative`);
    expect(block).toContain(`.${ROOT} #night .scene{position:relative`);
    // And the question rides above the proof rather than on top of it.
    expect(block).toContain(`.${ROOT} #night .board .q{position:relative`);
  });

  it('only hides a reveal while the engine is live to bring it back', () => {
    expect(LANDING_CSS).toContain(`.${ROOT}[data-motion="on"] .reveal{opacity:0`);
  });

  it('keys the cursor takeover off the engine’s own scoped attribute', () => {
    expect(LANDING_CSS).toContain('[data-cursor="on"]');
    expect(LANDING_CSS).toContain('cursor:none');
  });
});
