'use client';

/**
 * "On anything" — Wobo can see what is on the screen and draw on it.
 *
 * A paused film, and a lasso drawn around the part of it the question is about, then the chip that
 * opens the ask. The lasso is drawn ON ENTRY, not on load: the whole point of the beat is that it
 * happens in front of you, so the stroke's dash offset is animated by the scroll engine when the
 * tile comes into view (`../engine/motion.ts`).
 *
 * This is the one row on the page that is a claim about a capability rather than a scene from an
 * evening, which is why it gets the film's own furniture — a title, two bars, a scrubber that has
 * stopped at 0:07 — rather than a screenshot of the product.
 */

import type { RefObject } from 'react';
import { FILM } from './copy';
import { WoboMark } from './defs';

export function Film({ tileRef }: { tileRef: RefObject<HTMLDivElement | null> }) {
  return (
    <section className="row" id="how">
      <div className="wrap grid">
        <div className="tile violet reveal" ref={tileRef}>
          <div className="film">
            <div className="frame">
              <div className="title">{FILM.title}</div>
              <div className="bars" aria-hidden="true">
                <i style={{ height: '100%' }} />
                <i className="k" style={{ height: '62%' }} />
              </div>
            </div>
            <div className="controls" aria-hidden="true">
              <span>⏸</span>
              <div className="prog">
                <i />
              </div>
              <span>{FILM.time}</span>
            </div>
            <svg className="lasso" viewBox="0 0 640 400" aria-hidden="true" focusable="false">
              <path
                d="M150 90 c-60 40 -70 190 40 220 s280 10 330 -60 s-20 -180 -170 -190 s-150 -10 -200 30"
                fill="none"
                stroke="var(--pig)"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <text
                x="430"
                y="352"
                fontFamily="var(--hand)"
                fontWeight="700"
                fontSize="36"
                fill="var(--pig)"
              >
                {FILM.lasso}
              </text>
            </svg>
            <div className="chip">{FILM.chip}</div>
          </div>
          <WoboMark className="corner" />
        </div>

        <div>
          <span className="chapter reveal">{FILM.chapter}</span>
          <h2 className="t reveal">
            {FILM.headBefore}
            <span className="hl">{FILM.headSwept}</span>
            {FILM.headAfter}
          </h2>
          <p className="lead reveal">{FILM.lead}</p>
        </div>
      </div>
    </section>
  );
}
