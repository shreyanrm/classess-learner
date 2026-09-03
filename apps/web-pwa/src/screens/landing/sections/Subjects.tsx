'use client';

/**
 * "Every subject" — the four drawn subject icons, each on its own tinted plate.
 *
 * The heading says what the page is allowed to say about the curriculum and no more: tell Wobo the
 * board and the class once, and it teaches what your school teaches. HOW that works is not on this
 * page and never will be (WOBO-PLAN §16) — the mechanism is the thing nobody else has, and a
 * landing page is where a competitor reads first.
 */

import type { CSSProperties } from 'react';
import { LandingLink } from '../link';
import { SUBJECTS } from '../page-copy';

const ICONS = [
  // Mathematics: a triangle with its altitude drawn in marigold.
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
  // Science: a flask with its liquid line in Wobo blue.
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
  // Social science: a globe.
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
  // English: a page with three lines of writing on it.
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
              {SUBJECTS.titleBefore}
              <span className="hl">{SUBJECTS.titleHighlight}</span>
              {SUBJECTS.titleAfter}
            </h2>
          </div>
          <p className="reveal">{SUBJECTS.lead}</p>
        </div>
        <div className="subs">
          {SUBJECTS.tiles.map((tile, i) => (
            <LandingLink
              key={tile.name}
              className="subj rise"
              href={tile.href}
              style={{ '--i': i + 1 } as CSSProperties}
            >
              <div className="ic">{ICONS[i]}</div>
              <div>
                <b>{tile.name}</b>
                <span>{tile.span}</span>
              </div>
            </LandingLink>
          ))}
        </div>
      </div>
    </section>
  );
}
