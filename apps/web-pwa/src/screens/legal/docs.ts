/**
 * The legal set itself, loaded from `docs/legal/**` at build time.
 *
 * The markdown files are the single source: there is no copy of them in the app, so a correction
 * made for counsel is live on the site with the next build and cannot be forgotten here. Vite
 * inlines them as strings; the whole set is about 115 kB of text and the route is lazy, so nobody
 * downloads a word of it until they open a legal page.
 *
 * Parsing is memoised per document, because the table of contents, the plain-words box and the body
 * are three reads of the same document.
 */

import { type IndexRow, indexRows, mailboxes, slugOfFile } from './catalog';
import {
  type Block,
  type DocumentShape,
  documentShape,
  parseBlocks,
  stripReviewTags,
} from './markdown';

// eager: the whole set is one lazy route chunk, and a reader who opens one document usually opens
// its cross-references too. `import: 'default'` unwraps the `?raw` module to the string itself.
const SOURCES = import.meta.glob('../../../../../docs/legal/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** slug → the raw markdown of that document. */
const BY_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(SOURCES).map(([path, source]) => [slugOfFile(path), source]),
);

/** The README is the index's source, not a document anyone reads on the site. */
const README = 'README';

export interface LegalDocument {
  slug: string;
  blocks: Block[];
  shape: DocumentShape;
  /** How many questions for counsel the document still carries. */
  reviews: number;
}

const CACHE = new Map<string, LegalDocument>();

/** Every document slug the site holds, README excluded, in the README's own order where possible. */
export function documentSlugs(): string[] {
  const all = Object.keys(BY_SLUG).filter((slug) => slug !== README);
  const ordered = indexRows(readmeBlocks(), all).map((row) => row.slug);
  return [...ordered, ...all.filter((slug) => !ordered.includes(slug))];
}

/** The parsed document at `slug`, or null where there is no such document. */
export function legalDocument(slug: string): LegalDocument | null {
  const cached = CACHE.get(slug);
  if (cached) return cached;
  const source = BY_SLUG[slug];
  if (!source || slug === README) return null;
  const blocks = parseBlocks(source);
  const doc: LegalDocument = {
    slug,
    blocks,
    shape: documentShape(blocks, source),
    reviews: stripReviewTags(source).reviews,
  };
  CACHE.set(slug, doc);
  return doc;
}

let readmeCache: Block[] | null = null;
function readmeBlocks(): Block[] {
  if (!readmeCache) readmeCache = parseBlocks(BY_SLUG[README] ?? '');
  return readmeCache;
}

/** The index rows: one per document, described in the README's own words. */
export function legalIndex(): IndexRow[] {
  return indexRows(readmeBlocks(), Object.keys(BY_SLUG));
}

/** Every mailbox the documents name, for the contact page. */
export function legalMailboxes(): string[] {
  return mailboxes(documentSlugs().map((slug) => BY_SLUG[slug] ?? ''));
}

/** The date the set was drafted, taken from the README. */
export function setDrafted(): string | null {
  return documentShape(readmeBlocks(), BY_SLUG[README] ?? '').drafted;
}
