'use client';

/**
 * "For students" — a paused film with a lasso drawn round the confusing part, and three claims.
 *
 * The lasso is the whole argument in one gesture: you pause a video, circle the bit that makes no
 * sense, and ask about THAT. The engine draws it on entry (a 1200-unit dash offset unwinding over
 * 1.3s), then the handwritten "start here" fades in, then the chip. Everything here is at rest
 * until it is scrolled to, which is why the dash values live in the stylesheet and not in JSX.
 *
 * The corner Wobo is the real rig: it is a free-standing Wobo watching the reader, so it should be
 * alive rather than drawn.
 */

import { WoboBody } from '@wobo/wobo';
import { useLastInput } from '../attention';
import { STUDENTS } from '../page-copy';

export function Students() {
  const idleSince = useLastInput();
  return (
    <section className="row" id="students">
      <div className="wrap grid">
        <div className="tile violet reveal" id="filmTile">
          <div className="film" id="film">
            <div className="frame">
              <div className="title">{STUDENTS.film.title}</div>
              <div className="bars">
                <i style={{ height: '100%' }} />
                <i className="k" style={{ height: '62%' }} />
              </div>
            </div>
            <div className="controls">
              {/* The pause glyph, not an emoji: this is a picture of a paused player. */}
              <span aria-hidden="true">&#9208;</span>
              <div className="prog">
                <i />
              </div>
              <span>{STUDENTS.film.time}</span>
            </div>
            <svg className="lasso" viewBox="0 0 640 400" aria-hidden="true">
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
                {STUDENTS.film.lasso}
              </text>
            </svg>
            <div className="chip">{STUDENTS.film.chip}</div>
          </div>
          <div className="corner">
            {/* Pen up, like every Wobo head in the prototype (see Hero.tsx). */}
            <WoboBody size={60} mood="drawing" gaze="pointer" idleSince={idleSince} label="Wobo" />
          </div>
        </div>

        <div>
          <span className="chapter reveal">{STUDENTS.chapter}</span>
          <h2 className="t reveal">
            {STUDENTS.titleBefore}
            <span className="hl">{STUDENTS.titleHighlight}</span>
            {STUDENTS.titleAfter}
          </h2>
          <p className="lead reveal">{STUDENTS.lead}</p>
          <div className="claims reveal">
            {STUDENTS.claims.map((claim, i) => (
              <div key={claim}>
                <i>{i + 1}</i>
                {claim}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
