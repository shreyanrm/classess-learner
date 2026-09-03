/**
 * Who Wobo is, in the places a reader is entitled to be told.
 *
 * The reviewed copy writes an undecided term as a bracket — `[support email]`, `[postal address]`
 * — and both markdown renderers draw a bracket as a visible gap rather than inventing a value.
 * That is right for a term nobody has decided. It was wrong for two of them: `docs/legal` already
 * PUBLISHES support@heywobo.com and privacy@heywobo.com in full sentences, so the product was
 * showing a real address on the terms page and a dashed blank on the About page and mid-sentence
 * in the plans FAQ. One reader, two answers, and the blank was the false one.
 *
 * So this module holds the decided values in one place, and the renderers resolve a slot through
 * it. A term that genuinely has no answer yet — the registered company name, the postal address —
 * is NOT here, and still renders as the gap it is. The rule is narrow on purpose: a value belongs
 * here only when the legal set already publishes it as plain text somewhere a reader can see, and
 * `identity.test.ts` checks that against `docs/legal/**` so nothing can be quietly invented here.
 */

/** A mailbox the documents publish, and what a reader should send to it. */
export interface Mailbox {
  address: string;
  /** What this box is for, in the reader's words. */
  what: string;
}

/**
 * Every address the legal set publishes, in the order a reader meets them. Support first: it is
 * the one that answers anything, and the one the other pages fall back to.
 */
export const MAILBOXES: readonly Mailbox[] = [
  {
    address: 'support@heywobo.com',
    what: 'anything at all, including anything that looks wrong in a lesson',
  },
  { address: 'safety@heywobo.com', what: 'someone at risk, or something that worries you' },
  {
    address: 'privacy@heywobo.com',
    what: 'your data, or a child’s — export, correction, deletion',
  },
  { address: 'dpo@heywobo.com', what: 'the data protection officer, for a formal data request' },
  { address: 'accessibility@heywobo.com', what: 'anything in Wobo that is in your way' },
  {
    address: 'security@heywobo.com',
    what: 'a vulnerability you found, before you do anything else',
  },
  { address: 'legal@heywobo.com', what: 'a rights complaint, or a legal notice' },
];

/**
 * The bracketed terms in the reviewed copy that DO have an answer, and what it is.
 *
 * Keys are the bracket's own words, lowercased. Anything absent stays a visible gap: that is the
 * honest state of the page and the only alternative is making something up.
 */
export const RESOLVED_SLOTS: Readonly<Record<string, string>> = {
  'support email': 'support@heywobo.com',
  'privacy email': 'privacy@heywobo.com',
};

/**
 * The terms that are genuinely open, listed so the pages can say WHICH, rather than leaving a
 * reader to work out what the dashes mean. Owner decision, not ours to make.
 */
export const OPEN_TERMS: readonly string[] = ['Company legal name', 'postal address'];

/** The decided value for a bracketed slot, or null where nobody has decided one. */
export function resolveSlot(text: string): string | null {
  const key = text
    .trim()
    .replace(/^\[|\]$/g, '')
    .trim()
    .toLowerCase();
  return RESOLVED_SLOTS[key] ?? null;
}
