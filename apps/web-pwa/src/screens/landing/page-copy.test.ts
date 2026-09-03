/**
 * The copy laws, asserted over every word on the landing page at once.
 *
 * DESIGN.md: sentence case, no emoji, no exclamation marks, calm and certain.
 * WOBO-PLAN §19: Wobo has no gender.
 * WOBO-PLAN §16: the curriculum mechanism is not explained on a public page.
 */

import { describe, expect, it } from 'bun:test';
import {
  ASK,
  AUTH,
  CLOSING,
  DEMO,
  DEVICES,
  FAQ,
  FOOTER,
  HERO,
  NAV_LINKS,
  NIGHT,
  PARENTS,
  PRACTICE,
  PUZZLE_REPLIES,
  SAFE,
  STUDENTS,
  SUBJECTS,
  WHY,
} from './page-copy';

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
  const sections: Record<string, unknown> = {
    HERO,
    DEMO,
    NIGHT,
    WHY,
    STUDENTS,
    PRACTICE,
    PUZZLE_REPLIES,
    PARENTS,
    SUBJECTS,
    SAFE,
    ASK,
    FAQ,
    DEVICES,
    CLOSING,
    FOOTER,
    AUTH,
    NAV_LINKS,
  };
  for (const [name, value] of Object.entries(sections)) walk(name, value);
  return out;
}

const strings = everyString();

describe('landing copy', () => {
  it('collects every string on the page', () => {
    expect(strings.length).toBeGreaterThan(120);
  });

  it('never uses an exclamation mark', () => {
    expect(strings.filter(([, s]) => s.includes('!'))).toEqual([]);
  });

  it('never uses an emoji', () => {
    // Anything in the emoji planes, plus the dingbats and the variation selector that turns a plain
    // glyph into one. Written as alternatives rather than one class, because a character class
    // spanning surrogate pairs is the ambiguity `noMisleadingCharacterClass` warns about.
    const emoji = /\u{FE0F}|[\u{1F000}-\u{1FAFF}]|[\u{2600}-\u{27BF}]/u;
    expect(strings.filter(([, s]) => emoji.test(s))).toEqual([]);
  });
});

describe('landing copy — Wobo has no gender (WOBO-PLAN §19)', () => {
  // The page tells one story about one named learner, Aanya, and the owner wrote her into it in the
  // third person. That is not a breach of §19; calling WOBO "he" or "she" would be. So the rule is
  // asserted as what it actually is, in two halves.

  it('never uses a masculine pronoun anywhere', () => {
    const masculine = /\b(he|him|his|himself)\b/i;
    expect(strings.filter(([, s]) => masculine.test(s))).toEqual([]);
  });

  it('uses a feminine pronoun only in the two chapters about Aanya', () => {
    const feminine = /\b(she|her|hers|herself)\b/i;
    const used = strings.filter(([, s]) => feminine.test(s)).map(([label]) => label);
    // Every one of these is the Tuesday-night chapter or the Sunday note — the only two places on
    // the page that tell a story about a named child. A new entry here is a review, not a typo.
    expect(used.sort()).toEqual(
      [
        'NIGHT.captions[1].big',
        'NIGHT.captions[3].small',
        'PARENTS.body',
        'PARENTS.letter.run1',
        'PARENTS.letter.run2',
      ].sort(),
    );
  });

  it('always calls Wobo "it"', () => {
    // Wherever the copy gives Wobo a pronoun, it is "it" — the sentences that name Wobo and carry a
    // pronoun at all must never carry a personal one.
    const aboutWobo = strings.filter(([, s]) => /\bWobo\b/.test(s));
    expect(aboutWobo.length).toBeGreaterThan(20);
    const personal = /\b(he|she|him|her|his|hers)\b/i;
    const wrong = aboutWobo.filter(
      ([label, s]) =>
        personal.test(s) && !label.startsWith('NIGHT') && !label.startsWith('PARENTS'),
    );
    expect(wrong).toEqual([]);
  });
});

describe('landing copy — the secret holds (WOBO-PLAN §16)', () => {
  it('never names a board, a framework or a count of them', () => {
    // "the board" as a thing a parent tells Wobo once is allowed, and is the whole of what the page
    // says. A NAME (CBSE, ICSE, IB…) or a NUMBER of them would give the mechanism away.
    const named = /\b(CBSE|ICSE|CISCE|NIOS|IGCSE|IB|NCERT|state board|curricul(um|a) engine)\b/i;
    expect(strings.filter(([, s]) => named.test(s))).toEqual([]);
    const counted = /\b\d+\s+(boards|curricula|frameworks|syllabuses)\b/i;
    expect(strings.filter(([, s]) => counted.test(s))).toEqual([]);
  });
});

describe('landing copy — prices', () => {
  it('quotes no price at all: this page does not sell', () => {
    const money = /(₹|\$|£|€)\s?\d|\b\d+\s?(rupees|dollars)\b|\bper month\b/i;
    expect(strings.filter(([, s]) => money.test(s))).toEqual([]);
  });

  it('says free every day, and says it more than once', () => {
    const free = strings.filter(([, s]) => /free/i.test(s));
    expect(free.length).toBeGreaterThanOrEqual(4);
  });
});

describe('landing copy — the prototype, verbatim', () => {
  it('opens with the wake phrase, written as the owner wrote it', () => {
    expect(HERO.wake).toBe('Hey Wobo,');
    expect(HERO.equation).toBe('a² + b² = c²');
  });

  it('keeps the four captions of the Tuesday-night chapter in order', () => {
    expect(NIGHT.captions.map((c) => c.id)).toEqual(['c1', 'c2', 'c3', 'c4']);
    expect(NIGHT.captions[0]?.big).toBe('9:40 pm. Test on Friday. Question 7 makes no sense.');
    expect(NIGHT.captions[3]?.big).toBe('9:46 pm. It clicked.');
  });

  it('closes in marigold with the owner’s two lines', () => {
    expect(CLOSING.say).toBe('Begin tonight.');
    expect(CLOSING.title).toBe('The first question is on us.');
  });

  it('keeps the puzzle replies in Wobo’s own lowercase hand', () => {
    for (const reply of Object.values(PUZZLE_REPLIES)) {
      expect(reply[0]).toBe(reply[0]?.toLowerCase() as string);
      expect(reply.endsWith('.')).toBe(false);
    }
    expect(PUZZLE_REPLIES.half).toBe('there we go');
  });

  it('never says the word "wrong" about a learner’s answer', () => {
    // The claim two columns from the puzzle is "Wobo never says wrong". The replies have to keep it.
    for (const reply of Object.values(PUZZLE_REPLIES)) expect(/wrong/i.test(reply)).toBe(false);
  });
});

describe('landing copy — running prose', () => {
  it('opens with a capital and closes with a stop', () => {
    // Scoped by KIND. Headings, buttons, chips, nav labels, store notes and Wobo's handwritten
    // asides are fragments on purpose; these fields carry sentences.
    const PROSE = ['.sub', '.lead', '.body', '.small'];
    const prose = strings.filter(
      ([label]) => PROSE.some((f) => label.endsWith(f)) && !label.startsWith('PUZZLE'),
    );
    expect(prose.length).toBeGreaterThan(8);
    expect(prose.filter(([, s]) => !/[.?]$/.test(s.trim()))).toEqual([]);
    expect(prose.filter(([, s]) => /^[a-z]/.test(s.trim()))).toEqual([]);
  });

  it('asks a question in every FAQ heading and answers it in a sentence', () => {
    for (const item of FAQ.items) {
      expect(item.q.endsWith('?')).toBe(true);
      expect(item.a.endsWith('.')).toBe(true);
    }
  });
});

describe('landing links', () => {
  it('gives the nav four anchors on this page and one real route', () => {
    expect(NAV_LINKS.map((l) => l.href)).toEqual([
      '#why',
      '#students',
      '#parents-note',
      '#subjects',
      '/plans',
    ]);
  });

  it('points every footer address at a route or a chapter of this page', () => {
    const links = FOOTER.columns.flatMap((c) => c.links);
    expect(links.length).toBeGreaterThanOrEqual(14);
    for (const link of links) {
      expect(link.href.startsWith('#') || link.href.startsWith('/')).toBe(true);
    }
  });

  it('marks four stores as coming and exactly one as live today', () => {
    expect(DEVICES.stores.filter((s) => s.live)).toHaveLength(1);
    expect(DEVICES.stores.filter((s) => !s.live)).toHaveLength(4);
    for (const store of DEVICES.stores.filter((s) => !s.live)) {
      expect(store.note).toContain('soon');
    }
  });

  it('names both doors the way the owner named them', () => {
    expect(AUTH.signIn).toBe('Sign in');
    expect(AUTH.getStarted).toBe('Get started');
  });
});
