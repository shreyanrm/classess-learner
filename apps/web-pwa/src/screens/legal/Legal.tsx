'use client';

/**
 * The legal set on the web: an index at `/legal`, one page per document at `/legal/<slug>`, and a
 * contact page at `/legal/contact`.
 *
 * The pages render `docs/legal/**` and nothing else. Three things they add, and why each is
 * honest rather than decorative:
 *
 *  · a draft notice. `docs/legal/README.md` says plainly that none of these documents has been read
 *    by a lawyer and that nothing should be published until the review checklist is done. A site
 *    that showed them as settled terms would be the first lie in the product, so the state is
 *    stated at the top of every page, with the number of questions still open for counsel.
 *  · a table of contents. These are long documents and a reader usually arrives looking for one
 *    section — refunds, what happens to a child's data, how to cancel.
 *  · print rules. A parent who wants to keep the terms should get a clean page, not a screenshot of
 *    a navigation bar (`SiteShell.tsx`).
 *
 * The contact page carries no new promises: it lists the mailboxes the documents themselves name.
 */

import { useEffect } from 'react';
import { useRouter } from '../../shell/router';
import { SiteLink } from '../site/nav';
import { SiteShell } from '../site/SiteShell';
import { canonicalSlug, legalPath, spansText } from './catalog';
import { documentSlugs, legalDocument, legalIndex, setDrafted } from './docs';
import { documentBody } from './markdown';
import { Markdown, PlainWords } from './Prose';

/** The one line that says what these pages are. */
const INTRO =
  'Everything Wobo has to tell a learner and a parent: how the product works, what it does with their information, what it costs, and what it will not do.';

/** Stated on every page, because it is true of every document here. */
function DraftNotice({ drafted, reviews }: { drafted: string | null; reviews?: number }) {
  return (
    <aside className="lp-panel" aria-label="The state of these documents">
      <p className="lp-mark">Draft</p>
      <p style={{ marginTop: 8 }}>
        {drafted ? `Drafted ${drafted}. ` : ''}Written by the Wobo team and not yet reviewed by a
        lawyer.
        {typeof reviews === 'number' && reviews > 0
          ? ` ${reviews} question${reviews === 1 ? '' : 's'} in this document are still open for counsel, and they are not shown here.`
          : ' Nothing on this page can be relied on as final until that review is done.'}
      </p>
    </aside>
  );
}

/** `/legal` — the ten documents, described in the README's own words. */
function Index() {
  const rows = legalIndex();
  return (
    <>
      <section className="lp-wrap lp-head">
        <p className="lp-eyebrow">Legal</p>
        <h1 className="lp-h1x">The legal set.</h1>
        <p className="lp-lead">{INTRO}</p>
        <div style={{ marginTop: 26, maxWidth: 640 }}>
          <DraftNotice drafted={setDrafted()} />
        </div>
      </section>
      <section className="lp-wrap" style={{ paddingBottom: 'clamp(56px, 8vw, 96px)' }}>
        <div className="lp-rows">
          {rows.map((row) => {
            const doc = legalDocument(row.slug);
            return (
              <SiteLink key={row.slug} href={legalPath(row.slug)} className="lp-row">
                <p className="lp-row-title">{doc?.shape.title ?? row.slug}</p>
                <p className="lp-row-what">{spansText(row.what)}</p>
                <p className="lp-row-who">{spansText(row.who)}</p>
              </SiteLink>
            );
          })}
          <SiteLink href="/contact" className="lp-row">
            <p className="lp-row-title">How to reach us</p>
            <p className="lp-row-what">
              Every mailbox these documents name, and a message straight to a person.
            </p>
            <p className="lp-row-who">anyone with a question</p>
          </SiteLink>
        </div>
      </section>
    </>
  );
}

/** `/legal/<slug>` — one document, with its contents beside it. */
function Document({ slug }: { slug: string }) {
  const doc = legalDocument(slug);
  const known = documentSlugs();
  if (!doc) return <NotFound slug={slug} />;
  const { shape } = doc;
  return (
    <>
      <section className="lp-wrap lp-head">
        <p className="lp-crumb">
          <SiteLink href={legalPath()}>Legal</SiteLink>
          <span aria-hidden>/</span>
          {shape.title ?? slug}
        </p>
        <h1 className="lp-h1x">{shape.title ?? slug}</h1>
        <p className="lp-meta">
          {shape.drafted ? (
            <span>
              Drafted <b>{shape.drafted}</b>
            </span>
          ) : null}
          {shape.version ? (
            <span>
              Version <b>{shape.version}</b>
            </span>
          ) : null}
          <span>
            <b>{doc.reviews}</b> question{doc.reviews === 1 ? '' : 's'} open for counsel
          </span>
        </p>
      </section>
      <div className="lp-wrap lp-doc">
        <nav className="lp-toc lp-print-hide" aria-label="Sections of this document">
          <p className="lp-mark">Contents</p>
          <ol>
            {shape.contents.map((heading) => (
              <li key={heading.id}>
                <a href={`#${heading.id}`}>{heading.text}</a>
              </li>
            ))}
          </ol>
        </nav>
        <article className="lp-prose">
          <DraftNotice drafted={shape.drafted} reviews={doc.reviews} />
          {shape.plainWords ? (
            <div style={{ marginTop: 26 }}>
              <PlainWords paragraphs={shape.plainWords} known={known} />
            </div>
          ) : null}
          <Markdown blocks={documentBody(doc.blocks)} known={known} />
        </article>
      </div>
    </>
  );
}

/**
 * `/legal/contact` is an ALIAS of `/contact`, not a second contact page.
 *
 * There were two: this one listed the mailboxes the documents name, and `/contact` composed a
 * message to one of them. Two pages doing one job means a visitor finds whichever the page they
 * happened to be on links to, and the landing footer and the legal index disagreed about which
 * that was. The address is kept because it is published in the landing footer and in the documents
 * themselves; it now replaces itself with the real page, so nothing that already links here breaks
 * and the back button does not bounce.
 */
function ContactAlias() {
  const router = useRouter();
  useEffect(() => {
    router.replace({ name: 'contact' });
  }, [router]);
  return (
    <section className="lp-wrap lp-head" style={{ paddingBottom: 'clamp(56px, 8vw, 96px)' }}>
      <h1 className="lp-h1x">How to reach us.</h1>
      <p className="lp-lead">
        Taking you to the contact page, where every mailbox is listed and you can write to one.
      </p>
      <div className="lp-cta" style={{ marginTop: 24 }}>
        <SiteLink href="/contact" className="lp-btn lp-btn--pigment">
          Open the contact page
        </SiteLink>
      </div>
    </section>
  );
}

/** An address that is not one of ours: say so, and offer the way back. */
function NotFound({ slug }: { slug: string }) {
  return (
    <section className="lp-wrap lp-head" style={{ paddingBottom: 'clamp(56px, 8vw, 96px)' }}>
      <h1 className="lp-h1x">There is no document at that address.</h1>
      <p className="lp-lead">
        Nothing in the legal set is called <code>{slug}</code>. The ten documents are listed on the
        index.
      </p>
      <div className="lp-cta" style={{ marginTop: 24 }}>
        <SiteLink href={legalPath()} className="lp-btn lp-btn--pigment">
          The legal set
        </SiteLink>
      </div>
    </section>
  );
}

/** The screen. No slug is the index; `contact` is the contact page; anything else is a document. */
export function Legal({ slug }: { slug?: string }) {
  const canonical = slug ? canonicalSlug(slug) : '';
  const title = canonical
    ? `${legalDocument(canonical)?.shape.title ?? 'Legal'} — Wobo`
    : 'The legal set — Wobo';
  return (
    <SiteShell current="legal" title={title}>
      {!canonical ? (
        <Index />
      ) : canonical === 'contact' ? (
        <ContactAlias />
      ) : (
        <Document slug={canonical} />
      )}
    </SiteShell>
  );
}
