'use client';

/**
 * The first fold: the wake phrase, the ask, and Wobo.
 *
 * "Hey Wobo" is the headline because it is the thing a learner actually says to start — the page
 * teaches the interaction in the act of naming the product. The second line is the learner's own
 * request, with the one hit of pigment on what Wobo does with it.
 *
 * Wobo here is the shipping rig (`WoboBody`), not an illustration: the eyes track the pointer, the
 * idle life runs, and reduced motion is handled inside the rig. Nothing on this fold is a picture
 * of the product.
 */

import { WoboBody } from '@wobo/wobo';
import { HERO } from '../copy';

export function Hero({ onStart }: { onStart: () => void }) {
  return (
    <section className="lp-wrap lp-hero" id="top">
      <div>
        <p className="lp-kicker">{HERO.kicker}</p>
        <h1 className="lp-h1">
          <span className="lp-wake">{HERO.wake}</span>
          <span>
            {HERO.ask} <em>{HERO.emphasis}</em>
          </span>
        </h1>
        <p>{HERO.body}</p>
        <div className="lp-cta">
          <button type="button" className="lp-btn lp-btn--pigment" onClick={onStart}>
            {HERO.primary}
          </button>
          <a className="lp-btn lp-btn--ghost" href="#teaches">
            {HERO.secondary}
          </a>
          <small>{HERO.note}</small>
        </div>
      </div>
      <div className="lp-stage">
        <WoboBody size={210} gaze="pointer" label="Wobo" />
        <span className="lp-stage-aside" aria-hidden>
          {HERO.aside}
        </span>
      </div>
    </section>
  );
}
