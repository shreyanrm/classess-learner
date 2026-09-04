'use client';

/**
 * "One question in. A whole lesson out." — the five things Wobo does with a question.
 *
 * This section exists to obey law v5's last copy rule: no surface may imply the board is the whole
 * product. Drawing is step three of five, and it is drawn as such.
 */

import { LoopIcon } from '../art';
import { LOOP } from '../page-copy';

export function Loop() {
  return (
    <section id="loop">
      <div className="wrap">
        <div className="eyebrow reveal">{LOOP.eyebrow}</div>
        <h2 className="t reveal">
          {LOOP.title.lead}
          <span className="hl">{LOOP.title.mark}</span>
        </h2>
        <p className="lede reveal">{LOOP.lede}</p>
        <div className="loop">
          {LOOP.steps.map((step, i) => (
            <div className="step" key={step.n}>
              <LoopIcon step={i} />
              <div className="n">{step.n}</div>
              <b>{step.title}</b>
              <p>{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
