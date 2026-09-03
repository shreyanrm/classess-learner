/**
 * The reviewed copy in `docs/copy/**` turned into a tiny document tree.
 *
 * The public site does not own its words. `docs/copy/**` is the reviewed source and this module is
 * the only thing that reads it, at BUILD time (`scripts/site-content.ts`), never at run time — the
 * app ships JSON, not a Markdown parser and not a copy of the prose typed out by hand. Every string
 * on /about and /help therefore arrives from the file a reviewer edits.
 *
 * It is deliberately not a general Markdown implementation. It supports exactly what the reviewed
 * copy uses — headings, paragraphs, bold, inline code, bullet and numbered lists, one blockquote,
 * rules and links — and nothing else, because a feature nobody writes is a bug nobody catches.
 *
 * Two kinds of square bracket appear in the copy and they are NOT the same thing:
 *
 *  · an EDITORIAL NOTE — `[Owner: ...]`, `[Team placeholder — ...]`. A message to the owner about a
 *    decision that is not made. It is not page copy and it never reaches a reader, so it is
 *    stripped here rather than left for a renderer to notice.
 *  · a SLOT — `[support email]`, `[Company legal name]`, `[n]`. Page copy with a hole in it. It is
 *    kept, marked, and rendered as a visible gap: a page that says "write to [support email]" is
 *    honest about being unfinished, and inventing an address would be a lie.
 */

// --- the tree ------------------------------------------------------------------------------------

export type Inline =
  | { t: 'text'; v: string }
  | { t: 'strong'; v: string }
  | { t: 'code'; v: string }
  /** An unfilled placeholder from the copy, kept visible rather than invented. */
  | { t: 'slot'; v: string }
  | { t: 'link'; v: string; href: string };

export type Block =
  | { k: 'h'; level: 2 | 3; text: Inline[] }
  | { k: 'p'; text: Inline[] }
  | { k: 'ul'; items: Inline[][] }
  | { k: 'ol'; items: Inline[][] }
  | { k: 'quote'; text: Inline[] }
  | { k: 'rule' };

// --- editorial notes -----------------------------------------------------------------------------

/**
 * A bracket that is a message to the owner rather than page copy. Anchored at `[Owner:` or at any
 * bracket carrying the word "placeholder", both of which are the conventions `docs/copy/README.md`
 * uses. Non-greedy and it never crosses a `]`, so it cannot eat the rest of a line.
 */
const EDITORIAL_SOURCE = String.raw`\[(?:Owner:[^\]]*|[^\]]*placeholder[^\]]*)\]`;

/** True where a line carries an editorial note and nothing else. */
export function isEditorialNote(line: string): boolean {
  return (
    line.trim() !== '' &&
    new RegExp(EDITORIAL_SOURCE, 'i').test(line) &&
    stripEditorialNotes(line) === ''
  );
}

/** Remove every editorial note from a line, and tidy the space the removal leaves behind. */
export function stripEditorialNotes(line: string): string {
  return line
    .replace(new RegExp(EDITORIAL_SOURCE, 'gi'), '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ +([.,;:])/g, '$1')
    .trim();
}

// --- inline --------------------------------------------------------------------------------------

// One pass, alternation in priority order: a link's `[label](href)` has to be tried before a bare
// `[slot]` or every link label would be read as a hole in the copy.
const INLINE = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)|\[([^\]]+)\]/g;

/** The inline runs of one line of copy. Always returns at least one run for a non-empty line. */
export function parseInline(raw: string): Inline[] {
  const line = stripEditorialNotes(raw);
  const out: Inline[] = [];
  let last = 0;
  INLINE.lastIndex = 0;
  let m = INLINE.exec(line);
  while (m) {
    if (m.index > last) out.push({ t: 'text', v: line.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ t: 'strong', v: m[1] });
    else if (m[2] !== undefined) out.push({ t: 'code', v: m[2] });
    else if (m[3] !== undefined && m[4] !== undefined) out.push({ t: 'link', v: m[3], href: m[4] });
    else if (m[5] !== undefined) out.push({ t: 'slot', v: m[5] });
    last = m.index + m[0].length;
    m = INLINE.exec(line);
  }
  if (last < line.length) out.push({ t: 'text', v: line.slice(last) });
  return out.filter((run) => run.t !== 'text' || run.v !== '');
}

/** Every word of a run of inlines, with the markup dropped. Used for search and for laws. */
export function inlineText(runs: readonly Inline[]): string {
  return runs.map((run) => (run.t === 'slot' ? `[${run.v}]` : run.v)).join('');
}

/**
 * True where a paragraph is a bold line on its own — the reviewed articles' way of writing a
 * sub-heading. The renderer sets it as a heading; search quotes around it.
 */
export function isSubHeading(block: Block): boolean {
  return block.k === 'p' && block.text.length === 1 && block.text[0]?.t === 'strong';
}

/**
 * The document's prose with its sub-headings left out. A search snippet is quoted from this: a
 * sub-heading has no full stop after it, so quoting across one produces "The parent link Create,
 * view or revoke…" — two fragments read as one broken sentence.
 */
export function proseText(blocks: readonly Block[]): string {
  return blocksText(blocks.filter((block) => !isSubHeading(block)));
}

/** Every word of a document, with the markup dropped. */
export function blocksText(blocks: readonly Block[]): string {
  const parts: string[] = [];
  for (const block of blocks) {
    if (block.k === 'rule') continue;
    if (block.k === 'ul' || block.k === 'ol')
      for (const item of block.items) parts.push(inlineText(item));
    else parts.push(inlineText(block.text));
  }
  return parts.join(' ');
}

// --- blocks --------------------------------------------------------------------------------------

const HEADING = /^(#{1,6})\s+(.*)$/;
const BULLET = /^[-*]\s+(.*)$/;
const NUMBERED = /^\d+\.\s+(.*)$/;
const QUOTE = /^>\s?(.*)$/;
/** A line that is a bold label and nothing else — the reviewed copy's way of writing a sub-heading. */
const LABEL = /^\*\*([^*]+)\*\*$/;
const RULE = /^(?:---+|\*\*\*+|___+)$/;

/**
 * Parse a body of copy into blocks. `minHeading` is what a `##` becomes: an article's own `#` is
 * its title and is consumed by the caller, so everything inside the body starts at h2.
 */
export function parseBlocks(md: string, minHeading: 2 | 3 = 2): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  let quote: string[] = [];
  let list: { kind: 'ul' | 'ol'; items: string[] } | null = null;

  const flushPara = () => {
    if (para.length === 0) return;
    const text = parseInline(para.join(' '));
    para = [];
    if (text.length > 0) blocks.push({ k: 'p', text });
  };
  const flushQuote = () => {
    if (quote.length === 0) return;
    const text = parseInline(quote.join(' '));
    quote = [];
    if (text.length > 0) blocks.push({ k: 'quote', text });
  };
  const flushList = () => {
    if (!list) return;
    const items = list.items.map(parseInline).filter((item) => item.length > 0);
    if (items.length > 0) blocks.push({ k: list.kind, items });
    list = null;
  };
  const flushAll = () => {
    flushPara();
    flushQuote();
    flushList();
  };

  for (const rawLine of md.split('\n')) {
    const line = rawLine.replace(/\s+$/, '');
    const trimmed = line.trim();

    // A blank line does NOT end a list. The reviewed copy spaces its numbered points out, and
    // flushing here would turn one list of four into four lists of one.
    if (trimmed === '') {
      flushPara();
      flushQuote();
      continue;
    }

    // A continuation of the list item above: the numbered points in `about.md` wrap their body
    // onto an indented second line, and joining it into the item is the difference between one
    // point and a point followed by an orphan paragraph.
    if (list && /^\s+\S/.test(line)) {
      const item = list.items[list.items.length - 1];
      if (item !== undefined) list.items[list.items.length - 1] = `${item} ${trimmed}`;
      continue;
    }

    // A bold label on a line of its own is a sub-heading, whether or not a blank line follows it.
    // Half the reviewed articles write it with a blank line and half write it hard against the
    // sentence it introduces; without this rule the second half would fold the label into the
    // paragraph and the article would have no outline at all.
    const label = LABEL.exec(trimmed);
    if (label?.[1]) {
      flushAll();
      blocks.push({ k: 'p', text: [{ t: 'strong', v: label[1] }] });
      continue;
    }

    const heading = HEADING.exec(trimmed);
    if (heading?.[1] && heading[2] !== undefined) {
      flushAll();
      const depth = heading[1].length;
      const level = (depth <= minHeading ? minHeading : 3) as 2 | 3;
      const text = parseInline(heading[2]);
      if (text.length > 0) blocks.push({ k: 'h', level, text });
      continue;
    }

    if (RULE.test(trimmed)) {
      flushAll();
      blocks.push({ k: 'rule' });
      continue;
    }

    const quoted = QUOTE.exec(trimmed);
    if (quoted) {
      flushPara();
      flushList();
      quote.push(quoted[1] ?? '');
      continue;
    }

    const bullet = BULLET.exec(trimmed);
    if (bullet?.[1] !== undefined) {
      flushPara();
      flushQuote();
      if (list?.kind !== 'ul') {
        flushList();
        list = { kind: 'ul', items: [] };
      }
      list.items.push(bullet[1]);
      continue;
    }

    const numbered = NUMBERED.exec(trimmed);
    if (numbered?.[1] !== undefined) {
      flushPara();
      flushQuote();
      if (list?.kind !== 'ol') {
        flushList();
        list = { kind: 'ol', items: [] };
      }
      list.items.push(numbered[1]);
      continue;
    }

    flushQuote();
    flushList();
    // A line that is nothing but an editorial note leaves no paragraph behind, and must not leave
    // an empty one either.
    if (isEditorialNote(trimmed)) continue;
    para.push(trimmed);
  }
  flushAll();
  return blocks;
}

// --- the shapes the two pages are compiled into ---------------------------------------------------

/** One labelled block of copy in `about.md` — the label is the copy deck's own field name. */
export interface AboutField {
  label: string;
  blocks: Block[];
}

export interface AboutSection {
  heading: string;
  fields: AboutField[];
}

export interface AboutDoc {
  sections: AboutSection[];
}

/** Sections of `about.md` that are notes to us rather than page copy. */
const ABOUT_SKIP_SECTIONS = /^element inventory/i;

/** Field labels that describe behaviour for the builder rather than words for the reader. */
const ABOUT_SKIP_FIELDS = /^live element$/i;

/** A line that is a bold label and nothing else — how `about.md` names each field. */
const FIELD_LABEL = /^\*\*(.+)\*\*$/;

/**
 * Parse `docs/copy/about.md` — a copy deck of `## section` / `**Field**` / prose — into its
 * sections and fields. The page decides the layout; this decides nothing about the words.
 */
export function parseAbout(md: string): AboutDoc {
  const lines = md.split('\n');
  const sections: AboutSection[] = [];
  let section: { heading: string; fields: { label: string; lines: string[] }[] } | null = null;
  let field: { label: string; lines: string[] } | null = null;

  const closeSection = () => {
    if (!section) return;
    if (!ABOUT_SKIP_SECTIONS.test(section.heading)) {
      const fields = section.fields
        .filter((f) => !ABOUT_SKIP_FIELDS.test(f.label))
        // The `---` between sections is the deck's own furniture, not a rule on the page.
        .map((f) => ({
          label: f.label,
          blocks: parseBlocks(f.lines.join('\n'), 3).filter((b) => b.k !== 'rule'),
        }))
        .filter((f) => f.blocks.length > 0);
      if (fields.length > 0) sections.push({ heading: section.heading, fields });
    }
    section = null;
    field = null;
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    const trimmed = line.trim();

    const heading = HEADING.exec(trimmed);
    if (heading?.[1] && heading[2] !== undefined) {
      if (heading[1].length === 1) continue;
      if (heading[1].length === 2) {
        closeSection();
        section = { heading: heading[2], fields: [] };
        continue;
      }
    }

    if (!section) continue;

    const label = FIELD_LABEL.exec(trimmed);
    if (label?.[1]) {
      field = { label: label[1], lines: [] };
      section.fields.push(field);
      continue;
    }
    if (field) field.lines.push(line);
  }
  closeSection();
  return { sections };
}

// --- the help centre -------------------------------------------------------------------------------

export interface HelpArticle {
  slug: string;
  group: string;
  title: string;
  /** The first line of the article: a complete answer on its own (help-centre README's first rule). */
  lead: Inline[];
  blocks: Block[];
  /** The article the copy points at next, resolved to an address. */
  next?: { group: string; slug: string; title: string };
  /** Everything the article says after its title, in its own case — search snippets read it. */
  plain: string;
  /** The title and the body, lower-cased, for matching. Never rendered. */
  text: string;
}

export interface HelpGroup {
  slug: string;
  title: string;
  blurb: string;
  articles: HelpArticle[];
}

export interface HelpWithheld {
  group: string;
  slug: string;
  title: string;
  reason: string;
}

export interface HelpDoc {
  title: string;
  groups: HelpGroup[];
  /** Articles the copy itself marks as not shippable. Never rendered; reported by the build. */
  withheld: HelpWithheld[];
}

/** The address slug of an article file: `03-saying-hey-wobo.md` → `saying-hey-wobo`. */
export function articleSlug(filename: string): string {
  return filename.replace(/\.md$/, '').replace(/^\d+[-_]/, '');
}

/**
 * A reviewer's hold on an article: a blockquote saying "do not ship". The copy deck uses it to mark
 * a page blocked on a decision, and a build that ignored it would publish the block itself.
 */
export function withholdReason(md: string): string | null {
  for (const line of md.split('\n')) {
    const quoted = QUOTE.exec(line.trim());
    if (!quoted?.[1]) continue;
    if (/do not ship/i.test(quoted[1])) return inlineText(parseInline(quoted[1]));
  }
  return null;
}

/** The title an article's `**Next:**` line points at, or null where there is no such line. */
export function nextTitle(blocks: readonly Block[]): string | null {
  for (const block of blocks) {
    if (block.k !== 'p') continue;
    const first = block.text[0];
    if (first?.t !== 'strong' || !/^next:?$/i.test(first.v.trim())) continue;
    const rest = inlineText(block.text.slice(1)).trim();
    return rest.replace(/\.$/, '') || null;
  }
  return null;
}

/** The blocks with the `**Next:**` paragraph removed — the page renders it as a link instead. */
export function withoutNext(blocks: readonly Block[]): Block[] {
  return blocks.filter((block) => {
    if (block.k !== 'p') return true;
    const first = block.text[0];
    return !(first?.t === 'strong' && /^next:?$/i.test(first.v.trim()));
  });
}

/**
 * Split an article body into its lead — the bold opening line the help-centre rules require — and
 * the rest. An article with no bold opener keeps its first paragraph as the lead rather than
 * shipping a page with no answer at the top.
 */
export function splitLead(blocks: readonly Block[]): { lead: Inline[]; body: Block[] } {
  const first = blocks[0];
  if (first?.k === 'p') return { lead: first.text, body: blocks.slice(1) };
  return { lead: [], body: [...blocks] };
}
