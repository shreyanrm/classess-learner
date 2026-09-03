import { describe, expect, it } from 'bun:test';
import { HELP } from './help-content';
import type { HelpArticle, HelpGroup } from './markdown';
import { findArticle, queryTerms, scoreArticle, searchArticles, snippetFor } from './search';

function article(partial: Partial<HelpArticle> & { slug: string; title: string }): HelpArticle {
  return {
    group: 'g',
    lead: [{ t: 'strong', v: partial.title }],
    blocks: [],
    ...partial,
    // Last, and derived: the compiler builds an article's two searchable strings from its own
    // words, and a fixture that let them through raw would test something it never produces.
    plain: partial.plain ?? '',
    text: `${partial.title} ${partial.plain ?? ''}`.toLowerCase(),
  } as HelpArticle;
}

const GROUPS: HelpGroup[] = [
  {
    slug: 'g',
    title: 'A group',
    blurb: 'a blurb',
    articles: [
      article({
        slug: 'parent-link',
        title: 'The parent link',
        plain: 'A parent can follow along.',
      }),
      article({ slug: 'privacy', title: 'Your privacy and your data', plain: 'A parent may ask.' }),
      article({ slug: 'streaks', title: 'Streaks, and taking a day off', plain: 'Rest is fine.' }),
    ],
  },
];

describe('the query', () => {
  it('drops one-letter fragments, which match everything', () => {
    expect(queryTerms('a parent link')).toEqual(['parent', 'link']);
  });

  it('is not case or punctuation sensitive, and never repeats a term', () => {
    expect(queryTerms('Parent, parent — LINK')).toEqual(['parent', 'link']);
  });
});

describe('scoring', () => {
  const parent = GROUPS[0]?.articles[0] as HelpArticle;

  it('scores nothing where a single word of the query is missing', () => {
    expect(scoreArticle(parent, ['parent', 'billing'])).toBe(0);
  });

  it('ranks a title match above a body match', () => {
    const inTitle = scoreArticle(parent, ['link']);
    const inBody = scoreArticle(parent, ['follow']);
    expect(inTitle).toBeGreaterThan(inBody);
  });
});

describe('results', () => {
  it('returns nothing for an empty query rather than the whole help centre', () => {
    expect(searchArticles(GROUPS, '   ')).toEqual([]);
  });

  it('requires every word, so a two-word query narrows instead of widening', () => {
    expect(searchArticles(GROUPS, 'parent').map((h) => h.slug)).toEqual(['parent-link', 'privacy']);
    expect(searchArticles(GROUPS, 'parent follow').map((h) => h.slug)).toEqual(['parent-link']);
  });

  it('puts the article that is named by the query first', () => {
    expect(searchArticles(GROUPS, 'privacy')[0]?.slug).toBe('privacy');
  });

  it('is stable: the same query gives the same order every time', () => {
    const once = searchArticles(GROUPS, 'parent').map((h) => h.slug);
    const twice = searchArticles(GROUPS, 'parent').map((h) => h.slug);
    expect(once).toEqual(twice);
  });

  it('shows the sentence the match is in, in the case the copy wrote it', () => {
    expect(snippetFor('One thing. The parent can follow. Another thing.', ['parent'])).toBe(
      'The parent can follow.',
    );
  });

  it('quotes the body, not the title stapled to the front of it', () => {
    expect(searchArticles(GROUPS, 'follow')[0]?.snippet).toBe('A parent can follow along.');
  });

  it('falls back to the opening line where only the title matched', () => {
    expect(searchArticles(GROUPS, 'streaks')[0]?.snippet).toBe('Streaks, and taking a day off');
  });

  it('honours the limit', () => {
    expect(searchArticles(GROUPS, 'parent', 1)).toHaveLength(1);
  });
});

describe('over the copy that actually ships', () => {
  it('finds the parent link article by its own name', () => {
    const hits = searchArticles(HELP.groups, 'parent link');
    expect(hits[0]?.slug).toBe('the-parent-link');
  });

  it('finds an article by a word only its body carries', () => {
    const hits = searchArticles(HELP.groups, 'cancel');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((hit) => !hit.title.toLowerCase().includes('cancel'))).toBe(true);
  });

  it('finds nothing for a word the help centre does not use', () => {
    expect(searchArticles(HELP.groups, 'zzzznotaword')).toEqual([]);
  });

  it('resolves an address to an article, and an unknown one to null', () => {
    expect(findArticle(HELP.groups, 'wobo-basics', 'what-is-wobo')?.title).toBe('What is Wobo');
    expect(findArticle(HELP.groups, 'wobo-basics', 'nope')).toBeNull();
    expect(findArticle(HELP.groups, 'nope', 'what-is-wobo')).toBeNull();
  });
});
