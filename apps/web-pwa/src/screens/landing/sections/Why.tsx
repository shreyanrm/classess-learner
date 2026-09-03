'use client';

/**
 * "Why it clicks" — three promise tiles with drawn icons.
 *
 * Each icon is a small drawing on its own tinted card, in that promise's pigment: the board being
 * drawn on in Wobo blue, the checked list in mint, Wobo's own head under a coral smile. Drawn, not
 * iconography — DESIGN.md law 7, and the reason none of these is a stroke-weight glyph from a set.
 */

import type { CSSProperties } from 'react';
import { WoboHeadGroup } from '../art';
import { WHY } from '../page-copy';

const ICONS = [
  // It draws, it doesn't dictate: a board with a triangle half drawn and the pen still on it.
  <>
    <rect x="10" y="14" width="76" height="60" rx="14" fill="var(--pig-w)" />
    <path
      d="M26 62 L58 62 L58 30 Z"
      fill="none"
      stroke="var(--ink)"
      strokeWidth="4"
      strokeLinejoin="round"
    />
    <path d="M26 62 L58 30" stroke="var(--pig)" strokeWidth="4" strokeLinecap="round" />
    <g transform="translate(70 58) rotate(-30)">
      <rect x="-4" y="-30" width="8" height="26" rx="3" fill="var(--ink)" />
      <path d="M-4 -4 l4 10 l4 -10 z" fill="var(--pig)" />
    </g>
  </>,
  // Your school's chapter, this week: a list with the week's line ticked in mint.
  <>
    <rect x="10" y="14" width="76" height="60" rx="14" fill="var(--mint-w)" />
    <path
      d="M28 30 h40 M28 44 h40 M28 58 h24"
      stroke="var(--ink)"
      strokeWidth="4"
      strokeLinecap="round"
    />
    <circle cx="72" cy="58" r="9" fill="var(--mint)" />
    <path
      d="M68 58 l3 3 l6 -7"
      fill="none"
      stroke="var(--paper)"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </>,
  // It never makes you feel small: Wobo, and a coral smile drawn under.
  <>
    <rect x="10" y="14" width="76" height="60" rx="14" fill="var(--rose-w)" />
    <WoboHeadGroup transform="translate(24 20) scale(.4)" />
    <path
      d="M22 76 c10 -10 42 -10 52 0"
      fill="none"
      stroke="var(--rose)"
      strokeWidth="4"
      strokeLinecap="round"
    />
  </>,
];

export function Why() {
  return (
    <section id="why">
      <div className="wrap">
        <span className="chapter reveal">{WHY.chapter}</span>
        <h2 className="t reveal" style={{ maxWidth: '20ch' }}>
          {WHY.title}
        </h2>
        <div className="promises">
          {WHY.promises.map((promise, i) => (
            <div
              className="promise reveal"
              key={promise.title}
              style={{ '--i': i + 1 } as CSSProperties}
            >
              <svg viewBox="0 0 96 96" aria-hidden="true">
                {ICONS[i]}
              </svg>
              <b>{promise.title}</b>
              <p>{promise.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
