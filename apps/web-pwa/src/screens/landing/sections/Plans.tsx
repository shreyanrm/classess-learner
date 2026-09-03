'use client';

/**
 * Plans.
 *
 * There is no price yet, so there is no price here. The Plus card says "Price not set" in the slot
 * where a number would go, carries `data-placeholder` so the fact is machine-readable as well as
 * legible, and the note underneath states what happens when a price does exist: one price for
 * everyone, shown in full before payment, renewing only on request (WOBO-PLAN §14, §16). Both
 * buttons start the free tier, because that is the only thing anyone can actually do today.
 *
 * The two cards are bounded identically, and exactly one thing in this section is ultramarine: the
 * filled button on Free. Ringing the Plus card in pigment as well put the section's loudest mark on
 * the tier nobody can buy, and set two blues arguing across a 780px row (DESIGN.md §2).
 */

import { PLANS } from '../copy';
import { Reveal } from '../Reveal';

export function Plans({ onStart }: { onStart: () => void }) {
  return (
    <section className="lp-section" id="plans">
      <div className="lp-wrap">
        <Reveal>
          <h2 className="lp-h2">{PLANS.title}</h2>
          <p className="lp-lead">{PLANS.lead}</p>
          <div className="lp-tiers">
            {PLANS.tiers.map((tier) => (
              <article className="lp-tier" key={tier.name}>
                <h3>{tier.name}</h3>
                <p className="lp-price" data-placeholder={tier.placeholder ? 'true' : 'false'}>
                  {tier.price}
                </p>
                <ul>
                  {tier.lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                {/* Under the list, not under the price: only one tier has a cadence line, and above
                    the list it pushed that card's bullets 33px below the other card's. */}
                {tier.cadence ? <p className="lp-price-note">{tier.cadence}</p> : null}
                <button
                  type="button"
                  className={tier.placeholder ? 'lp-btn lp-btn--ghost' : 'lp-btn lp-btn--pigment'}
                  onClick={onStart}
                >
                  {tier.cta}
                </button>
              </article>
            ))}
          </div>
          <p className="lp-note">{PLANS.note}</p>
        </Reveal>
      </div>
    </section>
  );
}
