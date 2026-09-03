'use client';

/**
 * The header: the owner's wordmark, the pill nav, and the two doors.
 *
 * Fixed and frosted, at the prototype's 72px. It is rendered into a PORTAL at the front of the
 * document body rather than inside the page, because the app wraps every screen in an element
 * carrying `will-change: transform` — which makes that element the containing block for anything
 * `position: fixed`, and a header left inside it would scroll away with the page instead of
 * staying put. The portal host carries the same `.wb` root class, so every token and every rule in
 * `styles.ts` still applies.
 *
 * The nav's four anchors are on this page; Plans is a real route. Sign in and Get started both open
 * Wobo's onboarding, which is where the sign-in beat lives.
 *
 * Nothing in here wears `.reveal`. The prototype faded the header in with the rest of the first
 * fold; here the header lives outside the page root the scroll engine settles, and a bar that fades
 * itself in is chrome animating for its own sake, which DESIGN.md law 5 says not to do.
 */

import { Wordmark } from '../art';
import { LandingLink } from '../link';
import { AUTH, NAV_LINKS } from '../page-copy';

export function Header({ onStart, onSignIn }: { onStart: () => void; onSignIn: () => void }) {
  return (
    <header>
      <div className="wrap">
        <a className="wordmark" href="#hero" aria-label="Wobo home">
          <Wordmark />
        </a>
        <nav className="main" aria-label="Site">
          {NAV_LINKS.map((link) => (
            <LandingLink key={link.href} href={link.href}>
              {link.label}
            </LandingLink>
          ))}
        </nav>
        <div className="right">
          <button type="button" className="sign" onClick={onSignIn}>
            {AUTH.signIn}
          </button>
          <button type="button" className="btn" onClick={onStart}>
            {AUTH.getStarted}
          </button>
        </div>
      </div>
    </header>
  );
}
