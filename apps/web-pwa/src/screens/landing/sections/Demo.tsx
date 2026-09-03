'use client';

/**
 * Try a board — the visitor picks a question and watches it get drawn.
 *
 * The two questions are the goldens' own recorded prompts, so the words on the buttons are
 * literally what a learner typed to produce the board that follows. The note under the frame says
 * plainly that these two are recorded turns: a marketing page that implies a live model is running
 * behind it, when it is not, is the kind of small lie this product does not tell.
 *
 * Each ask is its own prompt and nothing else. The subject used to sit above it in tracked capitals
 * — a second name for a thing the frame's own title bar already says on the right, in the same
 * words, four inches away (WOBO-PLAN §15).
 */

import { useState } from 'react';
import { BoardFrame } from '../BoardFrame';
import { landingGolden } from '../board-play';
import { DEMO } from '../copy';
import { Reveal } from '../Reveal';

export function Demo() {
  const [picked, setPicked] = useState(0);
  const [replay, setReplay] = useState(0);
  const ask = DEMO.boards[picked] ?? DEMO.boards[0];
  const golden = ask ? landingGolden(ask.board) : undefined;

  return (
    <section className="lp-section lp-section--tonal" id="demo">
      <div className="lp-wrap">
        <Reveal className="lp-demo">
          <div>
            <h2 className="lp-h2">{DEMO.title}</h2>
            <p className="lp-lead">{DEMO.lead}</p>
            <div className="lp-asks">
              {DEMO.boards.map((board, index) => (
                <button
                  key={board.board}
                  type="button"
                  className="lp-ask"
                  aria-pressed={index === picked}
                  onClick={() => {
                    setPicked(index);
                    setReplay((n) => n + 1);
                  }}
                >
                  {board.prompt}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="lp-btn lp-btn--ghost"
              onClick={() => setReplay((n) => n + 1)}
            >
              {DEMO.replay}
            </button>
            <p className="lp-note">{DEMO.note}</p>
          </div>
          {golden ? (
            <BoardFrame
              golden={golden}
              frameLabel={DEMO.frame}
              replayKey={replay}
              hint={golden.subject}
            />
          ) : null}
        </Reveal>
      </div>
    </section>
  );
}
