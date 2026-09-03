'use client';

/**
 * The footer: the wordmark, the wake line, four columns, and the small print.
 *
 * The addresses are real routes wherever the route exists (`/plans`, `/gift`, `/help`, `/contact`,
 * `/about`, and the legal set through its short aliases), and in-page anchors where the thing being
 * linked to is a chapter of this page. `/security` is Wave 7b's page (docs/SITE.md §3), written at
 * the address it will live at rather than as a dead anchor — the same call the legal set got before
 * it existed either.
 */

import { Wordmark } from '../art';
import { LandingLink } from '../link';
import { FOOTER } from '../page-copy';

export function PageFooter() {
  return (
    <footer>
      <div className="wrap">
        <div className="grid">
          <div>
            <a className="wordmark" href="#hero" aria-label="Wobo">
              <Wordmark />
            </a>
            <p
              style={{
                color: 'var(--ink-3)',
                fontSize: 14,
                marginTop: 12,
                maxWidth: '30ch',
              }}
            >
              {FOOTER.tagline}
            </p>
          </div>
          {FOOTER.columns.map((column) => (
            <div key={column.heading}>
              <h4>{column.heading}</h4>
              {column.links.map((link) => (
                <LandingLink key={link.label} href={link.href}>
                  {link.label}
                </LandingLink>
              ))}
            </div>
          ))}
        </div>
        <div className="small">
          {FOOTER.small.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
      </div>
    </footer>
  );
}
