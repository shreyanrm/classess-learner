'use client';

/**
 * "Everywhere you are" — the devices row, and the store buttons.
 *
 * A laptop, a tablet and a phone drawn as one picture, with a Wobo on each screen. The four store
 * buttons say "soon" because they are, and the one thing that works today is the loud one: the
 * browser. Saying "soon" on four of five is the honest version of a row of store badges, and it is
 * the same rule the plans page holds to about a price nobody has set.
 */

import type { CSSProperties } from 'react';
import { WoboHeadGroup } from '../art';
import { LandingLink } from '../link';
import { DEVICES } from '../page-copy';

export function Devices() {
  return (
    <section className="row flip">
      <div className="wrap grid">
        <div className="tile lilac reveal">
          <svg
            className="devices"
            viewBox="0 0 520 300"
            fill="none"
            stroke="var(--ink)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="60" y="40" width="300" height="190" rx="16" fill="var(--paper)" />
            <path d="M40 246 h340" strokeWidth="6" />
            <rect x="380" y="90" width="110" height="160" rx="14" fill="var(--paper)" />
            <rect x="418" y="238" width="34" height="4" rx="2" fill="var(--ink)" stroke="none" />
            <rect x="20" y="150" width="76" height="120" rx="12" fill="var(--paper)" />
            <path d="M50 262 h16" stroke="var(--ink-3)" />
            <path d="M120 150 L200 150 L200 80 Z" stroke="var(--pig)" />
            <path d="M220 100 h90 M220 122 h60 M220 144 h76" stroke="var(--ink-3)" />
            <path d="M400 150 h70 M400 172 h50 M400 194 h60" stroke="var(--ink-3)" />
            <WoboHeadGroup transform="translate(60 210) scale(.5)" />
            <WoboHeadGroup transform="translate(300 60) scale(.42)" />
            <WoboHeadGroup transform="translate(420 100) scale(.4)" />
          </svg>
        </div>

        <div>
          <span className="chapter reveal">{DEVICES.chapter}</span>
          <h2 className="t reveal">{DEVICES.title}</h2>
          <p className="lead reveal">{DEVICES.lead}</p>
          <div className="stores reveal">
            {DEVICES.stores.map((store, i) => (
              <LandingLink
                key={store.name}
                className={store.live ? 'store now' : 'store'}
                href={store.href}
                style={{ '--i': i + 1 } as CSSProperties}
              >
                <b>{store.name}</b>
                <span>{store.note}</span>
              </LandingLink>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
