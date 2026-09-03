'use client';

/**
 * Every board on earth.
 *
 * The chips and the count are generated at build time from `content/curriculum/frameworks.seed.json`
 * by `scripts/landing-boards.ts`, so this page cannot claim a board the registry does not carry,
 * and the number under the chips is the registry's own total rather than a round number someone
 * liked the sound of.
 */

import boards from '../boards.json';
import { BOARDS } from '../copy';
import { Reveal } from '../Reveal';

/** Fill the count line from the generated registry numbers. Nothing here is typed by hand. */
export function countLine(
  template: string,
  counts: { shown: number; total: number; countries: number },
): string {
  return template
    .replace('{shown}', String(counts.shown))
    .replace('{total}', String(counts.total))
    .replace('{countries}', String(counts.countries));
}

export function Boards() {
  return (
    <section className="lp-section" id="boards">
      <div className="lp-wrap">
        <Reveal>
          <h2 className="lp-h2">{BOARDS.title}</h2>
          <p className="lp-lead">{BOARDS.lead}</p>
          <div className="lp-chips">
            {boards.shown.map((board) => (
              <span className="lp-chip" key={board.id} title={board.name}>
                {board.short}
              </span>
            ))}
            <span className="lp-chip lp-chip--more">{BOARDS.more}</span>
          </div>
          <p className="lp-note">
            {countLine(BOARDS.countTemplate, {
              shown: boards.shown.length,
              total: boards.total,
              countries: boards.countries,
            })}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
