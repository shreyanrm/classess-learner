'use client';

/**
 * "For parents" — Sunday evening, pinned, with depth.
 *
 * The envelope drifts up and settles at a slight tilt, its flap opens, and the note rises out of it
 * and forward into focus while the envelope falls back, dims and shrinks — two layers moving at
 * different rates, which is the only reason the beat reads as depth rather than as a slide.
 *
 * The engine owns those numbers (`#env`, `#flap`, `#letter`); this file owns the note itself, which
 * is written in Wobo's hand with one coral clause — "which is exactly how learning looks" — and
 * one in Wobo blue. That coral line is the point of the whole section: asking for help is not a
 * failure to be reported.
 */

import type { RefObject } from 'react';
import { WoboHeadSvg } from '../art';
import type { SundaySectionRefs } from '../engine';
import { PARENTS } from '../page-copy';

export function ParentsNote({ refs }: { refs: SundaySectionRefs }) {
  return (
    <section id="parents-note" aria-label={PARENTS.label} ref={refs.section}>
      <div className="pin" ref={refs.pin as RefObject<HTMLDivElement>}>
        <div className="cap">
          <span className="chapter">{PARENTS.chapter}</span>
          <h2>{PARENTS.title}</h2>
          <p>{PARENTS.body}</p>
        </div>

        <div className="layer env" id="env" ref={refs.envelope as RefObject<HTMLDivElement>}>
          <svg viewBox="0 0 720 460" aria-hidden="true">
            <path
              d="M40 120 h640 v300 h-640 z"
              fill="var(--paper-2)"
              stroke="var(--ink)"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path
              ref={refs.flap}
              id="flap"
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

        <div className="layer letter" id="letter" ref={refs.letter as RefObject<HTMLDivElement>}>
          <WoboHeadSvg className="stamp" />
          <div className="to">{PARENTS.letter.to}</div>
          <div className="body">
            {PARENTS.letter.run1}
            <em>{PARENTS.letter.accent}</em> {PARENTS.letter.run2}
            <b>{PARENTS.letter.strong}</b>
          </div>
          <div className="sig">{PARENTS.letter.signature}</div>
        </div>
      </div>
    </section>
  );
}
