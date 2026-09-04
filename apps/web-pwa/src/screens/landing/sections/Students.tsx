'use client';

/**
 * "Stop it anywhere." — the film that plays, pauses, is circled, and is answered.
 *
 * Every beat is scrubbed by the reader's own scroll (`engine/motion.ts`), and every scrubbed value
 * is a transform or an opacity: the progress bar is `scaleX`, never `width`, which is cause 2 of
 * law v5's jitter and the reason the bar is a full-width element scaled from its left edge.
 */

import { FilmFrame, PauseGlyph } from '../art';
import { STUDENTS } from '../page-copy';

export function Students() {
  const film = STUDENTS.film;
  return (
    <section id="students">
      <div className="wrap">
        <div className="row flip">
          <div>
            <div className="eyebrow reveal">{STUDENTS.eyebrow}</div>
            <h2 className="t reveal">
              {STUDENTS.title.lead}
              <span className="hl">{STUDENTS.title.mark}</span>
            </h2>
            <p className="lede reveal">{STUDENTS.lede}</p>
            <div className="claims reveal">
              {STUDENTS.claims.map((claim, i) => (
                <div key={claim.title}>
                  <i>{i + 1}</i>
                  <div>
                    <b>{claim.title}</b>
                    <span>{claim.body}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="art" id="videoArt">
            <div className="player" id="player">
              <div className="frame">
                <FilmFrame
                  label="A lesson film, paused, with a question circled on it"
                  slate={film.slate}
                  bars={film.bars}
                />
                <div className="bubble" id="b1" style={{ left: '8%', bottom: '16%' }}>
                  {film.prompt}
                </div>
                <div className="bubble hand" id="b2" style={{ right: '6%', top: '12%' }}>
                  {film.question}
                </div>
                <div
                  className="bubble"
                  id="b3"
                  style={{ left: '10%', top: '14%', maxWidth: '58%' }}
                >
                  {film.answer}
                </div>
              </div>
              <div className="bar">
                <span className="pp">
                  <PauseGlyph />
                </span>
                <span className="track">
                  <i id="track" />
                </span>
                <span id="tstamp">{film.stamp}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
