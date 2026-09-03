'use client';

/**
 * The subjects grid — four drawn icons, and the claim above them.
 *
 * The heading says every subject your school teaches, THE WAY your school teaches it, and stops
 * there. How that works is not on this page and never will be: the mechanism is the product's, and
 * the page's job is to be believed, not to explain itself.
 */

import { SUBJECTS } from './copy';
import { PageLink } from './links';

/** The four icons, drawn rather than picked from a set. Index matches `SUBJECTS.items`. */
const ICONS = [
  <svg
    key="maths"
    viewBox="0 0 64 64"
    fill="none"
    stroke="var(--pig)"
    strokeWidth="4"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 50 L30 14 L52 50 Z" />
    <path d="M30 14 L30 50" stroke="var(--marigold)" />
  </svg>,
  <svg
    key="science"
    viewBox="0 0 64 64"
    fill="none"
    stroke="var(--mint)"
    strokeWidth="4"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M24 10 h16 M28 10 v16 l-14 24 a6 6 0 0 0 5 9 h26 a6 6 0 0 0 5 -9 l-14 -24 v-16" />
    <path d="M22 42 h20" stroke="var(--pig)" />
  </svg>,
  <svg
    key="social"
    viewBox="0 0 64 64"
    fill="none"
    stroke="var(--rose)"
    strokeWidth="4"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="32" cy="32" r="20" />
    <path d="M12 32 h40 M32 12 c-10 10 -10 30 0 40 c10 -10 10 -30 0 -40" />
  </svg>,
  <svg
    key="english"
    viewBox="0 0 64 64"
    fill="none"
    stroke="var(--lilac)"
    strokeWidth="4"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M14 14 h36 v36 h-36 z" />
    <path d="M22 26 h20 M22 34 h20 M22 42 h12" stroke="var(--pig)" />
  </svg>,
];

export function Subjects() {
  return (
    <section id="subjects">
      <div className="wrap">
        <div className="head">
          <div>
            <span className="chapter reveal">{SUBJECTS.chapter}</span>
            <h2 className="t reveal">
              {SUBJECTS.headBefore}
              <span className="hl">{SUBJECTS.headSwept}</span>
            </h2>
          </div>
          <p className="reveal">{SUBJECTS.lead}</p>
        </div>
        <div className="subs">
          {SUBJECTS.items.map((item, i) => (
            <PageLink className="sub rise" key={item.label} href={item.href}>
              <div className="ic">{ICONS[i]}</div>
              <div>
                <b>{item.label}</b>
                <span>{item.note}</span>
              </div>
            </PageLink>
          ))}
        </div>
      </div>
    </section>
  );
}
