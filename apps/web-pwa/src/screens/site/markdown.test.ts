import { describe, expect, it } from 'bun:test';
import {
  articleSlug,
  type Block,
  blocksText,
  inlineText,
  isEditorialNote,
  nextTitle,
  parseAbout,
  parseBlocks,
  parseInline,
  splitLead,
  stripEditorialNotes,
  withholdReason,
  withoutNext,
} from './markdown';

describe('inline copy', () => {
  it('reads bold, code and a link', () => {
    expect(parseInline('a **bold** and `code` and [a page](/help)')).toEqual([
      { t: 'text', v: 'a ' },
      { t: 'strong', v: 'bold' },
      { t: 'text', v: ' and ' },
      { t: 'code', v: 'code' },
      { t: 'text', v: ' and ' },
      { t: 'link', v: 'a page', href: '/help' },
    ]);
  });

  it('keeps an unfilled placeholder as a slot rather than dropping or inventing it', () => {
    expect(parseInline('Write to [support email] from any address')).toEqual([
      { t: 'text', v: 'Write to ' },
      { t: 'slot', v: 'support email' },
      { t: 'text', v: ' from any address' },
    ]);
  });

  it("does not mistake a link's label for a slot", () => {
    const runs = parseInline('[Wobo basics](wobo-basics/)');
    expect(runs).toHaveLength(1);
    expect(runs[0]?.t).toBe('link');
  });

  it('reads a slot right after a link on the same line', () => {
    const runs = parseInline('see [help](/help) or write to [support email]');
    expect(runs.map((r) => r.t)).toEqual(['text', 'link', 'text', 'slot']);
  });
});

describe('editorial notes never reach a reader', () => {
  it('strips a note left mid-sentence and tidies the space behind it', () => {
    expect(stripEditorialNotes('Annual costs less. [Owner: an open decision.]')).toBe(
      'Annual costs less.',
    );
  });

  it('recognises a line that is nothing but a note', () => {
    expect(isEditorialNote('[Owner: future work, nobody has decided.]')).toBe(true);
    expect(isEditorialNote('[Team placeholder — names and roles.]')).toBe(true);
    expect(isEditorialNote('Write to [support email].')).toBe(false);
    expect(isEditorialNote('')).toBe(false);
  });

  it('leaves no empty paragraph where a note used to be', () => {
    const blocks = parseBlocks('Real copy.\n\n[Owner: not decided.]\n\nMore real copy.');
    expect(blocks).toHaveLength(2);
    expect(blocksText(blocks)).toBe('Real copy. More real copy.');
  });

  it('is not confused by two notes on one line', () => {
    expect(stripEditorialNotes('a [Owner: one] b [Owner: two] c')).toBe('a b c');
  });
});

describe('blocks', () => {
  it('keeps a list together across the blank lines the copy writes between items', () => {
    const blocks = parseBlocks('1. One.\n\n2. Two.\n\n3. Three.');
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.k).toBe('ol');
    expect(blocks[0]?.k === 'ol' && blocks[0].items).toHaveLength(3);
  });

  it('folds an indented continuation into the item above it, not into an orphan paragraph', () => {
    const blocks = parseBlocks('1. **A point.**\n   Its body, on the next line.');
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.k === 'ol' && inlineText(blocks[0].items[0] ?? [])).toBe(
      'A point. Its body, on the next line.',
    );
  });

  it('reads a bold line of its own as a sub-heading, with or without a blank line under it', () => {
    const tight = parseBlocks('**Account**\nYour name and number.');
    expect(tight.map((b) => b.k)).toEqual(['p', 'p']);
    expect(inlineText(tight[0]?.k === 'p' ? tight[0].text : [])).toBe('Account');
    expect(inlineText(tight[1]?.k === 'p' ? tight[1].text : [])).toBe('Your name and number.');
    const spaced = parseBlocks('**Account**\n\nYour name and number.');
    expect(spaced).toEqual(tight);
  });

  it('leaves a bold lead-in inside its own sentence alone', () => {
    const blocks = parseBlocks('**Next:** Your first five minutes.');
    expect(blocks).toHaveLength(1);
    expect(blocksText(blocks)).toBe('Next: Your first five minutes.');
  });

  it('reads a bullet list, a quote and a rule', () => {
    const blocks = parseBlocks('- one\n- two\n\n> held\n\n---');
    expect(blocks.map((b: Block) => b.k)).toEqual(['ul', 'quote', 'rule']);
  });

  it('joins a wrapped paragraph into one paragraph', () => {
    const blocks = parseBlocks('A sentence that\ncarries onto a second line.');
    expect(blocks).toHaveLength(1);
    expect(blocksText(blocks)).toBe('A sentence that carries onto a second line.');
  });
});

describe('an article', () => {
  const article = [
    '**A complete answer on its own.**',
    '',
    'The body of it.',
    '',
    '**Next:** Your first five minutes.',
  ].join('\n');

  it('takes its first line as the lead', () => {
    const { lead, body } = splitLead(parseBlocks(article));
    expect(inlineText(lead)).toBe('A complete answer on its own.');
    expect(blocksText(body)).toContain('The body of it.');
  });

  it('reads the article the copy points at next, and takes the line out of the body', () => {
    const blocks = parseBlocks(article);
    expect(nextTitle(blocks)).toBe('Your first five minutes');
    expect(blocksText(withoutNext(blocks))).not.toContain('Next:');
  });

  it('honours a reviewer hold rather than publishing the hold notice', () => {
    const held = '# A page\n\n> **Status: do not ship.** A ruling is needed.\n\nBody.';
    expect(withholdReason(held)).toContain('do not ship');
    expect(withholdReason('# A page\n\n> just a quotation\n')).toBeNull();
  });

  it('takes its address from the filename, without the ordering prefix', () => {
    expect(articleSlug('03-saying-hey-wobo.md')).toBe('saying-hey-wobo');
    expect(articleSlug('settings.md')).toBe('settings');
  });
});

describe('the about deck', () => {
  const deck = [
    '# about.md — the About page',
    '',
    'A note to us about the page.',
    '',
    '## Hero',
    '',
    '**Eyebrow**',
    'About Wobo',
    '',
    '**Headline**',
    'A tutor who draws.',
    '',
    '**Live element**',
    'Wobo draws the underline.',
    '',
    '---',
    '',
    '## Element inventory (per WOBO-PLAN §15)',
    '',
    '**Table**',
    'not page copy',
  ].join('\n');

  it('reads each section into its labelled fields', () => {
    const doc = parseAbout(deck);
    expect(doc.sections.map((s) => s.heading)).toEqual(['Hero']);
    expect(doc.sections[0]?.fields.map((f) => f.label)).toEqual(['Eyebrow', 'Headline']);
  });

  it('drops the stage direction and the inventory, which are notes to the builder', () => {
    const doc = parseAbout(deck);
    const labels = doc.sections.flatMap((s) => s.fields.map((f) => f.label));
    expect(labels).not.toContain('Live element');
    expect(doc.sections.some((s) => /inventory/i.test(s.heading))).toBe(false);
  });

  it("drops the deck's own section separators", () => {
    const doc = parseAbout(deck);
    const kinds = doc.sections.flatMap((s) => s.fields.flatMap((f) => f.blocks.map((b) => b.k)));
    expect(kinds).not.toContain('rule');
  });
});
