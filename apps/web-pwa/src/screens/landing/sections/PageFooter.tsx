'use client';

/**
 * The footer: the wordmark, the one-line tagline, and four columns of real addresses.
 *
 * Every href here is a route that exists — the legal set at its full slugs, the help centre,
 * contact, the security page. A footer is where a reader goes to check whether a company is real,
 * so a dead link in it costs more than a dead link anywhere else on the page.
 */

import { LandingLink } from '../link';
import { FOOTER } from '../page-copy';

export function PageFooter() {
  return (
    <footer>
      <div className="wrap grid">
        <div>
          <div className="wm">
            {/* The prototype's own 110px box: the height comes from the stylesheet, and this
                letterboxes the mark inside a column that is wider than it. */}
            <svg viewBox="0 0 1160 340" style={{ width: 110 }} aria-hidden="true">
              <use href="#wm" />
            </svg>
          </div>
          <p style={{ marginTop: 12, maxWidth: '30ch' }}>{FOOTER.tagline}</p>
        </div>
        {FOOTER.columns.map((column) => (
          <div key={column.heading}>
            <b>{column.heading}</b>
            {column.links.map((link) => (
              <LandingLink key={`${link.href}-${link.label}`} href={link.href}>
                {link.label}
              </LandingLink>
            ))}
          </div>
        ))}
      </div>
    </footer>
  );
}
