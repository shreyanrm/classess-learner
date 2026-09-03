/**
 * The landing page's words, held to the laws and to the owner's own sign-off.
 *
 * Two kinds of assertion live here, and the difference matters:
 *
 *  · LAWS — no exclamation mark, no emoji, no gendered pronoun anywhere near Wobo (WOBO-PLAN §19),
 *    no price written as a number on a page that carries no prices (§16), no dead in-page anchor.
 *    These hold for anything anyone writes here later.
 *  · SIGN-OFF — a handful of exact strings from the owner-directed prototype. This page's copy was
 *    directed, not drafted, so "improving" a line is a regression, and these catch it.
 *
 * The one law from `../copy.ts` deliberately not carried over is its blanket ban on `she/her`. The
 * story on this page is about Aanya, a child, and the prototype calls her "she". §19 is a law about
 * WOBO having no gender, so the rule below is scoped to sentences that name Wobo.
 */

import { describe, expect, it } from 'bun:test';
import {
  ASK,
  CLOSE,
  DEVICES,
  FAQ,
  FILM,
  FOOTER,
  HEADER,
  HERO,
  NAV,
  NIGHT,
  PARENTS,
  SUBJECTS,
  SUNDAY,
  TRIES,
} from './copy';

/** Every string the page can render, flattened, with a label so a failure names its source. */
function everyString(): [string, string][] {
  const out: [string, string][] = [];
  const walk = (label: string, value: unknown): void => {
    if (typeof value === 'string') out.push([label, value]);
    else if (Array.isArray(value)) value.forEach((v, i) => walk(`${label}[${i}]`, v));
    else if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) walk(`${label}.${k}`, v);
    }
  };
  for (const [label, section] of Object.entries({
    HEADER,
    NAV,
    HERO,
    NIGHT,
    TRIES,
    SUNDAY,
    FILM,
    SUBJECTS,
    PARENTS,
    ASK,
    FAQ,
    DEVICES,
    CLOSE,
    FOOTER,
  })) {
    walk(label, section);
  }
  return out;
}

describe('landing page copy', () => {
  const strings = everyString();

  it('collects every string on the page', () => {
    expect(strings.length).toBeGreaterThan(100);
  });

  it('never uses an exclamation mark', () => {
    expect(strings.filter(([, s]) => s.includes('!'))).toEqual([]);
  });

  it('never uses an emoji', () => {
    const emoji = /\u{FE0F}|[\u{1F000}-\u{1FAFF}]|[\u{2600}-\u{27BF}]/u;
    expect(strings.filter(([, s]) => emoji.test(s))).toEqual([]);
  });

  it('never puts a gendered pronoun near Wobo', () => {
    const gendered = /\b(she|her|hers|herself|he|him|his|himself)\b/i;
    expect(strings.filter(([, s]) => /wobo/i.test(s) && gendered.test(s))).toEqual([]);
  });

  it('writes no price, anywhere', () => {
    // The owner's law for this page: no prices on the landing page. Not a number, not a currency.
    expect(strings.filter(([, s]) => /[₹$€£]\s?\d/.test(s))).toEqual([]);
    expect(strings.filter(([, s]) => /\bper (month|year)\b/i.test(s))).toEqual([]);
  });

  it('keeps every heading in sentence case', () => {
    const titleCase = /(\b[A-Z][a-z]+\b[ ]){2}\b[A-Z][a-z]+\b/;
    const headings = [
      HERO.headBefore + HERO.headSwept + HERO.headAfter,
      TRIES.headBefore + TRIES.headSwept + TRIES.headAfter,
      SUNDAY.title,
      FILM.headBefore + FILM.headSwept + FILM.headAfter,
      SUBJECTS.headBefore + SUBJECTS.headSwept,
      PARENTS.title,
      ASK.title,
      FAQ.title,
      DEVICES.title,
      CLOSE.title,
      ...NIGHT.captions.map((c) => c.big),
    ];
    expect(headings.filter((h) => titleCase.test(h))).toEqual([]);
  });
});

describe('landing page links', () => {
  const hrefs = [...NAV, ...FOOTER.columns.flatMap((c) => c.links)].map((l) => l.href);

  it('points every link at an anchor on this page or a route the app has', () => {
    // The prototype's `#meet`, `#students` and `#plans` named sections it never had. Every href
    // here is either a section id this page actually renders, or a real address.
    const anchors = new Set(['#night', '#how', '#parents', '#tries', '#subjects', '#faq']);
    const routes = new Set([
      '/plans',
      '/gift',
      '/help',
      '/contact',
      '/about',
      '/legal/safety-and-content',
      '/legal/terms-of-service',
      '/legal/privacy-policy',
      '/legal/childrens-privacy',
    ]);
    const dead = hrefs.filter((h) => !anchors.has(h) && !routes.has(h));
    expect(dead).toEqual([]);
  });

  it('keeps the six nav labels the prototype has, in its order', () => {
    expect(NAV.map((l) => l.label)).toEqual([
      'Meet Wobo',
      'How it works',
      'For parents',
      'For students',
      'Subjects',
      'Plans',
    ]);
  });

  it('marks exactly one device as available today', () => {
    expect(DEVICES.stores.filter((s) => s.now)).toHaveLength(1);
    expect(DEVICES.stores.filter((s) => s.now)[0]?.label).toBe('Use it in the browser');
    expect(DEVICES.stores.filter((s) => !s.now).every((s) => s.note.includes('soon'))).toBe(true);
  });
});

describe('landing page sign-off', () => {
  it('keeps the headline the owner signed off, and the phrase the highlighter sweeps', () => {
    expect(HERO.headBefore + HERO.headSwept + HERO.headAfter).toBe(
      'The tutor that draws it out for your child',
    );
    expect(HERO.headSwept).toBe('draws it out');
  });

  it('keeps the two audience buttons', () => {
    expect(HERO.learner).toBe("I'm a learner");
    expect(HERO.parent).toBe("I'm a parent");
  });

  it('keeps the four captions of the Tuesday chapter, ending on the beat', () => {
    expect(NIGHT.captions).toHaveLength(4);
    expect(NIGHT.stamp).toBe('Tuesday · 9:40 pm');
    expect(NIGHT.captions[3]?.big).toBe('9:46 pm. Oh.');
  });

  it('keeps the closing line in Wobo’s hand', () => {
    expect(CLOSE.say).toBe('Begin tonight.');
  });

  it('never says the word wrong except to disown it', () => {
    const wrong = everyString().filter(([, s]) => /\bwrong\b/i.test(s));
    expect(wrong).toHaveLength(1);
    expect(wrong[0]?.[1]).toContain('never says');
  });

  it('carries the security and trust link the footer promises', () => {
    const labels = FOOTER.columns.flatMap((c) => c.links).map((l) => l.label);
    expect(labels).toContain('Security and trust');
  });
});
