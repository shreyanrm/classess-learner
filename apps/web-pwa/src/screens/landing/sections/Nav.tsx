'use client';

/**
 * The top bar. Four anchors to the four things this page has to say, the wordmark, and the two
 * doors. Sticky and frosted, because the page is long and the door has to stay reachable — frost
 * on an overlay is the one place DESIGN.md §2 allows depth that is not a hairline.
 *
 * The wordmark is `WoboWordmark`, the living one, whose two o's are Wobo's own eyes. It is the only
 * mark the product has: the older `ui/Logo` drew a different Wobo — flat counters plus a small
 * ultramarine spark — and a product with two logos has none. The spark went with it, because on a
 * page whose whole argument is that ultramarine is the ink Wobo draws in, a decorative spark of the
 * same pigment had no third reason to exist (WOBO-PLAN §15).
 *
 * At 680px and under the anchors move to a second, sideways-scrolling row rather than vanishing;
 * the CSS for that lives in `styles.ts`, and the markup below is the same at every width.
 *
 * Sign in and start free both open Wobo's onboarding flow, which is where the sign-in beat lives;
 * there are no separate `/sign-in` and `/sign-up` routes to link to yet.
 */

import { WoboWordmark } from '@wobo/wobo';
import { AUTH, NAV_LINKS } from '../copy';

export function Nav({ onStart, onSignIn }: { onStart: () => void; onSignIn: () => void }) {
  return (
    <header className="lp-nav">
      <div className="lp-wrap lp-nav-inner">
        <a className="lp-mark" href="#top" aria-label="Wobo, back to the top">
          <WoboWordmark height={20} />
        </a>
        <nav className="lp-nav-links" aria-label="Sections of this page">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
        <div className="lp-nav-right">
          <button type="button" className="lp-btn lp-btn--ghost" onClick={onSignIn}>
            {AUTH.signIn}
          </button>
          <button type="button" className="lp-btn lp-btn--pigment" onClick={onStart}>
            {AUTH.signUp}
          </button>
        </div>
      </div>
    </header>
  );
}
