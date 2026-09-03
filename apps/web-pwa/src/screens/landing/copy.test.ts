/**
 * The copy laws, asserted over every word on the landing page at once.
 *
 * DESIGN.md: sentence case, no emoji, no exclamation marks, calm and certain.
 * WOBO-PLAN §19: Wobo has no gender — the name comes first, and no gendered pronoun is used.
 * WOBO-PLAN §16: honest pricing — a price we have not set is not written as a number.
 */

import { describe, expect, it } from 'bun:test';
import {
  AUTH,
  BOARDS,
  CLOSING,
  DEMO,
  FOOTER,
  HERO,
  LEGAL_LINKS,
  NAV_LINKS,
  PLANS,
  PROMISES,
  TEACHES,
} from './copy';

/** Every string the page can render, flattened, with a label so a failure names its source. */
function everyString(): [string, string][] {
  const out: [string, string][] = [];
  const walk = (label: string, value: unknown): void => {
    if (typeof value === 'string') out.push([label, value]);
    else if (Array.isArray(value)) {
      value.forEach((v, i) => {
        walk(`${label}[${i}]`, v);
      });
    } else if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) walk(`${label}.${k}`, v);
    }
  };
  walk('HERO', HERO);
  walk('TEACHES', TEACHES);
  walk('DEMO', DEMO);
  walk('BOARDS', BOARDS);
  walk('PROMISES', PROMISES);
  walk('PLANS', PLANS);
  walk('CLOSING', CLOSING);
  walk('FOOTER', FOOTER);
  walk('AUTH', AUTH);
  walk('NAV_LINKS', NAV_LINKS);
  walk('LEGAL_LINKS', LEGAL_LINKS);
  return out;
}

describe('landing copy', () => {
  const strings = everyString();

  it('collects every string on the page', () => {
    expect(strings.length).toBeGreaterThan(50);
  });

  it('never uses an exclamation mark', () => {
    const bad = strings.filter(([, s]) => s.includes('!'));
    expect(bad).toEqual([]);
  });

  it('never uses an emoji', () => {
    // Anything in the emoji planes, plus the dingbats and the variation selector that turns a
    // plain glyph into one. Written as alternatives rather than one class, because a character
    // class spanning surrogate pairs is the ambiguity `noMisleadingCharacterClass` warns about.
    const emoji = /\u{FE0F}|[\u{1F000}-\u{1FAFF}]|[\u{2600}-\u{27BF}]/u;
    const bad = strings.filter(([, s]) => emoji.test(s));
    expect(bad).toEqual([]);
  });

  it('never puts a gendered pronoun near Wobo', () => {
    const gendered = /\b(she|her|hers|herself|he|him|his|himself)\b/i;
    const bad = strings.filter(([, s]) => /wobo/i.test(s) && gendered.test(s));
    expect(bad).toEqual([]);
  });

  it('never uses a gendered pronoun at all', () => {
    const gendered = /\b(she|her|hers|herself|him|himself)\b/i;
    const bad = strings.filter(([, s]) => gendered.test(s));
    expect(bad).toEqual([]);
  });

  it('starts sentences in sentence case, never title case', () => {
    // A heading in title case has three or more capitalised words in a row. Proper nouns are fine
    // on their own; three together is a Marketing Headline, which is what this rule is for.
    const titleCase = /(\b[A-Z][a-z]+\b[ ]){2}\b[A-Z][a-z]+\b/;
    const headings = [
      HERO.wake,
      HERO.ask,
      HERO.emphasis,
      TEACHES.title,
      DEMO.title,
      BOARDS.title,
      PROMISES.title,
      PLANS.title,
      CLOSING.title,
      ...TEACHES.steps.map((s) => s.title),
      ...PROMISES.cards.map((c) => c.title),
    ];
    expect(headings.filter((h) => titleCase.test(h))).toEqual([]);
  });

  it('leads with the wake phrase in the headline', () => {
    expect(HERO.wake).toBe('Hey Wobo.');
  });

  it('punctuates every line of running prose', () => {
    // The page's prose fields — the ones that carry sentences rather than names — open with a
    // capital and close with a full stop. One did not: the plan subline, lowercase and open,
    // sitting directly beneath a heading, which is the one place the eye notices.
    //
    // Scoped by KIND, not by length. A heading ("Ask Wobo something." aside, most take no stop), a
    // button, a chip, a nav label and Wobo's handwritten asides are fragments on purpose, and the
    // demo prompts are the learner's own typed words, which are lowercase because that is how
    // people type.
    const PROSE = ['.body', '.lead', '.note', '.cadence', '.line', '.kicker'];
    const prose = strings.filter(([label]) => PROSE.some((f) => label.endsWith(f)));
    expect(prose.length).toBeGreaterThan(8);
    expect(prose.filter(([, s]) => !/[.?]$/.test(s.trim()))).toEqual([]);
    expect(prose.filter(([, s]) => /^[a-z]/.test(s.trim()))).toEqual([]);
  });

  it('carries no section eyebrow — the heading under it already said it', () => {
    // Five labels in tracked capitals, each naming the section its own h2 names in a sentence
    // (WOBO-PLAN §15). The hero keeps one line above the headline, and it makes a claim.
    for (const section of [TEACHES, DEMO, BOARDS, PROMISES, PLANS]) {
      expect(Object.hasOwn(section, 'eyebrow')).toBe(false);
    }
    expect(HERO.kicker.endsWith('.')).toBe(true);
    expect(HERO.kicker[0]).toBe(HERO.kicker[0]?.toUpperCase());
  });

  it('names Wobo before anything else in the hero body', () => {
    expect(HERO.body.startsWith('Wobo ')).toBe(true);
  });
});

describe('landing plans', () => {
  it('marks the price we have not decided as a placeholder, in words', () => {
    const plus = PLANS.tiers.find((t) => t.placeholder);
    expect(plus).toBeDefined();
    expect(plus?.price).toBe('Price not set');
    // A placeholder must never look like a number a visitor could plan around.
    expect(/\d/.test(plus?.price ?? '')).toBe(false);
  });

  it('has exactly one placeholder tier and one real one', () => {
    expect(PLANS.tiers.filter((t) => t.placeholder)).toHaveLength(1);
    expect(PLANS.tiers.filter((t) => !t.placeholder)).toHaveLength(1);
  });

  it('says nothing can be bought yet', () => {
    expect(PLANS.note.toLowerCase()).toContain('no price is live yet');
  });
});

describe('landing links', () => {
  it('points the legal set at real addresses, not dead anchors', () => {
    expect(LEGAL_LINKS.length).toBeGreaterThanOrEqual(4);
    for (const link of LEGAL_LINKS) {
      expect(link.href.startsWith('/legal/')).toBe(true);
    }
  });

  it('gives every nav link a section that exists on the page', () => {
    const ids = ['#teaches', '#demo', '#boards', '#plans'];
    expect(NAV_LINKS.map((l) => l.href)).toEqual(ids);
  });

  it('names both doors', () => {
    expect(AUTH.signIn).toBe('Sign in');
    expect(AUTH.signUp).toBe('Start free');
  });
});
