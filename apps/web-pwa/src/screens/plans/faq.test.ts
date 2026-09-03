/**
 * The FAQ is a reading of the reviewed help-centre article, so the test is a fidelity test: the
 * questions come out in the article's order, the answers stay with their question, and the notes
 * addressed to the owner never reach a visitor.
 */

import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { parseBlocks, stripEditorialNotes } from '../legal/markdown';
import { faqItems } from './faq';

const ARTICLE = new URL(
  '../../../../../docs/copy/help-centre/wobo-basics/09-plans-and-billing.md',
  import.meta.url,
).pathname;

const source = readFileSync(ARTICLE, 'utf8');
const faq = faqItems(parseBlocks(stripEditorialNotes(source).text));

describe('the plans FAQ', () => {
  it("takes its lead from the article's own opening line", () => {
    expect(faq.lead?.map((s) => s.text).join('')).toContain('Wobo is free to use');
  });

  it('carries the questions a pricing page is asked', () => {
    expect(faq.items.map((i) => i.question)).toEqual([
      'Free',
      'Plus',
      'What "turns" means',
      'Paying',
      'Renewals',
      'Cancelling',
      'Receipts',
    ]);
  });

  it('keeps each answer with its question', () => {
    const free = faq.items.find((i) => i.question === 'Free');
    const spans = free?.answer[0]?.kind === 'paragraph' ? free.answer[0].spans : [];
    expect(spans.map((s) => s.text).join('')).toContain('A real product, not a trial');
  });

  it('never shows a decision still open with the owner', () => {
    expect(JSON.stringify(faq)).not.toContain('Owner:');
  });

  it("drops the help centre's own cross-link", () => {
    expect(faq.items.some((i) => i.question === 'Related:')).toBe(false);
  });
});
