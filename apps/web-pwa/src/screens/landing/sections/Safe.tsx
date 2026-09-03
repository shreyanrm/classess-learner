'use client';

/**
 * "Safe by design" — four quiet promises, each with a small drawn icon in its own pigment.
 *
 * The four are the ones a parent actually worries about, said plainly and without a badge: data,
 * pricing, neutrality, and the fact that every lesson is readable. Nothing here is a trust seal or
 * a logo wall — the claims are ours and they are written as sentences we can be held to.
 */

import type { CSSProperties } from 'react';
import { SAFE } from '../page-copy';

const ICONS = [
  // A padlock: nothing is sold on your child's data.
  <svg
    key="lock"
    viewBox="0 0 44 44"
    fill="none"
    stroke="var(--pig)"
    strokeWidth="3.5"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <rect x="8" y="18" width="28" height="20" rx="6" />
    <path d="M14 18 v-4 a8 8 0 0 1 16 0 v4" />
  </svg>,
  // A price on a shelf that does not move.
  <svg
    key="price"
    viewBox="0 0 44 44"
    fill="none"
    stroke="var(--marigold)"
    strokeWidth="3.5"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M8 30 h28 M12 30 v-10 h20 v10 M18 20 v-6 h8 v6" />
  </svg>,
  // A level cross-hair: neutral on everything that is not the syllabus.
  <svg
    key="neutral"
    viewBox="0 0 44 44"
    fill="none"
    stroke="var(--mint)"
    strokeWidth="3.5"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M8 22 h28 M22 8 v28" />
    <circle cx="22" cy="22" r="14" />
  </svg>,
  // An open eye: every lesson is yours to see.
  <svg
    key="read"
    viewBox="0 0 44 44"
    fill="none"
    stroke="var(--rose)"
    strokeWidth="3.5"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M6 22 c6 -10 26 -10 32 0 c-6 10 -26 10 -32 0 z" />
    <circle cx="22" cy="22" r="5" />
  </svg>,
];

export function Safe() {
  return (
    <section id="safe">
      <div className="wrap">
        <span className="chapter reveal">{SAFE.chapter}</span>
        <h2 className="t reveal" style={{ maxWidth: '20ch' }}>
          {SAFE.title}
        </h2>
        <div className="safegrid">
          {SAFE.tiles.map((tile, i) => (
            <div className="rise" key={tile.title} style={{ '--i': i + 1 } as CSSProperties}>
              {ICONS[i]}
              <div>
                <b>{tile.title}</b>
                {tile.body}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
