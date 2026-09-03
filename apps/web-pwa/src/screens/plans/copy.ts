/**
 * The plans page, in words — design/prototypes/site-plans.html, word for word: the hero, the
 * allowance drawing, the honest table, the checkout preview with its two consent boxes, the gift
 * block, the money questions and the close. The prices themselves are never written here: every
 * number is read from `prices.ts`, so the one answer that quotes a price quotes the tiers.
 *
 * Copy laws (DESIGN.md): sentence case, no emoji, no exclamation marks. A tick is drawn, never
 * typed, so the table reads the same in a screen reader as it does on screen.
 */

import { type Market, PLAN_TIERS, type PlanTier, priceLabel, tierById } from './prices';

/** A cell: included, not included, the same on every plan, or a figure in words. */
export type Benefit = boolean | 'same' | string;

export interface BenefitRow {
  label: string;
  free: Benefit;
  pro: Benefit;
  max: Benefit;
}

const tier = (id: PlanTier['id']): PlanTier => tierById(id) ?? (PLAN_TIERS[0] as PlanTier);

/**
 * The honest table: what changes between plans, and what never does. The figures come from the
 * tiers; the rows that never change say so.
 */
export const BENEFITS: readonly BenefitRow[] = [
  {
    label: 'Questions a day',
    free: String(tier('free').questionsPerDay),
    pro: String(tier('pro').questionsPerDay),
    max: String(tier('max').questionsPerDay),
  },
  {
    label: 'Learners on the plan',
    free: String(tier('free').learners),
    pro: String(tier('pro').learners),
    max: String(tier('max').learners),
  },
  { label: 'Voice replies', free: false, pro: true, max: true },
  { label: 'Past-paper sets', free: false, pro: false, max: true },
  { label: 'Every subject, class 4 to 12', free: 'same', pro: 'same', max: 'same' },
  { label: 'The drawn board, practice, the week', free: 'same', pro: 'same', max: 'same' },
  { label: 'The Sunday note and a linked parent', free: 'same', pro: 'same', max: 'same' },
  { label: 'No ads, no selling, no opinions', free: 'same', pro: 'same', max: 'same' },
];

export const PLANS_PAGE = {
  eyebrow: 'Plans',
  title: 'Free every day.',
  titleEm: 'More when exams get close.',
  lead: 'Every learner gets a daily allowance of questions, forever, with no card and no trial that ends. Pro and Max raise the allowance for the weeks that need it. Cancelling takes as many taps as subscribing.',
  regionLabel: 'Show prices for',
  regions: { IN: 'India · ₹', INTL: 'Everywhere else · $' } satisfies Record<Market, string>,
  allowance: {
    sticker: 'free, every day',
    title: "Today's allowance",
    hand: 'enough for a normal evening, and the next one, and the one after',
  },
  table: {
    eyebrow: 'The honest table',
    title: 'What changes between plans, and what never does.',
    lead: "Most of Wobo is the same on every plan. The allowance changes. The tutor doesn't.",
    head: ['Every day', 'Free', 'Pro', 'Max'],
    yes: 'yes',
    same: 'same',
    no: '—',
  },
  checkout: {
    eyebrow: 'At checkout',
    title: 'Two boxes, both in plain words.',
    lead: 'We ask for exactly two things before taking money: that the person paying is an adult who agrees to the terms, and that they know what a month costs and how to stop it. Nothing pre-ticked.',
    say: 'Same price for everyone in your country.',
    sayEm: 'Always.',
    learners: { 1: 'one learner', 2: 'two learners' } as Record<number, string>,
    perMonth: '/ month',
    starts: 'Starts',
    startsValue: 'today',
    renews: 'Renews',
    renewsSuffix: 'unless you cancel',
    terms: "I'm 18 or over and I agree to the terms.",
    termsNote: 'The terms, in plain words first, are one tap away.',
    renewal:
      'I understand this renews monthly and I can cancel in Settings, in two taps, any time.',
    /** `{plan}` is the tier's name. */
    renewalNote: 'You keep {plan} until the month you paid for ends.',
    today: 'Today',
    pay: 'Pay with the payment provider',
    fine: "Card or UPI, on the provider's own page. We never see or store the details.",
  },
  gift: {
    eyebrow: 'Gift Wobo',
    title: "The smartest gift for a child who's about to have a hard term.",
    lead: 'Three, six or twelve months of Pro, sent to a parent with a note in your words. No account needed to buy. It arrives the day you choose.',
    cta: 'Choose a gift',
    how: 'How gifting works',
  },
  faq: {
    eyebrow: 'Questions',
    title: 'The money questions, answered straight.',
  },
  close: {
    title: 'Start free. Decide later.',
    hand: 'The first question is on us. So is the fortieth.',
    primary: 'Start learning for free',
    quiet: 'Gift Wobo',
  },
} as const;

export interface FaqItem {
  question: string;
  answer: string;
}

/** The money questions. The one that quotes prices reads them from the tiers. */
export function faqItems(tiers: readonly PlanTier[] = PLAN_TIERS): FaqItem[] {
  const pro = tiers.find((t) => t.id === 'pro') ?? tier('pro');
  const max = tiers.find((t) => t.id === 'max') ?? tier('max');
  return [
    {
      question: 'What happens when the free allowance runs out for the day?',
      answer:
        "Wobo tells you kindly, shows the time it resets (6 am), and offers to save your question for the morning. Nothing you've done is lost, and nothing nags you to upgrade mid-lesson.",
    },
    {
      question: 'Is the Sunday note only on paid plans?',
      answer:
        'No. The note, the parent link, the practice, the drawn board and every subject are on Free. Paid plans change the allowance, voice, and a few extras. They never change the tutor.',
    },
    {
      question: 'How do I cancel?',
      answer:
        'Settings → Your plan → Cancel. Two taps, no call, no "are you sure" maze. You keep the plan until the month you paid for ends.',
    },
    {
      question: 'Do prices change by country?',
      answer: `Yes, by country, never by person. Everyone in India sees ${priceLabel(pro, 'IN')} and ${priceLabel(max, 'IN')}. Everyone elsewhere sees ${priceLabel(pro, 'INTL')} and ${priceLabel(max, 'INTL')}. We don't vary prices by behaviour, device or history.`,
    },
    {
      question: 'Can two children share Pro?',
      answer:
        "Pro is for one learner, because the Sunday note and the memory are personal. Max includes two learners, each with their own note. Families with three or more: write to us and we'll sort it.",
    },
    {
      question: 'Are there discounts for schools?',
      answer:
        "Schools get a separate plan with a teacher's view and a data-processing agreement. It's on the Schools page, or write to us.",
    },
  ];
}

export const CHECKOUT_PAGE = {
  title: 'Checkout opens with launch.',
  lead: 'The prices are set and printed on the plans page, but the payment page is not open yet, so nothing can be charged. When it opens, this is where the amount, the tax, the renewal date and the two consent boxes will sit, together, above the payment control.',
  /** What a visitor can actually do today. */
  cta: 'Start free',
  back: 'Back to plans',
  promises: [
    'One price for everyone in a country, on the same purchase route.',
    'The amount, the tax and the renewal date shown together, before the payment control.',
    'Two separate consent boxes, both unticked, and neither pre-ticked for you.',
    'A receipt by email with the same information again.',
  ],
  refunds: 'Renewals, cancelling and refunds, in full',
} as const;
