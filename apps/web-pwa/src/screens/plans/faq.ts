/**
 * The plans FAQ, read out of the reviewed help-centre article rather than written again.
 *
 * `docs/copy/help-centre/wobo-basics/09-plans-and-billing.md` already answers what a visitor asks
 * on a pricing page — what a turn is, how paying works, how renewals and cancelling work, where the
 * receipt goes. It is written in Wobo's voice and it has been reviewed. Restating it here would
 * create a second copy to keep in step, and the two would drift.
 *
 * The article is written as bold questions with the answer under each, so the shape below is a
 * faithful reading of that, not an interpretation of it. Editorial notes to the owner (`[Owner: …]`)
 * are stripped upstream: they are decisions still open, not answers.
 */

import type { Block, Inline } from '../legal/markdown';

export interface FaqItem {
  question: string;
  /** The answer, as the blocks it is written in. */
  answer: Block[];
}

export interface Faq {
  /** The article's opening line, which is a claim rather than a question. */
  lead: Inline[] | null;
  items: FaqItem[];
}

/** A paragraph that opens with a bold run — the article's way of asking a question. */
function question(block: Block): { text: string; rest: Inline[] } | null {
  if (block.kind !== 'paragraph') return null;
  const [first, ...rest] = block.spans;
  if (first?.kind !== 'strong') return null;
  return { text: first.text.trim(), rest };
}

/**
 * Read the article into a lead and a list of questions. `skip` drops questions that belong to the
 * help centre rather than to a pricing page — the "Related:" cross-link at the foot of the article.
 */
export function faqItems(blocks: readonly Block[], skip: readonly string[] = ['Related:']): Faq {
  const items: FaqItem[] = [];
  for (const block of blocks) {
    const head = question(block);
    if (head) {
      const answer: Block[] = head.rest.length
        ? [{ kind: 'paragraph', spans: trimLeading(head.rest) }]
        : [];
      items.push({ question: head.text, answer });
      continue;
    }
    if (block.kind === 'heading') continue;
    const last = items[items.length - 1];
    if (last) last.answer.push(block);
  }
  const lead = items[0] && items[0].answer.length === 0 ? items.shift() : null;
  return {
    lead: lead ? [{ kind: 'text', text: lead.question }] : null,
    items: items.filter((item) => !skip.includes(item.question) && item.answer.length > 0),
  };
}

/** Drop the space left where the bold question ended and the answer began. */
function trimLeading(spans: readonly Inline[]): Inline[] {
  const [first, ...rest] = spans;
  if (!first) return [];
  if (first.kind === 'text') {
    const text = first.text.replace(/^\s+/, '');
    return text ? [{ ...first, text }, ...rest] : rest;
  }
  return [...spans];
}
