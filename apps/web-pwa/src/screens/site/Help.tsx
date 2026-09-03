'use client';

/**
 * /help — the help centre index.
 *
 * Three groups, every article listed, and one search field. The whole help centre is thirty-three
 * short articles and they all arrive in this chunk, so search is a scan over strings already in
 * memory (`search.ts`) — no index, no request, and a result on the keystroke.
 *
 * The list is never hidden behind the search. Someone who does not know what to type sees every
 * article there is, grouped the way `help-centre/README.md` groups them; someone who does know
 * types two words and the groups give way to the answers. Nothing collapses, nothing paginates.
 *
 * Every word — the groups' names, their one-line descriptions, every article title — is the
 * reviewed copy, compiled at build time. The only strings written here are the ones the copy has no
 * equivalent for: the search field's label and the line that says how many articles matched.
 */

import { useMemo, useState } from 'react';
import { Reveal } from '../landing/Reveal';
import { HELP } from './help-content';
import { GroupMark } from './marks';
import { SiteLink } from './nav';
import { SiteShell } from './SiteShell';
import { searchArticles } from './search';

export function Help() {
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchArticles(HELP.groups, query), [query]);
  const searching = query.trim().length > 0;
  const total = HELP.groups.reduce((n, group) => n + group.articles.length, 0);

  return (
    <SiteShell current="help" title={`${HELP.title} — Wobo`} label={HELP.title}>
      <div className="lp-wrap st-hero st-hero--doc">
        <Reveal>
          <h1 className="lp-h1">{HELP.title}</h1>
          <label className="lp-eyebrow st-search-label" htmlFor="help-search">
            Search
          </label>
          <div className="st-search">
            <input
              id="help-search"
              type="search"
              autoComplete="off"
              placeholder="What do you want to do"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {searching ? (
              <button
                type="button"
                className="st-search-clear"
                onClick={() => setQuery('')}
                aria-label="Clear the search"
              >
                Clear
              </button>
            ) : null}
          </div>
          {/* A live region, so a keyboard or screen-reader visitor hears the count change instead
              of typing into a field that appears to do nothing. */}
          <p className="st-count" role="status">
            {searching
              ? `${results.length} of ${total} articles`
              : `${total} articles, in three groups`}
          </p>
        </Reveal>
      </div>

      {searching ? (
        <section className="lp-section st-section--flush" aria-label="Search results">
          <div className="lp-wrap">
            {results.length === 0 ? (
              <p className="st-empty">
                Nothing here matches that. Try one word instead of a sentence, or ask Wobo directly
                — Wobo answers from these same pages.
              </p>
            ) : (
              <div className="st-results">
                {results.map((hit) => (
                  <SiteLink
                    key={`${hit.group}/${hit.slug}`}
                    className="st-result"
                    to={{ name: 'helpArticle', group: hit.group, slug: hit.slug }}
                  >
                    <em>{hit.groupTitle}</em>
                    <b>{hit.title}</b>
                    <span>{hit.snippet}</span>
                  </SiteLink>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="lp-section st-section--flush" aria-label="Every help article">
          <div className="lp-wrap">
            <Reveal>
              <div className="st-groups">
                {HELP.groups.map((group) => (
                  <div className="st-group" key={group.slug}>
                    <GroupMark group={group.slug} />
                    <h2>{group.title}</h2>
                    <p>{group.blurb}</p>
                    <div className="st-list">
                      {group.articles.map((article) => (
                        <SiteLink
                          key={article.slug}
                          to={{ name: 'helpArticle', group: group.slug, slug: article.slug }}
                        >
                          {article.title}
                        </SiteLink>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>
      )}
    </SiteShell>
  );
}
