/**
 * The plans page's words are design/prototypes/site-plans.html, word for word, and its numbers are
 * the tiers'. This holds both: every string the page can render obeys the copy laws (DESIGN.md:
 * sentence case, no emoji, no exclamation marks; WOBO-PLAN §19: Wobo has no gender), every card,
 * table row, question and answer is in the prototype, and the one answer that quotes a price
 * reads it from the tiers rather than carrying its own.
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

describe('the plans page is the prototype, word for word', () => {
  const inProto = (label: string, text: string): void => {
    expect([label, PROTO.includes(text)]).toEqual([label, true]);
  };

  it('says the hero, the toggle and the allowance the way the prototype says them', () => {
    inProto('title', PLANS_PAGE.title);
    inProto('titleEm', PLANS_PAGE.titleEm);
    inProto('lead', PLANS_PAGE.lead);
    inProto('regions.IN', PLANS_PAGE.regions.IN);
    inProto('regions.INTL', PLANS_PAGE.regions.INTL);
    inProto('regionLabel', PLANS_PAGE.regionLabel);
    for (const [k, v] of Object.entries(PLANS_PAGE.allowance)) inProto(`allowance.${k}`, v);
  });

  it("draws the three cards with the prototype's words", () => {
    for (const tier of PLAN_TIERS) {
      inProto(`${tier.id}.name`, `<div class="name">${tier.name}</div>`);
      inProto(`${tier.id}.x`, `<div class="x">${tier.allowanceMultiple}× allowance</div>`);
      inProto(`${tier.id}.blurb`, tier.blurb);
      for (const line of tier.lines) inProto(`${tier.id}.line`, `</i>${line}</li>`);
      inProto(`${tier.id}.cta`, `>${tier.cta}</a>`);
      inProto(`${tier.id}.fine`, `<div class="fine">${tier.fine}</div>`);
    }
    inProto('best', `<span class="best">${BEST_FOR}</span>`);
  });

  it('draws the honest table, row for row', () => {
    inProto('table.eyebrow', PLANS_PAGE.table.eyebrow);
    inProto('table.title', PLANS_PAGE.table.title);
    inProto('table.lead', PLANS_PAGE.table.lead);
    for (const head of PLANS_PAGE.table.head) inProto('table.head', `<div>${head}</div>`);
    for (const row of BENEFITS) inProto(`row ${row.label}`, `<div>${row.label}</div>`);
  });

  it("previews the checkout with the prototype's two boxes", () => {
    const c = PLANS_PAGE.checkout;
    for (const key of [
      'eyebrow',
      'title',
      'lead',
      'say',
      'sayEm',
      'terms',
      'termsNote',
      'renewal',
      'pay',
      'fine',
    ] as const) {
      inProto(`checkout.${key}`, c[key]);
    }
    inProto('checkout.renewalNote', c.renewalNote.replace('{plan}', 'Pro'));
  });

  it('carries the gift block and the money questions', () => {
    for (const [k, v] of Object.entries(PLANS_PAGE.gift)) inProto(`gift.${k}`, v);
    for (const item of faqItems()) {
      inProto('faq.q', `<summary>${item.question}</summary>`);
      inProto('faq.a', `<p>${item.answer}</p>`);
    }
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

  it('keeps the allowance multiples §14 sets, and the questions a day with them', () => {
    expect(PLAN_TIERS.map((t) => t.allowanceMultiple)).toEqual([1, 5, 20]);
    const free = PLAN_TIERS[0] as PlanTier;
    for (const tier of PLAN_TIERS) {
      expect(tier.questionsPerDay).toBe(free.questionsPerDay * tier.allowanceMultiple);
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
    const questions = BENEFITS.find((r) => r.label === 'Questions a day');
    expect([questions?.free, questions?.pro, questions?.max]).toEqual(
      PLAN_TIERS.map((t) => String(t.questionsPerDay)),
    );
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
  it('quote the tiers, not a number of their own', () => {
    const custom: PlanTier[] = PLAN_TIERS.map((t) =>
      t.id === 'pro'
        ? {
            ...t,
            price: { IN: { currency: 'INR', amount: 1234 }, INTL: { currency: 'USD', amount: 12 } },
          }
        : t,
    );
    const answer = faqItems(custom).find(
      (i) => i.question === 'Do prices change by country?',
    )?.answer;
    expect(answer).toContain('₹1,234');
    expect(answer).toContain('$12');
    expect(answer).not.toContain('₹1,999');
  });
});
