'use client';

/**
 * THE shell every public page wears: /about, /help and every article, the legal set, /plans,
 * /plans/checkout, /gift and /contact.
 *
 * There used to be two of these, one in `site/` and one in `legal/`, with different link sets, a
 * skip link on only one of them, and — because both injected a `<style>` under the id `wobo-site`
 * — a stylesheet that silently belonged to whichever half the visitor opened first. One shell is
 * the fix for all three at once.
 *
 * The landing page is the visual parent, so this composes it rather than restating it: the landing
 * stylesheet (loaded first by `ensureSiteStyles`), the landing's ink cursor with the same
 * environment rules, the landing's own footer line, and the `.lp` scope that carries the wrap, the
 * section rhythm, the buttons and the frosted sticky bar.
 *
 * One thing is composed here rather than imported: the top bar. The landing page's `Nav` links to
 * its own four sections (`#teaches`, `#demo`, `#boards`, `#plans`) and takes no link list, so
 * rendering it on a document page would ship four anchors that go nowhere. This bar is the same
 * element, the same classes and the same two doors — its links are `PUBLIC_LINKS`, every public
 * page, so any page reaches any other. If `Nav` ever accepts its links as a prop, this should
 * import it and delete the markup.
 *
 * The ink FIELD is deliberately absent. It is a WebGL loop behind a page someone reads for thirty
 * seconds; behind a page someone reads for five minutes it is drifting texture under body copy and
 * a battery cost with no purpose.
 */

import { type ReactNode, useEffect, useState } from 'react';
import { useRouter } from '../../shell/router';
import { WoboLogo } from '../../ui/Logo';
import { AUTH, FOOTER, LEGAL_LINKS } from '../landing/copy';
import { InkCursor, inkCursorAllowed, readCursorEnvironment } from '../landing/cursor';
import { PUBLIC_LINKS, SiteLink, type SiteSection } from './nav';
import { ensureSiteStyles } from './styles';

// The chunk arriving IS the page being opened, so the stylesheets go in at import time — an effect
// would let the first paint land unstyled for a frame.
ensureSiteStyles();

export type { SiteSection };

/**
 * The legal shortcuts the landing footer already publishes, minus the ones the public link list
 * covers. `/legal/contact` is one of those: it is now an alias of `/contact`, so listing it beside
 * Contact would put the same page in the footer twice.
 */
const FOOTER_LEGAL = LEGAL_LINKS.filter(
  (link) => !PUBLIC_LINKS.some((p) => p.href === link.href) && link.href !== '/legal/contact',
);

/** The live value of a `--wobo-*` token, so the nib follows the theme. */
function token(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/** Set the tab's title while a public page is open, and put it back on the way out. */
function useTitle(title: string): void {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}

export function SiteShell({
  children,
  current,
  title,
  label,
}: {
  children: ReactNode;
  /** Which top-bar link is the page being read, for `aria-current`. */
  current?: SiteSection;
  /** The tab's title. */
  title: string;
  /** The accessible name of the page's main region. Defaults to the title. */
  label?: string;
}) {
  const router = useRouter();
  const [ink, setInk] = useState('#1F35E0');
  const [pen, setPen] = useState(false);
  useTitle(title);

  useEffect(() => {
    setInk(token('--wobo-ultramarine', '#1F35E0'));
    setPen(inkCursorAllowed(readCursorEnvironment()));
    window.scrollTo({ top: 0 });
  }, []);

  // Every door on a public page leads where the landing page's doors lead: Wobo's onboarding, which
  // is where the sign-in beat lives.
  const start = () => router.navigate({ name: 'onboarding' });

  return (
    <div className="lp st">
      {pen ? <InkCursor ink={ink} /> : null}
      <a className="st-skip" href="#site-main">
        Skip to the page
      </a>
      <div className="lp-body st-page">
        <header className="lp-nav lp-print-hide">
          <div
            className="lp-wrap"
            style={{
              alignItems: 'center',
              display: 'flex',
              gap: 20,
              justifyContent: 'space-between',
            }}
          >
            <SiteLink
              to={{ name: 'landing' }}
              className="lp-home"
              aria-label="Wobo, the front page"
            >
              <WoboLogo height={18} />
            </SiteLink>
            <nav className="lp-nav-links st-nav-links" aria-label="Wobo's public pages">
              {PUBLIC_LINKS.map((link) => (
                <SiteLink key={link.href} href={link.href} current={current === link.section}>
                  {link.label}
                </SiteLink>
              ))}
            </nav>
            <div className="lp-nav-right">
              <button type="button" className="lp-btn lp-btn--ghost" onClick={start}>
                {AUTH.signIn}
              </button>
              <button type="button" className="lp-btn lp-btn--pigment" onClick={start}>
                {AUTH.signUp}
              </button>
            </div>
          </div>
        </header>
        <main id="site-main" className="st-main" aria-label={label ?? title}>
          {children}
        </main>
        <footer className="lp-wrap lp-print-hide">
          <div className="lp-footer">
            <span>{FOOTER.line}</span>
            <nav className="lp-footer-links" aria-label="Wobo, legal and contact">
              {[...PUBLIC_LINKS, ...FOOTER_LEGAL].map((link) => (
                <SiteLink key={link.href} href={link.href}>
                  {link.label}
                </SiteLink>
              ))}
            </nav>
          </div>
        </footer>
      </div>
    </div>
  );
}
