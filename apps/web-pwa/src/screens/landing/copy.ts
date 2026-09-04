/**
 * The board wall's words.
 *
 * This file used to hold the whole of the previous landing page. Law v5's homepage does not have a
 * board wall — it names subject FAMILIES and asks about the board once, in a sentence — so what is
 * left here is the one block another screen still shows: the gift page's "every board on earth"
 * strip. Its counts are filled from `boards.json`, which is generated at build time from the
 * curriculum registry, so nothing here can claim a board we do not carry.
 *
 * The live homepage copy is `page-copy.ts`, and it is the only place to change a word of it.
 */

export const BOARDS = {
  title: 'Your syllabus, the real one, this year.',
  lead: 'Pick your board and class and Wobo teaches to that. Not listed here is not a problem: name it and Wobo goes and reads the official syllabus. Nothing published at all, and you can show Wobo your own book and get a plan built from it.',
  /** Sits under the chips; the numbers come from the registry, not from this file. */
  countTemplate:
    'Shown here: {shown} of the {total} frameworks in our registry, across {countries} countries.',
  more: 'and yours',
} as const;
