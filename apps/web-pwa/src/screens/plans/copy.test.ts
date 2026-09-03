/**
 * The copy laws, over every word this workflow adds to the public site.
 *
 * DESIGN.md: sentence case, no emoji, no exclamation marks, calm and certain. WOBO-PLAN §19: Wobo
 * has no gender. §14 and §16: a price that has not been decided is never written as a number, and
 * nothing on a public page can be bought until it can.
 */

import { describe, expect, it } from 'bun:test';
import { GIFT_FOR, GIFT_PAGE } from '../gift/copy';
import { BENEFITS, CHECKOUT_PAGE, PLANS_PAGE } from './copy';
import {
  CADENCE,
  formatMoney,
  GIFT_OPTIONS,
  giftPriceLabel,
  giftTier,
  type Market,
  PLAN_TIERS,
  priceLabel,
  priceOf,
  tierById,
} from './prices';

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
  walk('GIFT_PAGE', GIFT_PAGE);
  walk('GIFT_FOR', GIFT_FOR);
  walk('PLAN_TIERS', PLAN_TIERS);
  walk('GIFT_OPTIONS', GIFT_OPTIONS);
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

const MARKETS: Market[] = ['IN', 'INTL'];

describe('the prices', () => {
  it('offers the three tiers §14 names, free first', () => {
    expect(PLAN_TIERS.map((t) => t.id)).toEqual(['free', 'pro', 'max']);
  });

  it('states a real number in every market a paid tier is sold in', () => {
    for (const tier of PLAN_TIERS) {
      for (const market of MARKETS) {
        const money = priceOf(tier, market);
        if (tier.id === 'free') {
          expect(money).toBe(null);
          expect(priceLabel(tier, market)).toBe('No cost');
        } else {
          expect(money?.amount).toBeGreaterThan(0);
          expect(priceLabel(tier, market)).toBe(formatMoney(money as NonNullable<typeof money>));
        }
      }
    }
  });

  it('never leaves a price slot empty, in either market', () => {
    for (const tier of PLAN_TIERS) {
      for (const market of MARKETS) {
        expect(priceLabel(tier, market).trim().length).toBeGreaterThan(2);
      }
    }
  });

  it('carries pigment on exactly one card, and it is not the top one', () => {
    const recommended = PLAN_TIERS.filter((t) => t.recommended);
    expect(recommended).toHaveLength(1);
    expect(recommended[0]?.id).not.toBe(PLAN_TIERS.at(-1)?.id);
  });

  it('prices a gift at exactly what the same plan costs, never a discount', () => {
    // gift-page.md, rules: a month of Pro given is a month of Pro bought.
    for (const gift of GIFT_OPTIONS) {
      const tier = tierById(gift.tier);
      expect(tier).not.toBeNull();
      expect(tier?.price).not.toBeNull();
      for (const market of MARKETS) {
        expect(giftPriceLabel(gift, market)).toBe(`${priceLabel(giftTier(gift), market)} a month`);
      }
    }
  });

  it('says the cadence in words, and says cancelling is possible', () => {
    expect(CADENCE).toContain('cancel');
  });
});

describe('the benefits table', () => {
  it('says what free carries, and never leaves a cell undecided', () => {
    expect(BENEFITS.length).toBeGreaterThan(5);
    for (const row of BENEFITS) {
      for (const cell of [row.free, row.pro, row.max]) {
        expect(cell === true || cell === false || typeof cell === 'string').toBe(true);
      }
    }
  });

  it('never offers free something a paid tier does not have', () => {
    for (const row of BENEFITS) {
      if (row.free === true) {
        expect(row.pro).not.toBe(false);
        expect(row.max).not.toBe(false);
      }
    }
  });
});

describe('the consent boxes', () => {
  it('names the terms and the privacy notice in one, and the renewal in the other', () => {
    expect(PLANS_PAGE.terms).toContain('terms of service');
    expect(PLANS_PAGE.terms).toContain('privacy notice');
    expect(PLANS_PAGE.renewal).toContain('renews automatically');
    expect(PLANS_PAGE.renewal).toContain('cancel');
  });
});
