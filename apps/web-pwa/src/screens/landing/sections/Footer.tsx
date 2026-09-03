'use client';

/**
 * The close and the footer.
 *
 * The closing block is the page's last door — a long page needs one at the bottom or the visitor
 * has to scroll back up to act. The footer carries the legal set; those routes do not exist yet
 * (see the TODOs beside `LEGAL_LINKS` in `copy.ts`) and are written as the addresses they will
 * live at rather than as dead placeholders.
 */

import { CLOSING, FOOTER, LEGAL_LINKS } from '../copy';
import { Reveal } from '../Reveal';

export function Closing({ onStart }: { onStart: () => void }) {
  return (
    <section className="lp-section">
      <div className="lp-wrap lp-closing">
        <Reveal>
          <h2 className="lp-h2">{CLOSING.title}</h2>
          <p className="lp-lead">{CLOSING.body}</p>
          <div className="lp-cta">
            <button type="button" className="lp-btn lp-btn--pigment" onClick={onStart}>
              {CLOSING.cta}
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="lp-wrap">
      <div className="lp-footer">
        <span>{FOOTER.line}</span>
        <nav className="lp-footer-links" aria-label="Legal and contact">
          {LEGAL_LINKS.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
