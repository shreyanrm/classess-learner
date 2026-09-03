'use client';

/**
 * The footer: the wordmark, the wake phrase, four columns, and the small print.
 *
 * Every address here is a real one — the legal set points at the documents in `docs/legal`, help and
 * contact at their own screens, plans and gift at theirs. The prototype's `#schools` had nowhere to
 * go, so it goes to contact, which is where a school would actually be answered.
 */

import { FOOTER } from './copy';
import { Wordmark } from './defs';
import { PageLink } from './links';

export function PageFooter() {
  return (
    <footer>
      <div className="wrap">
        <div className="grid">
          <div>
            <PageLink className="wordmark" href="/" aria-label={FOOTER.home}>
              <Wordmark />
            </PageLink>
            <p className="tag">{FOOTER.line}</p>
          </div>
          {FOOTER.columns.map((column) => (
            <div key={column.heading}>
              <h4>{column.heading}</h4>
              {column.links.map((link) => (
                <PageLink key={link.label} href={link.href}>
                  {link.label}
                </PageLink>
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
