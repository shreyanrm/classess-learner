/**
 * What a PLAN carries, in words (DESIGN.md §0 — the copy law).
 *
 * The law forbids a raw allowance anywhere a learner or a parent can read one: never "40 questions
 * a day", never "25 of 40", never "200 turns a day" in the rail's plan card. A number turns a
 * generous evening into a meter, and a meter is a thing you count down rather than a thing you
 * think inside.
 *
 * Two sentences say it instead, and this file owns the second one:
 *  · what is LEFT today — `screens/plans/allowance.ts` (`allowanceLine`), shared by the rail's
 *    card, the plans page and the last step of onboarding, so the product has one voice for it;
 *  · what the PLAN itself carries — here. Free carries no multiplier at all (WOBO-PLAN §14), Pro
 *    is "five times the free allowance", Max is "twenty times".
 */

const TIMES: readonly string[] = [
  '',
  '',
  'twice',
  'three times',
  'four times',
  'five times',
  'six times',
  'seven times',
  'eight times',
  'nine times',
  'ten times',
];

/** The multiples above ten a tier might plausibly carry, spelled rather than printed. */
const BEYOND_TEN: Record<number, string> = {
  12: 'twelve',
  15: 'fifteen',
  20: 'twenty',
  25: 'twenty-five',
  50: 'fifty',
};

/**
 * "five times the free allowance" — never a count of questions. Empty for the free tier, which
 * multiplies nothing and is therefore never described as a multiple of itself.
 */
export function multipleInWords(multiple: number): string {
  if (!Number.isFinite(multiple) || multiple <= 1) return '';
  const n = Math.round(multiple);
  const word = TIMES[n] || (BEYOND_TEN[n] ? `${BEYOND_TEN[n]} times` : `${n} times`);
  return `${word} the free allowance`;
}

/**
 * The line in the rail's plan card: the tier's name, and what its day carries. Free says what it
 * feels like; a paid tier says what it multiplies. Neither says a number.
 */
export function planInWords(name: string, multiple: number): string {
  const times = multipleInWords(multiple);
  return times ? `${name} · ${times}` : `${name} · enough for a normal evening, every day`;
}
