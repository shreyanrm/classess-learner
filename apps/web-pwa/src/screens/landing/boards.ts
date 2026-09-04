/**
 * The board registry's numbers, as a sentence.
 *
 * The chips and the counts are generated at build time from
 * `content/curriculum/frameworks.seed.json` by `scripts/landing-boards.ts` into `boards.json`, so no
 * surface can claim a board the registry does not carry, and the number under the chips is the
 * registry's own total rather than a round number someone liked the sound of.
 *
 * The landing page itself no longer shows a board wall — law v5's homepage names subject FAMILIES
 * and asks about the board once, in a sentence — but the gift page still does, and the arithmetic
 * belongs beside the data either way.
 */

/** Fill the count line from the generated registry numbers. Nothing here is typed by hand. */
export function countLine(
  template: string,
  counts: { shown: number; total: number; countries: number },
): string {
  return template
    .replace('{shown}', String(counts.shown))
    .replace('{total}', String(counts.total))
    .replace('{countries}', String(counts.countries));
}
