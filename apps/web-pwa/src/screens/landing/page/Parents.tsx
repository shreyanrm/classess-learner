'use client';

/**
 * For parents — four promises, each one a thing the product will not do.
 *
 * They are written as constraints rather than as features on purpose. "No ads" is checkable; "we
 * care about your child" is not, and a parent reading a page at 11 pm can tell the difference.
 */

import { PARENTS } from './copy';

/** One drawn icon per promise: a lock, a price tag, a compass, an open eye. */
const ICONS = [
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
  <svg
    key="compass"
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
  <svg
    key="eye"
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

export function Parents() {
  return (
    <section id="parents">
      <div className="wrap">
        <span className="chapter reveal">{PARENTS.chapter}</span>
        <h2 className="t reveal" style={{ maxWidth: '20ch' }}>
          {PARENTS.title}
        </h2>
        <div className="quiet">
          {PARENTS.tiles.map((tile, i) => (
            <div className="rise" key={tile.title}>
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
