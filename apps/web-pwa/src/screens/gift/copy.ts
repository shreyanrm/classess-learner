/**
 * The few lines the gift page needs that `docs/copy/growth/gift-page.md` does not already carry.
 *
 * WOBO-PLAN §16 keeps the reference product's "great gift for" cards and its testimonials section.
 * The rule in the copy file is absolute: no testimonial we did not receive, and none invented — an
 * empty space is better than a fabricated quote. So the testimonials section states that it is
 * empty and why, and the three cards below carry no claim of their own: each label is a short name
 * for a sentence quoted from the reviewed copy, which is the sentence the card shows.
 */

export interface GiftFor {
  label: string;
  /** Quoted from `docs/copy/growth/gift-page.md`. Not paraphrased. */
  quote: string;
}

export const GIFT_FOR: readonly GiftFor[] = [
  {
    label: 'A learner on any board',
    quote: "Their syllabus, their board, their class, in their board's own words.",
  },
  {
    label: 'A learner with a phone and no tutor nearby',
    quote: 'It works on a phone, a tablet or a laptop.',
  },
  {
    label: 'A learner who wants their own space',
    quote:
      'They pick their own board and their own subjects; you never see their work unless they show you.',
  },
];

export const GIFT_PAGE = {
  eyebrow: 'gift',
  cardsTitle: 'Two plans, one learner.',
  cardsNote:
    'A gift costs exactly what the same plan costs; it is never a discount surface. You choose how many months when you pay, it is paid once, and it renews never.',
  stepsTitle: 'How it works',
  forTitle: 'A good gift for',
  benefitsTitle: 'What they get',
  benefitsNote:
    'A gift is a paid plan, for one learner, for the months you chose. This is what each plan carries.',
  boardsTitle: 'Their board, their subjects.',
  boardsNote: 'They choose when they open it. Wobo teaches to whatever they pick.',
  testimonialsTitle: 'What people say',
  testimonialsEmpty:
    'Nothing here yet. We will publish what learners and parents say when they have said it and agreed to it being shown, and not before.',
  closingTitle: 'Give someone a tutor who sits beside them.',
  cta: 'Give Plus',
  ctaNote: 'Checkout opens with launch, and nothing can be charged before then.',
} as const;
