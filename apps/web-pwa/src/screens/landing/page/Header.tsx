'use client';

/**
 * The header: the owner's wordmark, the pill nav, and the two doors.
 *
 * It is `position: fixed`, and the app wraps every screen in an element carrying
 * `will-change: transform`, which makes that wrapper the containing block for fixed descendants —
 * so a header rendered in place would scroll away with the page. `Landing.tsx` portals this into
 * `document.body`, which is why the root carries `lv6` itself: the palette tokens hang off that
 * class, and out in the body there is nothing else to inherit them from.
 */

import { HEADER, NAV } from './copy';
import { Wordmark } from './defs';
import { PageLink } from './links';

export function Header({ onStart, onSignIn }: { onStart: () => void; onSignIn: () => void }) {
  return (
    <header className="lv6 lv6-header">
      <div className="wrap">
        <PageLink className="wordmark lift" href="/" aria-label={HEADER.home}>
          <Wordmark />
        </PageLink>
        <nav className="main lift" aria-label={HEADER.navLabel}>
          {NAV.map((link) => (
            <PageLink key={link.label} href={link.href}>
              {link.label}
            </PageLink>
          ))}
        </nav>
        <div className="right lift">
          <button type="button" className="sign" onClick={onSignIn}>
            {HEADER.signIn}
          </button>
          <button type="button" className="btn" onClick={onStart}>
            {HEADER.start}
          </button>
        </div>
      </div>
    </header>
  );
}
