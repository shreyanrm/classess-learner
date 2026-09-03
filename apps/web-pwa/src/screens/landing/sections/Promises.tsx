'use client';

/**
 * What we promise — the three commitments a parent and a learner are entitled to read before they
 * sign anything. Each is a thing we have already built, not an intention: hints that thin out,
 * numbers verified in code before the hand will draw them, and a saved place instead of a threat
 * about lost progress (WOBO-PLAN §16, "never lose progress").
 */

import { PROMISES } from '../copy';
import { Reveal } from '../Reveal';

export function Promises() {
  return (
    <section className="lp-section lp-section--tonal" id="promises">
      <div className="lp-wrap">
        <Reveal>
          <h2 className="lp-h2">{PROMISES.title}</h2>
          <div className="lp-cards">
            {PROMISES.cards.map((card) => (
              <article className="lp-card" key={card.title}>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
