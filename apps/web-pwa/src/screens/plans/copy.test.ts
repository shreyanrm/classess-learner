/**
 * The plans page's words are design/prototypes/site-plans.html, word for word, and its numbers are
 * the tiers'. This holds both: every string the page can render obeys the copy laws (DESIGN.md:
 * sentence case, no emoji, no exclamation marks; WOBO-PLAN §19: Wobo has no gender), and every
 * card, table row, question and answer is in the prototype.
 *
 * It also holds law v5's copy law (DESIGN.md §0) over the whole page: no raw allowance anywhere
 * ("40 questions a day"), no grade gate ("class 4 to 12"), no invented learner, no country switch,
 * and a close that asks for early access rather than inviting someone into a product that has not
 * opened.
 */

import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GIFT_FOR, GIFT_PAGE } from '../gift/copy';
import { BENEFITS, CHECKOUT_PAGE, faqItems, PLANS_PAGE } from './copy';
import {
  BEST_FOR,
  formatMoney,
  GIFT_CADENCE,
  GIFT_OPTIONS,
  giftTier,
  type Market,
  PLAN_TIERS,
  type PlanTier,
  priceLabel,
  priceOf,
  priceUnit,
  renewalLabel,
  renewsOn,
  tierById,
} from './prices';

const REPO = join(import.meta.dir, '..', '..', '..', '..', '..');
const PROTO = readFileSync(join(REPO, 'design', 'prototypes', 'site-plans.html'), 'utf8');

/** Every string these modules can render, with a label so a failure names its source. */
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
  walk('PLANS_PAGE', PLANS_PAGE);
  walk('CHECKOUT_PAGE', CHECKOUT_PAGE);
  walk('BENEFITS', BENEFITS);
  walk('FAQ', faqItems());
  walk('GIFT_PAGE', GIFT_PAGE);
  walk('GIFT_FOR', GIFT_FOR);
  walk('PLAN_TIERS', PLAN_TIERS);
  walk('GIFT_OPTIONS', GIFT_OPTIONS);
  walk('BEST_FOR', BEST_FOR);
  walk('GIFT_CADENCE', GIFT_CADENCE);
  return out;
}

const STRINGS = everyString();

describe('the copy laws', () => {
  it('carries no exclamation mark', () => {
    for (const [label, text] of STRINGS)
      expect([label, text.includes('!')]).toEqual([label, false]);
  });

  it('carries no emoji', () => {
    const emoji = /\p{Extended_Pictographic}/u;
    for (const [label, text] of STRINGS) expect([label, emoji.test(text)]).toEqual([label, false]);
  });

  it('gives Wobo no gender', () => {
    const gendered = /\b(she|her|hers|he|him|his)\b/i;
    for (const [label, text] of STRINGS) {
      expect([label, gendered.test(text)]).toEqual([label, false]);
    }
  });

  it('is sentence case — no title-cased headline', () => {
    const titleCase = /^(?:[A-Z][a-z]+ ){2,}[A-Z][a-z]+/;
    for (const [label, text] of STRINGS) {
      expect([label, titleCase.test(text)]).toEqual([label, false]);
    }
  });
});

/**
 * The prototype is the page's STRUCTURE, and the anchors below hold the page to it: the hero, the
 * allowance drawing, the card and table shapes, the gift block and the money questions are all
 * still the prototype's.
 *
 * Its WORDING is held by the law rather than by a diff, because the two differ on purpose in two
 * places. The prototype's cards describe a product where every tier carries one learner and
 * nothing at all is gated; WOBO-PLAN §14 says Max carries two learners and that voice and
 * past-paper sets are the paid extras, and a prototype does not get to change the deal. And the
 * prototype's phrasing for a multiple ("five times the questions") is written here in law v5's
 * own words ("five times the free allowance"). Everything the law does govern — no raw allowance,
 * no grade gate, no invented learner, no country switch, early access rather than an invitation —
 * is asserted in full further down.
 */
describe('the plans page is the prototype', () => {
  const inProto = (label: string, text: string): void => {
    expect([label, PROTO.includes(text)]).toEqual([label, true]);
  };

  it('says the hero and the allowance the way the prototype says them', () => {
    inProto('title', PLANS_PAGE.title);
    inProto('titleEm', PLANS_PAGE.titleEm);
    inProto('lead', PLANS_PAGE.lead);
    for (const [k, v] of Object.entries(PLANS_PAGE.allowance)) inProto(`allowance.${k}`, v);
  });

  it("draws the three cards in the prototype's frame", () => {
    for (const tier of PLAN_TIERS) {
      inProto(`${tier.id}.name`, `<div class="name">${tier.name}</div>`);
      inProto(`${tier.id}.cta`, `>${tier.cta}</a>`);
      inProto(`${tier.id}.fine`, `<div class="fine">${tier.fine}</div>`);
      expect([`${tier.id}.lines`, tier.lines.length]).toEqual([`${tier.id}.lines`, 4]);
    }
    inProto('best', `<span class="best">${BEST_FOR}</span>`);
  });

  it("draws the honest table in the prototype's frame", () => {
    inProto('table.eyebrow', PLANS_PAGE.table.eyebrow);
    for (const head of PLANS_PAGE.table.head) inProto('table.head', `<div>${head}</div>`);
    // the rows themselves are §14's deal, not the prototype's — see the note above
    inProto('table.allowance', '<div>Daily allowance</div>');
    inProto('table.subjects', '<div>Every subject your board sets</div>');
  });

  it('carries the gift block and the money questions', () => {
    for (const [k, v] of Object.entries(PLANS_PAGE.gift)) inProto(`gift.${k}`, v);
    for (const item of faqItems()) inProto('faq.q', `<summary>${item.question}</summary>`);
    for (const [k, v] of Object.entries(PLANS_PAGE.close)) inProto(`close.${k}`, v);
  });
});

const MARKETS: Market[] = ['IN', 'INTL'];

describe('the prices', () => {
  it('offers the three tiers §14 names, free first', () => {
    expect(PLAN_TIERS.map((t) => t.id)).toEqual(['free', 'pro', 'max']);
  });

  it('states a real number in every market a paid tier is sold in, and a zero on free', () => {
    for (const tier of PLAN_TIERS) {
      for (const market of MARKETS) {
        const money = priceOf(tier, market);
        if (tier.id === 'free') {
          expect(money).toBe(null);
          expect(priceLabel(tier, market)).toBe(market === 'IN' ? '₹0' : '$0');
          expect(priceUnit(tier)).toBe('forever');
        } else {
          expect(money?.amount).toBeGreaterThan(0);
          expect(priceLabel(tier, market)).toBe(formatMoney(money as NonNullable<typeof money>));
          expect(priceUnit(tier)).toBe('a month');
        }
      }
    }
  });

  it('carries pigment on exactly one card, and it is not the top one', () => {
    const recommended = PLAN_TIERS.filter((t) => t.recommended);
    expect(recommended).toHaveLength(1);
    expect(recommended[0]?.id).not.toBe(PLAN_TIERS.at(-1)?.id);
  });

  it('keeps the allowance multiples §14 sets, and states no raw allowance at all', () => {
    expect(PLAN_TIERS.map((t) => t.allowanceMultiple)).toEqual([1, 5, 20]);
    // law v5: free carries no multiplier, and no tier states a number of questions.
    for (const [label, text] of STRINGS) {
      expect([label, /\b\d+\s*(questions|turns)\b/i.test(text)]).toEqual([label, false]);
      expect([label, /\b(forty|two hundred|eight hundred)\b/i.test(text)]).toEqual([label, false]);
    }
  });

  it('prices a gift at exactly what the same plan costs, never a discount', () => {
    // gift-page.md, rules: a month of Pro given is a month of Pro bought.
    for (const gift of GIFT_OPTIONS) {
      const tier = tierById(gift.tier);
      expect(tier).not.toBeNull();
      expect(tier?.price).not.toBeNull();
      for (const market of MARKETS) {
        expect(priceLabel(giftTier(gift), market)).toBe(priceLabel(tier as PlanTier, market));
      }
    }
    expect(GIFT_CADENCE).toContain('renews never');
  });

  it('renews a month on, or on the last day the next month has', () => {
    expect(renewsOn(new Date(2026, 8, 3)).getTime()).toBe(new Date(2026, 9, 3).getTime());
    expect(renewsOn(new Date(2026, 0, 31)).getTime()).toBe(new Date(2026, 1, 28).getTime());
    expect(renewsOn(new Date(2026, 11, 15)).getTime()).toBe(new Date(2027, 0, 15).getTime());
    expect(renewalLabel(new Date(2026, 9, 3))).toBe('3 October');
  });
});

describe('the honest table', () => {
  it('reads its figures from the tiers, and never leaves a cell undecided', () => {
    expect(BENEFITS.length).toBeGreaterThan(5);
    for (const row of BENEFITS) {
      for (const cell of [row.free, row.pro, row.max]) {
        expect(cell === true || cell === false || typeof cell === 'string').toBe(true);
      }
    }
    // law v5: the allowance row says what a day feels like, and free carries no multiplier
    const allowance = BENEFITS.find((r) => r.label === 'Daily allowance');
    expect([allowance?.free, allowance?.pro, allowance?.max]).toEqual([
      'enough for an evening',
      'five times',
      'twenty times',
    ]);
    const learners = BENEFITS.find((r) => r.label === 'Learners on the plan');
    expect([learners?.free, learners?.pro, learners?.max]).toEqual(
      PLAN_TIERS.map((t) => String(t.learners)),
    );
  });

  it('never offers free something a paid tier does not have', () => {
    for (const row of BENEFITS) {
      if (row.free === true || row.free === 'same') {
        expect(row.pro).not.toBe(false);
        expect(row.max).not.toBe(false);
      }
    }
  });
});

describe('the consent boxes', () => {
  it('say the adult agrees to the terms in one, and the renewal and the cancel in the other', () => {
    expect(PLANS_PAGE.checkout.terms).toContain('agree to the terms');
    expect(PLANS_PAGE.checkout.renewal).toContain('renews monthly');
    expect(PLANS_PAGE.checkout.renewal).toContain('cancel');
  });
});

describe('the money questions', () => {
  it('answer the country question without a switch and without reciting a price', () => {
    const answer = faqItems().find((i) => i.question === 'Do prices change by country?')?.answer;
    expect(answer).toContain('without asking where you are');
    expect(answer).not.toMatch(/[₹$]\d/);
  });
});

/** Law v5's copy law (DESIGN.md §0), held over every string this page can render. */
describe('law v5 over the whole plans page', () => {
  it('gates nobody by grade', () => {
    for (const [label, text] of STRINGS) {
      expect([label, /class(es)? \d|grade \d|\bages? \d/i.test(text)]).toEqual([label, false]);
    }
  });

  it('names no learner and no parent', () => {
    for (const [label, text] of STRINGS) {
      expect([label, /aanya|arjun|riya|meera|priya/i.test(text)]).toEqual([label, false]);
    }
  });

  it('closes on early access rather than an invitation to begin tonight', () => {
    expect(PLANS_PAGE.close.primary).toBe('Get early access');
    for (const [label, text] of STRINGS) {
      expect([label, /begin tonight|tonight/i.test(text)]).toEqual([label, false]);
    }
  });

  it('offers no country switch to render', () => {
    expect('regions' in PLANS_PAGE).toBe(false);
    expect('regionLabel' in PLANS_PAGE).toBe(false);
  });
});
