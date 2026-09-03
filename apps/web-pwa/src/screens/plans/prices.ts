/**
 * Every price on the plans page and the gift page, in one file.
 *
 * The numbers are the owner's, set in WOBO-PLAN §14 ("Prices", owner, 2026-09-03): free every day
 * with a daily allowance; Pro ₹1,999 a month for five times that allowance; Max ₹3,999 a month for
 * twenty times. Outside India, Pro is $20 and Max is $50, chosen by the learner's country. Billed
 * monthly, cancel any time. The words on each card are design/prototypes/site-plans.html.
 *
 * Two laws shape the file rather than decorate it:
 *
 *  · §14 — the price NEVER varies by who is looking. There is no behaviour, no cohort and no
 *    experiment in this module: `priceOf` takes a market and nothing else, and the market is the
 *    country the currency belongs to, not a segment. What varies by behaviour is the gift and the
 *    framing, and neither of those lives here.
 *  · §16 — the reference product's three price cards are kept as a SHAPE, and filled with §14's
 *    tiers rather than with its cadences: Free, Pro and Max, and there is no annual card to strike
 *    a price through.
 *
 * Everything that draws a price reads it from here, so a change to a number is one edit.
 */

/** The two currency regions §14 names. Not a segment: it is the country the money is in. */
export type Market = 'IN' | 'INTL';

export interface Money {
  currency: 'INR' | 'USD';
  amount: number;
}

export interface PlanTier {
  id: 'free' | 'pro' | 'max';
  name: string;
  /** What this tier's daily allowance is, as a multiple of the free one (§14). */
  allowanceMultiple: number;
  /** The allowance, in questions a day. */
  questionsPerDay: number;
  /** How many learners the plan carries. */
  learners: number;
  /** Null on the free tier, which has no price to state. */
  price: Readonly<Record<Market, Money>> | null;
  /** The line under the allowance. */
  blurb: string;
  /** What the card lists. */
  lines: readonly string[];
  /** The card's door. */
  cta: string;
  /** The small print under the door. */
  fine: string;
  /** The one card carrying pigment. §14 forbids a decoy, so this is the middle tier, not the top. */
  recommended: boolean;
}

/** What runs beside a price: the paid tiers are a month, the free one is forever. */
export const PRICE_UNIT = { paid: 'a month', free: 'forever' } as const;

/** The sticker on the recommended card. */
export const BEST_FOR = 'most families';

/** Said under a gift's price: a gift is paid once and renews never (`gift-page.md`, rules). */
export const GIFT_CADENCE = 'paid once, renews never';

export const PLAN_TIERS: readonly PlanTier[] = [
  {
    id: 'free',
    name: 'Free',
    allowanceMultiple: 1,
    questionsPerDay: 40,
    learners: 1,
    price: null,
    blurb:
      'Forty questions a day, every subject, every class, the Sunday note, a linked parent. The whole tutor.',
    lines: [
      '40 questions a day',
      'Every subject, class 4 to 12',
      'Practice, the week, the Sunday note',
      'One linked parent',
    ],
    cta: 'Start learning for free',
    fine: 'No card. No trial that ends.',
    recommended: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    allowanceMultiple: 5,
    questionsPerDay: 200,
    learners: 1,
    price: { IN: { currency: 'INR', amount: 1999 }, INTL: { currency: 'USD', amount: 20 } },
    blurb:
      'For the term that has a test every fortnight. Two hundred questions a day, and Wobo reads answers aloud.',
    lines: [
      '200 questions a day',
      'Voice replies, in your accent',
      'Longer lessons on the full board',
      'Everything in Free',
    ],
    cta: 'Choose Pro',
    fine: 'Monthly. Cancel in two taps, keep it till the month ends.',
    recommended: true,
  },
  {
    id: 'max',
    name: 'Max',
    allowanceMultiple: 20,
    questionsPerDay: 800,
    learners: 2,
    price: { IN: { currency: 'INR', amount: 3999 }, INTL: { currency: 'USD', amount: 50 } },
    blurb:
      'Board year. Eight hundred questions a day, so nobody counts, and two learners on one plan.',
    lines: [
      '800 questions a day',
      'Two learners, two Sunday notes',
      'Past-paper practice sets',
      'Everything in Pro',
    ],
    cta: 'Choose Max',
    fine: 'Monthly. Same two taps to cancel.',
    recommended: false,
  },
];

/** The tier at `id`, or null. */
export function tierById(id: string): PlanTier | null {
  return PLAN_TIERS.find((t) => t.id === id) ?? null;
}

/**
 * Which market a reader is in. The country comes from the browser's own region — the locale first,
 * then the time zone, because a phone set to `en-US` in Chennai still reports `Asia/Kolkata`. It is
 * a display choice and nothing more: the price is the same for everyone in a market, and a learner
 * who is shown the wrong currency sees a different symbol, never a different deal.
 */
export function marketFromRegion(locale?: string, timeZone?: string): Market {
  if (locale && /-IN\b/i.test(locale)) return 'IN';
  if (timeZone && /^Asia\/(Kolkata|Calcutta)$/i.test(timeZone)) return 'IN';
  return 'INTL';
}

/** The reader's market, read from the browser. `INTL` wherever there is no browser to ask. */
export function readMarket(): Market {
  if (typeof Intl === 'undefined') return 'INTL';
  try {
    const resolved = Intl.DateTimeFormat().resolvedOptions();
    return marketFromRegion(resolved.locale, resolved.timeZone);
  } catch {
    return 'INTL';
  }
}

/** What this tier costs in this market, or null on the free tier. */
export function priceOf(tier: PlanTier, market: Market): Money | null {
  return tier.price ? tier.price[market] : null;
}

/** How an amount is written: `₹1,999` in India's own grouping, `$20` outside it. */
export function formatMoney(money: Money): string {
  const locale = money.currency === 'INR' ? 'en-IN' : 'en-US';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: money.currency,
      maximumFractionDigits: 0,
    }).format(money.amount);
  } catch {
    const symbol = money.currency === 'INR' ? '₹' : '$';
    return `${symbol}${money.amount}`;
  }
}

/** The price a card shows. The free tier shows a zero in the market's own money: ₹0, $0. */
export function priceLabel(tier: PlanTier, market: Market): string {
  const money = priceOf(tier, market);
  return formatMoney(money ?? { currency: market === 'IN' ? 'INR' : 'USD', amount: 0 });
}

/** What runs beside a card's price. */
export function priceUnit(tier: PlanTier): string {
  return tier.price ? PRICE_UNIT.paid : PRICE_UNIT.free;
}

/**
 * The day a plan bought today renews: the same day next month, or that month's last day where
 * the day does not exist (a plan bought on the 31st of January renews on the last day of February).
 */
export function renewsOn(from: Date): Date {
  const next = new Date(from.getTime());
  const day = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + 1);
  const last = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, last));
  return next;
}

/** A renewal date, written the way the card says it: "3 October". */
export function renewalLabel(date: Date): string {
  try {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long' }).format(date);
  } catch {
    return date.toDateString();
  }
}

// --- gifts ---------------------------------------------------------------------------------------

/**
 * A gift is a run of months of a paid tier, paid once, renewing never (`gift-page.md`, rules). The
 * length is the giver's choice at checkout rather than a fixed pack, which is what lets the page
 * keep §14's other rule — a gift costs the same as the equivalent plan, so a month of Pro given is
 * a month of Pro bought, and the gift is never a discount surface.
 */
export interface GiftOption {
  id: 'gift-pro' | 'gift-max';
  tier: PlanTier['id'];
  name: string;
  lines: readonly string[];
}

export const GIFT_OPTIONS: readonly GiftOption[] = [
  {
    id: 'gift-pro',
    tier: 'pro',
    name: 'Pro, by the month',
    lines: ['Five times the free daily allowance', 'Choose how many months when you pay'],
  },
  {
    id: 'gift-max',
    tier: 'max',
    name: 'Max, by the month',
    lines: ['Twenty times the free daily allowance', 'Choose how many months when you pay'],
  },
];

/** The tier a gift is a gift of. */
export function giftTier(option: GiftOption): PlanTier {
  return tierById(option.tier) ?? (PLAN_TIERS[0] as PlanTier);
}

/** The refund window, stated in `docs/legal/refund-and-cancellation.md`. */
export const REFUND_DAYS = 14;
