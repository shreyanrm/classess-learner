/**
 * Help-centre search.
 *
 * Thirty-three short articles, all of them already in memory as the page's own chunk, so this is
 * a scan and not an index. That is the honest engineering answer at this size: a search index would
 * be more code, more build, and slower to a first result than looping over thirty-three strings.
 *
 * The rules it encodes, each of which is a thing a reader would otherwise notice:
 *
 *  · every word of the query has to appear somewhere in the article. A search for "parent link"
 *    that returns everything mentioning "parent" is a list, not an answer.
 *  · a hit in the title outranks a hit in the opening line, which outranks a hit in the body. What
 *    someone types is usually the name of the thing.
 *  · a tie is broken by the article's own order in its group, never by chance, so the same query
 *    always returns the same list in the same order.
 *  · the snippet is the sentence the match is in, not the first sentence of the article, so the
 *    reader can see why the result is there before opening it.
 */

import type { HelpArticle, HelpGroup } from './markdown';
import { inlineText } from './markdown';

export interface SearchHit {
  group: string;
  groupTitle: string;
  slug: string;
  title: string;
  /** The sentence the match sits in, or the article's opening line where the title matched. */
  snippet: string;
}

/** The words of a query. One-letter fragments match everything, so they are dropped. */
export function queryTerms(query: string): string[] {
  return [
    ...new Set(
      query
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((term) => term.length >= 2),
    ),
  ];
}

/** How well one article answers a query, or 0 where it does not answer it at all. */
export function scoreArticle(article: HelpArticle, terms: readonly string[]): number {
  if (terms.length === 0) return 0;
  const title = article.title.toLowerCase();
  const lead = inlineText(article.lead).toLowerCase();
  let score = 0;
  for (const term of terms) {
    // Every term must land somewhere. One miss and the article is not an answer to this question.
    if (!article.text.includes(term)) return 0;
    if (title.includes(term)) score += title.startsWith(term) ? 12 : 8;
    if (lead.includes(term)) score += 3;
    score += 1;
  }
  return score;
}

/**
 * The sentence a term first appears in, trimmed to something a result row can hold. Matching is
 * case-insensitive but the slice comes out of the original, so a result row reads as a sentence
 * rather than as an index entry.
 */
export function snippetFor(text: string, terms: readonly string[], limit = 160): string {
  const hay = text.toLowerCase();
  const at = terms
    .map((term) => hay.indexOf(term))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b)[0];
  if (at === undefined) return text.slice(0, limit).trim();
  const start = Math.max(0, text.lastIndexOf('.', at) + 1);
  const dot = text.indexOf('.', at);
  const end = dot === -1 ? text.length : dot + 1;
  const sentence = text.slice(start, end).trim();
  if (sentence.length <= limit) return sentence;
  const from = Math.max(start, at - Math.floor(limit / 3));
  return `${from > start ? '…' : ''}${text.slice(from, from + limit).trim()}…`;
}

/**
 * The articles that answer a query, best first. An empty query returns nothing rather than
 * everything — the groups are already on the page, and a search field that dumps the whole help
 * centre the moment it is focused is noise.
 */
export function searchArticles(
  groups: readonly HelpGroup[],
  query: string,
  limit = 12,
): SearchHit[] {
  const terms = queryTerms(query);
  if (terms.length === 0) return [];
  const scored: { hit: SearchHit; score: number; order: number }[] = [];
  let order = 0;
  for (const group of groups) {
    for (const article of group.articles) {
      const position = order++;
      const score = scoreArticle(article, terms);
      if (score === 0) continue;
      // Where the query only matched the TITLE, quoting the body would show a sentence with none
      // of the words the reader typed in it. The opening line is the better answer there.
      const body = article.plain.toLowerCase();
      const inBody = terms.some((term) => body.includes(term));
      scored.push({
        score,
        order: position,
        hit: {
          group: group.slug,
          groupTitle: group.title,
          slug: article.slug,
          title: article.title,
          snippet: inBody ? snippetFor(article.plain, terms) : inlineText(article.lead),
        },
      });
    }
  }
  scored.sort((a, b) => b.score - a.score || a.order - b.order);
  return scored.slice(0, limit).map((s) => s.hit);
}

/** Every article across the three groups, in reading order. */
export function allArticles(groups: readonly HelpGroup[]): HelpArticle[] {
  return groups.flatMap((group) => group.articles);
}

/** One article by address, or null where the address names nothing we publish. */
export function findArticle(
  groups: readonly HelpGroup[],
  group: string,
  slug: string,
): HelpArticle | null {
  return groups.find((g) => g.slug === group)?.articles.find((a) => a.slug === slug) ?? null;
}
