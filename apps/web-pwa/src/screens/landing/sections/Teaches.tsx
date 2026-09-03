'use client';

/**
 * How Wobo teaches — three claims, each answered by a real board drawing itself beside the claim.
 *
 * The three boards are goldens: `pythagoras` (a shape before a law), `series-circuit` (nine
 * computed and signed quantities) and `plant-cell` (a board the learner is meant to point at). Each
 * one is evidence for the sentence next to it, which is the whole reason this section is not three
 * cards of adjectives.
 */

import { BoardFrame } from '../BoardFrame';
import { landingGolden } from '../board-play';
import { DEMO, TEACHES } from '../copy';
import { Reveal } from '../Reveal';

export function Teaches() {
  return (
    <section className="lp-section" id="teaches">
      <div className="lp-wrap">
        <Reveal>
          <h2 className="lp-h2">{TEACHES.title}</h2>
          <p className="lp-lead">{TEACHES.lead}</p>
        </Reveal>
        <div className="lp-steps">
          {TEACHES.steps.map((step) => {
            const golden = landingGolden(step.board);
            return (
              <Reveal key={step.board} className="lp-step">
                <div className="lp-step-text">
                  <p className="lp-step-index">{step.index}</p>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                  <p className="lp-hand">{step.hand}</p>
                </div>
                {golden ? (
                  <BoardFrame golden={golden} frameLabel={DEMO.frame} hint={golden.subject} />
                ) : null}
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
