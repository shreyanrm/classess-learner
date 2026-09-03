'use client';

/**
 * Sunday, 6 pm — the week in one honest note, pinned and opened by the scroll.
 *
 * An envelope arrives tilted, its flap folds back, and the letter rises out of it with real depth:
 * two layers moving at different rates, the envelope settling behind and dimming as the letter
 * comes forward. The note itself is the product's parent surface, written by the tutor that was
 * actually there — no dashboard, no percentage, and one sentence that says a miss is not a failure.
 *
 * The timing belongs to `../engine/chapters.ts`; this file hands it the four things it moves.
 */

import type { RefObject } from 'react';
import { SUNDAY } from './copy';
import { WoboMark } from './defs';

export interface SundaySectionRefs {
  section: RefObject<HTMLElement | null>;
  pin: RefObject<HTMLDivElement | null>;
  envelope: RefObject<HTMLDivElement | null>;
  flap: RefObject<SVGPathElement | null>;
  letter: RefObject<HTMLDivElement | null>;
}

export function Sunday({ refs }: { refs: SundaySectionRefs }) {
  return (
    <section id="sunday" ref={refs.section} aria-label={SUNDAY.label}>
      <div className="pin" ref={refs.pin}>
        <div className="cap">
          <span className="chapter">{SUNDAY.chapter}</span>
          <h2>{SUNDAY.title}</h2>
          <p>{SUNDAY.lead}</p>
        </div>

        <div className="layer env" ref={refs.envelope}>
          <svg viewBox="0 0 720 460" aria-hidden="true" focusable="false">
            <path
              d="M40 120 h640 v300 h-640 z"
              fill="var(--paper-2)"
              stroke="var(--ink)"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path
              ref={refs.flap}
              d="M40 120 l320 210 l320 -210"
              fill="var(--paper-3)"
              stroke="var(--ink)"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <circle cx="600" cy="200" r="30" fill="var(--rose)" />
            <text
              x="600"
              y="211"
              textAnchor="middle"
              fontFamily="var(--hand)"
              fontWeight="700"
              fontSize="30"
              fill="var(--paper)"
            >
              W
            </text>
          </svg>
        </div>

        <div className="layer letter" ref={refs.letter}>
          <WoboMark className="stamp" />
          <div className="to">{SUNDAY.to}</div>
          <div className="body">
            {SUNDAY.bodyOne}
            <em>{SUNDAY.bodyRose}</em>
            {SUNDAY.bodyTwo}
            <b>{SUNDAY.bodyPig}</b>
          </div>
          <div className="sig">{SUNDAY.sig}</div>
        </div>
      </div>
    </section>
  );
}
