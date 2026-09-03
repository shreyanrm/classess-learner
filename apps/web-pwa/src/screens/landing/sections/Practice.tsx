'use client';

/**
 * "Practice that plays fair" — the puzzle, fully working.
 *
 * Shade cells and press Check. Two of four gets a mint tick drawn over the square, a marigold burst
 * a beat later, and "there we go" in marigold. One gets a Wobo-blue ring drawn round what you did
 * and an invitation. Nothing ever gets a cross, and Wobo never writes the word "wrong" — which is
 * the claim the headline makes two columns to the right, so the tile has to keep it.
 *
 * The verdict is `puzzle.ts`, tested. This file is the hand: it draws the ink on by unwinding a
 * dash offset, exactly as the prototype did, and clears it before the next check so a second press
 * redraws rather than jumping.
 */

import { WoboBody } from '@wobo/wobo';
import { useEffect, useRef, useState } from 'react';
import { useLastInput } from '../attention';
import { PRACTICE } from '../page-copy';
import {
  BURST_DELAY_MS,
  emptyCells,
  type PuzzleVerdict,
  RING_MS,
  shadedCount,
  TICK_MS,
  toggle,
  verdict,
} from '../puzzle';

/** Put the ink back to undrawn, with no transition, so the next draw starts from nothing. */
function clearInk(el: SVGPathElement | null): void {
  if (!el) return;
  const length = el.getTotalLength();
  el.style.transition = 'none';
  el.style.strokeDasharray = String(length);
  el.style.strokeDashoffset = String(length);
  el.setAttribute('opacity', '0');
}

/** Draw the ink on over `ms`, the way a pen lays it down. */
function drawInk(el: SVGPathElement | null, ms: number): void {
  if (!el) return;
  const length = el.getTotalLength();
  el.style.transition = 'none';
  el.style.strokeDasharray = String(length);
  el.style.strokeDashoffset = String(length);
  el.setAttribute('opacity', '1');
  requestAnimationFrame(() => {
    el.style.transition = `stroke-dashoffset ${ms}ms cubic-bezier(.5,0,.2,1)`;
    el.style.strokeDashoffset = '0';
  });
}

export function Practice() {
  const [cells, setCells] = useState<boolean[]>(emptyCells);
  const [said, setSaid] = useState<PuzzleVerdict | null>(null);
  const [burst, setBurst] = useState(false);
  const tickRef = useRef<SVGPathElement>(null);
  const ringRef = useRef<SVGPathElement>(null);
  const burstTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const idleSince = useLastInput();

  // The ink starts undrawn. Without this the two paths are simply visible on the first paint,
  // because a dash offset only exists once something has measured the path.
  useEffect(() => {
    clearInk(tickRef.current);
    clearInk(ringRef.current);
    return () => clearTimeout(burstTimer.current);
  }, []);

  const check = () => {
    clearTimeout(burstTimer.current);
    clearInk(tickRef.current);
    clearInk(ringRef.current);
    setBurst(false);
    const result = verdict(shadedCount(cells));
    setSaid(result);
    if (result.tick) {
      drawInk(tickRef.current, TICK_MS);
      burstTimer.current = setTimeout(() => setBurst(true), BURST_DELAY_MS);
    } else if (result.ring) {
      drawInk(ringRef.current, RING_MS);
    }
  };

  const reset = () => {
    clearTimeout(burstTimer.current);
    setCells(emptyCells());
    clearInk(tickRef.current);
    clearInk(ringRef.current);
    setBurst(false);
    setSaid(null);
  };

  return (
    <section id="practice">
      <div className="wrap grid">
        <div className="tile mint reveal" id="puzzleTile">
          <fieldset className="puzzle" aria-label={PRACTICE.puzzle.label}>
            <div className="q">
              {PRACTICE.puzzle.askBefore}
              <i>{PRACTICE.puzzle.fraction}</i>
              {PRACTICE.puzzle.askAfter}
            </div>
            <div className="cells" id="cells">
              {PRACTICE.puzzle.cells.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={cells[i] ? 'true' : 'false'}
                  aria-label={label}
                  onClick={() => setCells((c) => toggle(c, i))}
                />
              ))}
              <svg viewBox="-34 -34 264 264" aria-hidden="true">
                <path
                  ref={tickRef}
                  className="ink"
                  id="tick"
                  d="M-10 96 l30 30 l60 -70"
                  opacity="0"
                  style={{ stroke: 'var(--mint)', strokeWidth: 5 }}
                />
                <path
                  ref={ringRef}
                  className="ink pig"
                  id="ring"
                  d="M-6 -8 c-14 40 -14 90 6 112 s90 22 104 -6 s6 -96 -12 -108 s-84 -12 -98 2"
                  opacity="0"
                  style={{ strokeWidth: 4 }}
                />
                <g
                  id="burst"
                  opacity={burst ? 1 : 0}
                  stroke="var(--marigold)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  fill="none"
                >
                  <path d="M98 -26 l0 -18" />
                  <path d="M128 -18 l10 -14" />
                  <path d="M68 -18 l-10 -14" />
                  <path d="M150 10 l16 -8" />
                  <path d="M46 10 l-16 -8" />
                </g>
              </svg>
            </div>
            <div className="bar2">
              <button className="btn" id="check" type="button" onClick={check}>
                {PRACTICE.puzzle.check}
              </button>
              <button className="reset" id="reset" type="button" onClick={reset}>
                {PRACTICE.puzzle.reset}
              </button>
            </div>
            <div className={said?.win ? 'say win' : 'say'} id="say" aria-live="polite">
              {said?.reply ?? ''}
            </div>
          </fieldset>
          <div className="corner">
            <WoboBody
              size={60}
              mood={said?.win ? 'celebrate' : 'waiting'}
              gaze="pointer"
              idleSince={idleSince}
              label="Wobo"
            />
          </div>
        </div>

        <div>
          <span className="chapter reveal">{PRACTICE.chapter}</span>
          <h2 className="t reveal">
            {PRACTICE.titleBefore}
            <span className="hl">{PRACTICE.titleHighlight}</span>
            {PRACTICE.titleAfter}
          </h2>
          <p className="lead reveal">{PRACTICE.lead}</p>
        </div>
      </div>
    </section>
  );
}
