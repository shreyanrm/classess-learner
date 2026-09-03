'use client';

/**
 * /help/<group>/<slug> — one help article.
 *
 * The article obeys the shape `help-centre/README.md` sets: the first line is a complete answer on
 * its own, so it is set larger than the body and nothing sits above it but the breadcrumb. Under it
 * the body, then the article the copy itself points at next, resolved to a real address at build
 * time rather than being a sentence naming a page you then have to go and find.
 *
 * "Ask Wobo about this" is the entry the help centre is really for. Wobo answers from this content
 * first, so the button hands Wobo the article and opens the conversation — for a signed-in learner
 * the question is asked on the way, and for a visitor who is not signed in the same button opens
 * the door where signing in happens, because sending an unauthenticated turn at the gateway would
 * fail silently and look like Wobo ignoring them.
 *
 * An address that names no article does not 404 into nothing: the help centre is one tap away and
 * the page says so.
 */

import { useEffect } from 'react';
import { useRouter } from '../../shell/router';
import { useSdk } from '../../store/sdk';
import { useWoboChat } from '../../wobo/chat';
import { Reveal } from '../landing/Reveal';
import { Prose, Runs } from './Doc';
import { HELP } from './help-content';
import { SiteLink } from './nav';
import { SiteShell } from './SiteShell';
import { findArticle } from './search';

/** What Wobo is handed when the reader asks about an article. */
export function askPrompt(title: string, lead: string): string {
  return `I am reading the help article "${title}". ${lead} Explain it to me, and show me on my own account.`;
}

export function HelpArticle({ group, slug }: { group: string; slug: string }) {
  const article = findArticle(HELP.groups, group, slug);
  const groupDoc = HELP.groups.find((g) => g.slug === group);
  const router = useRouter();
  const sdk = useSdk();
  const chat = useWoboChat();

  // A fresh document starts at its top. Without this, arriving from halfway down the index leaves
  // the reader halfway down the article they just opened.
  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  }, []);

  if (!article || !groupDoc) {
    return (
      <SiteShell current="help" title={`${HELP.title} — Wobo`} label={HELP.title}>
        <div className="lp-wrap st-hero">
          <h1 className="lp-h1" style={{ maxWidth: '16ch' }}>
            That page is not here
          </h1>
          <p className="lp-lead">
            The address does not match an article we publish. Everything the help centre has is on
            one page.
          </p>
          <div className="lp-cta" style={{ marginTop: 24 }}>
            <SiteLink className="lp-btn lp-btn--pigment" to={{ name: 'help' }}>
              Open the help centre
            </SiteLink>
          </div>
        </div>
      </SiteShell>
    );
  }

  const lead = article.lead.map((run) => run.v).join('');
  const signedIn = sdk.config.devAuth || sdk.identity.isAuthenticated();
  const askWobo = () => {
    if (!signedIn) {
      router.navigate({ name: 'onboarding' });
      return;
    }
    void chat.ask(askPrompt(article.title, lead));
    router.navigate({ name: 'chat' });
  };

  return (
    <SiteShell current="help" title={`${article.title} — Wobo`} label={article.title}>
      <div className="lp-wrap" style={{ paddingBlock: 'clamp(28px, 4vw, 52px)' }}>
        <nav className="st-crumbs" aria-label="Where this page sits">
          <SiteLink to={{ name: 'help' }}>{HELP.title}</SiteLink>
          <span aria-hidden>·</span>
          <b>{groupDoc.title}</b>
        </nav>

        <div className="st-article">
          <article>
            <Reveal>
              <h1 className="lp-h2" style={{ marginBottom: 18 }}>
                {article.title}
              </h1>
              {article.lead.length > 0 ? (
                <p className="st-lead">
                  <Runs runs={article.lead} />
                </p>
              ) : null}
              <Prose blocks={article.blocks} />
              {article.next ? (
                <div className="st-next">
                  <span>Next</span>
                  <SiteLink
                    to={{
                      name: 'helpArticle',
                      group: article.next.group,
                      slug: article.next.slug,
                    }}
                  >
                    {article.next.title}
                  </SiteLink>
                </div>
              ) : null}
            </Reveal>
          </article>

          <div>
            <div className="st-aside">
              <h2>More in {groupDoc.title.toLowerCase()}</h2>
              <div className="st-list">
                {groupDoc.articles.map((other) => (
                  <SiteLink
                    key={other.slug}
                    to={{ name: 'helpArticle', group: groupDoc.slug, slug: other.slug }}
                    current={other.slug === article.slug}
                  >
                    {other.title}
                  </SiteLink>
                ))}
              </div>
              <div className="st-ask">
                <p>
                  {signedIn
                    ? 'Wobo answers from these pages, and can show you on your own account.'
                    : 'Wobo answers from these pages. Sign in and ask on your own account.'}
                </p>
                <button type="button" className="lp-btn lp-btn--pigment" onClick={askWobo}>
                  Ask Wobo about this
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
