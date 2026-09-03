/**
 * The plans page, in words.
 *
 * Almost nothing here is new: the headline and the lead are the landing page's own reviewed lines
 * (`screens/landing/copy.ts`), the FAQ is read out of the help-centre article, and the benefits are
 * the tiers WOBO-PLAN §14 sets. What this file adds is the table that puts them side by side, and
 * the two consent lines, written to match `docs/legal/refund-and-cancellation.md` §2 word for word
 * in substance.
 *
 * Copy laws (DESIGN.md): sentence case, no emoji, no exclamation marks. A tick is drawn, never
 * typed as an emoji, so the table reads the same in a screen reader as it does on screen.
 */

/** A cell: included, not included, or a qualification in words. */
export type Benefit = boolean | string;

export interface BenefitRow {
  label: string;
  free: Benefit;
  pro: Benefit;
  max: Benefit;
}

/**
 * Free, Pro and Max, the three tiers §14 names. Every row is a line the landing page already
 * publishes or a line §14 states; the allowance rows carry the multiples §14 sets, and the
 * qualification the help-centre article makes ("the counter is on screen and tells you the exact
 * time it resets").
 */
export const BENEFITS: readonly BenefitRow[] = [
  { label: 'Your real board and class, this year', free: true, pro: true, max: true },
  { label: 'Lessons drawn live on the board', free: true, pro: true, max: true },
  { label: 'Boards, practice and the sandbox', free: true, pro: true, max: true },
  { label: 'Your progress, and the parent link', free: true, pro: true, max: true },
  { label: 'Everything saved on your device', free: true, pro: true, max: true },
  {
    label: 'Turns with Wobo each day',
    free: 'a daily allowance, counted on screen',
    pro: 'five times the free allowance',
    max: 'twenty times the free allowance',
  },
  { label: 'Custom courses on anything you name', free: false, pro: true, max: true },
  { label: 'A weekly artifact for a parent', free: false, pro: true, max: true },
  { label: 'Voice, on every board', free: false, pro: true, max: true },
];

export const PLANS_PAGE = {
  eyebrow: 'plans',
  benefitsTitle: 'What each plan carries.',
  cardsTitle: 'What each plan costs.',
  /** Above the three cards. The price is set; the payment page is not open yet, and it says so. */
  cardsNote:
    'One price for everyone in a country, billed monthly, cancel any time. Checkout opens with launch, so nothing can be charged today.',
  allowanceTitle: 'Turns left today',
  allowanceNote: 'Read from your own account, never estimated.',
  marketNote: 'Shown in the currency of the country you are reading from.',
  consentTitle: 'Before anything is charged',
  consentLead:
    'Two separate boxes, because agreeing to the terms and agreeing to be charged again are two different decisions. Both are unticked until you tick them.',
  terms: 'I accept the terms of service and the privacy notice.',
  renewal:
    'I understand that a paid plan renews automatically each month until I cancel, that the amount and the renewal date are shown in full before I pay, and that I can cancel in settings, then plan, then cancel.',
  /**
   * The line under the control. It has to survive a lawyer and a parent, and it replaces the
   * landing page's own note, which still says no price is live — true when it was written, and
   * false since §14 set them.
   */
  billingNote:
    'The price is the same for everyone in a country, it is shown in full before you pay, it renews monthly only if you say so, and you can cancel in two taps. Checkout opens with launch, so nothing can be charged today.',
  cta: 'Continue',
  ctaBlocked: 'Tick both boxes to continue',
  faqTitle: 'What people ask before they pay.',
  refundsLink: 'Renewals, cancelling and refunds, in full',
} as const;

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
} as const;
