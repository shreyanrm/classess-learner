/**
 * Honest labels, in plain language (CURRICULUM.md §5).
 *
 * The brain sends a `label` on everything it serves and that label always wins — it knows the
 * academic year and who verified it. These are the fallback for the one case the brain cannot
 * cover: a screen rendering from the offline cache, or a status the brain sent without words.
 *
 * Nothing here overstates. "Verified" without a year says verified without a year; it never
 * borrows a year from somewhere else to look more certain than we are.
 */

import type { CurriculumSourceRef, CurriculumStatus } from './types';

/** The four lines. Sentence case, no emoji, no exclamation marks (WOBO-PLAN §0). */
export function labelFor(
  status: CurriculumStatus,
  options: { name?: string; version?: string | null } = {},
): string {
  const name = options.name?.trim();
  const version = options.version?.trim();
  switch (status) {
    case 'verified': {
      const subject = [name, version].filter(Boolean).join(' ');
      return subject ? `Official ${subject}, verified` : 'Official syllabus, verified';
    }
    case 'provisional':
      return "Found on the board's site, still checking";
    case 'community':
      return 'Shared by another learner, not yet checked';
    case 'personal':
      return 'Drafted from your syllabus, check it';
  }
}

/** One line naming where a node came from, or nothing at all when it came from the learner. */
export function sourceLine(ref: CurriculumSourceRef | null, own = false): string {
  if (own) return 'You added this';
  if (!ref) return '';
  const where = ref.section ?? (ref.page !== null ? `page ${ref.page}` : null);
  if (!ref.url) return where ? `From ${where} of the syllabus` : '';
  const host = hostOf(ref.url);
  if (where && host) return `From ${where} of ${host}`;
  if (host) return `From ${host}`;
  return where ? `From ${where} of the syllabus` : '';
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/** What Wobo says while a discovery job is running, when the brain sent no line of its own. */
export const DISCOVERY_COPY = {
  looking: 'I am looking for the official syllabus for this one.',
  refused:
    'I could not find an official syllabus for this. Show me yours and I will build it with you.',
  empty: 'Tell me your board or curriculum and I will bring your syllabus here.',
} as const;
