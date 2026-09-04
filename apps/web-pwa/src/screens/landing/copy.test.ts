/**
 * The board wall's words, held to the same voice rules as the rest of the product.
 *
 * Small, because the file is small now: the homepage's own copy moved to `page-copy.ts` and is
 * checked against the prototype there. What is left is the one block the gift page shows, and the
 * two things it must never do — promise a board the registry does not carry, or say a number this
 * file typed by hand.
 */

import { describe, expect, it } from 'bun:test';
import { countLine } from './boards';
import { BOARDS } from './copy';

const LINES = Object.values(BOARDS);

describe('the board wall', () => {
  it('speaks in sentence case, with no emoji and no exclamation mark', () => {
    for (const line of LINES) {
      expect(line).not.toMatch(/!/);
      expect(line).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });

  it('never puts a gendered pronoun near Wobo (plan §19)', () => {
    for (const line of LINES) expect(line).not.toMatch(/\b(she|her|hers|he|him|his)\b/i);
  });

  it('types no count of its own — every number comes from the registry', () => {
    expect(BOARDS.countTemplate).toContain('{shown}');
    expect(BOARDS.countTemplate).toContain('{total}');
    expect(BOARDS.countTemplate).toContain('{countries}');
    expect(BOARDS.countTemplate).not.toMatch(/\d/);
  });

  it('fills the count line from the registry’s own numbers', () => {
    expect(countLine(BOARDS.countTemplate, { shown: 12, total: 240, countries: 31 })).toBe(
      'Shown here: 12 of the 240 frameworks in our registry, across 31 countries.',
    );
  });

  it('promises a way in for a board that is not on the wall', () => {
    expect(BOARDS.lead).toContain('name it and Wobo goes and reads the official syllabus');
    expect(BOARDS.more).toBe('and yours');
  });
});
