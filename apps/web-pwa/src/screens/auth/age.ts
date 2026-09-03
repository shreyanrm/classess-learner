/**
 * The age gate, and the branch it opens.
 *
 * `docs/legal/parental-consent.md` is the source: from 13 the learner holds the account; below 13 a
 * parent or guardian holds it with them; and under 18 in India the optional features — memory,
 * voice, photographs, sharing, messages to a parent — need a parent's verifiable consent whoever
 * holds the account. Where local law sets a higher age, that age applies.
 *
 * Two rules are encoded here and are not negotiable in the UI:
 *
 *  · **Teaching is never gated.** Consent switches on memory, voice, photographs and sharing, not
 *    the lessons. A learner of any age can learn; what changes is what Wobo is allowed to keep.
 *  · **A tick on a child's own screen is never parental consent.** Under 13, the flow's next step
 *    is a message to the parent's own address, opened and confirmed on the parent's own device.
 *
 * Pure, so `age.test.ts` can drive every boundary without a browser.
 */

/** Which side of the two lines a learner falls on. */
export type AgeBand = 'child' | 'teen' | 'adult';

/** The age at which a learner may hold the account themselves (terms of service §4). */
export const ACCOUNT_AGE = 13;
/** The age below which the optional features need a parent's consent (DPDP, India). */
export const CONSENT_AGE = 18;

export interface ConsentBranch {
  band: AgeBand;
  /** Who the account belongs to. */
  holder: 'parent' | 'learner';
  /** True when nothing can proceed until a parent has been written to and has confirmed. */
  parentRequired: boolean;
  /** True when a parent's address is asked for, but the learner can carry on without it. */
  parentOffered: boolean;
  /** The one line the learner reads on this screen, in Wobo's voice. */
  notice: string;
}

/** Whole years old on `now`, from a date of birth. Null when the date is not a real one. */
export function ageOn(birth: string, now: Date = new Date()): number | null {
  const when = new Date(birth);
  if (Number.isNaN(when.getTime())) return null;
  if (when.getTime() > now.getTime()) return null;
  let years = now.getFullYear() - when.getFullYear();
  const monthDiff = now.getMonth() - when.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < when.getDate())) years -= 1;
  // Nobody is 140. A date that far back is a typo, not a birthday, and we would rather ask again.
  if (years < 0 || years > 130) return null;
  return years;
}

export function bandFor(age: number): AgeBand {
  if (age < ACCOUNT_AGE) return 'child';
  if (age < CONSENT_AGE) return 'teen';
  return 'adult';
}

/** What this age means for the rest of the flow. */
export function consentBranch(age: number): ConsentBranch {
  const band = bandFor(age);
  if (band === 'child') {
    return {
      band,
      holder: 'parent',
      parentRequired: true,
      parentOffered: true,
      notice:
        'You are under 13, so a parent or guardian holds the account with you. Give us their email and Wobo will ask them, from their own device.',
    };
  }
  if (band === 'teen') {
    return {
      band,
      holder: 'learner',
      parentRequired: false,
      parentOffered: true,
      notice:
        'The account is yours. Wobo needs a parent or guardian to say yes before remembering how you learn, hearing your voice, or reading a photo of your book. Lessons work either way.',
    };
  }
  return {
    band,
    holder: 'learner',
    parentRequired: false,
    parentOffered: false,
    notice: 'The account is yours, and so is everything in it.',
  };
}

export interface SignUpFields {
  /** ISO date, from the date input. Empty until answered. */
  birth: string;
  /** The parent or guardian's address, when the branch asks for one. */
  parentEmail: string;
  /** The terms and privacy tick. Never pre-ticked. */
  agreed: boolean;
}

export type BlockReason = 'birth' | 'birth-invalid' | 'parent-email' | 'agree' | null;

/** A rough shape check. Deliverability is the mail server's answer, not something to guess at here. */
export function looksLikeEmail(value: string): boolean {
  const v = value.trim();
  return v.length >= 5 && v.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

/**
 * What is still in the way of creating this account, in the order a learner meets it. Null when
 * nothing is. The screen shows one thing at a time; a form that lights up five errors at once is a
 * form that has given up on the person filling it in.
 */
export function blockedBy(fields: SignUpFields, now: Date = new Date()): BlockReason {
  if (!fields.birth) return 'birth';
  const age = ageOn(fields.birth, now);
  if (age === null) return 'birth-invalid';
  if (consentBranch(age).parentRequired && !looksLikeEmail(fields.parentEmail)) {
    return 'parent-email';
  }
  if (!fields.agreed) return 'agree';
  return null;
}
