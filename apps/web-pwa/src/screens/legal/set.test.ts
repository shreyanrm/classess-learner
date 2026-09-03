/**
 * The real documents, parsed.
 *
 * This is the gate that matters: it reads `docs/legal/**` off disk, exactly as the build inlines
 * it, and asserts that every document survives the trip to the page. If a lawyer's edit introduces
 * a construct the parser does not know, or a review tag that would leak to a learner, this fails
 * before anyone sees it on the site.
 */

import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { indexRows, slugOfFile, spansText } from './catalog';
import { documentBody, documentShape, parseBlocks, stripReviewTags } from './markdown';

const DIR = new URL('../../../../../docs/legal/', import.meta.url).pathname;
const FILES = readdirSync(DIR).filter((f) => f.endsWith('.md'));
const read = (file: string): string => readFileSync(join(DIR, file), 'utf8');
const DOCUMENTS = FILES.filter((f) => f !== 'README.md');

describe('the legal set on disk', () => {
  it('is the ten documents plus the README', () => {
    expect(DOCUMENTS.length).toBe(10);
  });

  for (const file of DOCUMENTS) {
    describe(file, () => {
      const source = read(file);
      const blocks = parseBlocks(source);
      const shape = documentShape(blocks, source);

      it('has a title, a date and an "in plain words" box', () => {
        expect(shape.title).toBeTruthy();
        expect(shape.drafted).toBeTruthy();
        expect(shape.plainWords?.length).toBeGreaterThan(0);
      });

      it('has sections to build a table of contents from', () => {
        expect(shape.contents.length).toBeGreaterThan(1);
        expect(new Set(shape.contents.map((h) => h.id)).size).toBe(shape.contents.length);
      });

      it('renders a body, and it is most of the document', () => {
        expect(documentBody(blocks).length).toBeGreaterThan(5);
      });

      it('leaks no question for counsel into what a learner reads', () => {
        const rendered = JSON.stringify(blocks);
        expect(rendered.includes('[REVIEW')).toBe(false);
        expect(rendered.includes('REVIEW:')).toBe(false);
      });

      it('counts the questions that were removed', () => {
        expect(stripReviewTags(source).reviews).toBe((source.match(/\[REVIEW/g) ?? []).length);
      });
    });
  }
});

describe('the index', () => {
  it('describes every document the site holds', () => {
    const rows = indexRows(parseBlocks(read('README.md')), DOCUMENTS.map(slugOfFile));
    expect(rows.length).toBe(DOCUMENTS.length);
    for (const row of rows) expect(spansText(row.what).length).toBeGreaterThan(4);
  });
});
