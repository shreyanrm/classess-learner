'use client';

/**
 * "Then she tries one" — the working puzzle, and the claim it proves.
 *
 * The claim is that Wobo never says "wrong": it rings the gap and waits. So the puzzle has to
 * actually behave that way, live, on a page nobody has signed in to. Shade one cell and Wobo draws
 * a ring around what is missing and writes "that's a quarter. one more" in its own hand. Shade two
 * and a tick draws itself on, the line turns marigold, and a small burst of marigold lands a beat
 * later. Nothing here ever says no.
 *
 * The marking lives in `puzzle.ts` and is tested there. This file draws it.
 */

import { useEffect, useRef, useState } from 'react';
import { TRIES } from './copy';
import { WoboMark } from './defs';
import { BURST_DELAY_MS, EMPTY, type PuzzleInk, puzzleReply, toggle } from './puzzle';

/** Prime a stroke so it can draw itself on: dashed by its own length, offset out of sight. */
function prime(el: SVGPathElement | null): number {
  if (!el || typeof el.getTotalLength !== 'function') return 0;
  const length = el.getTotalLength();
  el.style.transition = 'none';
  el.style.strokeDasharray = String(length);
  el.style.strokeDashoffset = String(length);
  return length;
}

export function Tries({ tileRef }: { tileRef: React.RefObject<HTMLDivElement | null> }) {
  const [cells, setCells] = useState<readonly boolean[]>(EMPTY);
  const [say, setSay] = useState('');
  const [win, setWin] = useState(false);
  const [burst, setBurst] = useState(false);
  const tickRef = useRef<SVGPathElement>(null);
  const ringRef = useRef<SVGPathElement>(null);
  const lengths = useRef<{ tick: number; ring: number }>({ tick: 0, ring: 0 });
  const burstTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Measure both strokes once, after the first paint, and leave them undrawn.
  useEffect(() => {
    lengths.current = { tick: prime(tickRef.current), ring: prime(ringRef.current) };
    return () => {
      if (burstTimer.current) clearTimeout(burstTimer.current);
    };
  }, []);

  const clear = () => {
    for (const [el, len] of [
      [tickRef.current, lengths.current.tick],
      [ringRef.current, lengths.current.ring],
    ] as const) {
      if (!el) continue;
      el.style.transition = 'none';
      el.style.strokeDashoffset = String(len);
      el.setAttribute('opacity', '0');
    }
    if (burstTimer.current) clearTimeout(burstTimer.current);
    setBurst(false);
  };

  const drawOn = (which: Exclude<PuzzleInk, null>, ms: number) => {
    const el = which === 'tick' ? tickRef.current : ringRef.current;
    if (!el) return;
    el.setAttribute('opacity', '1');
    el.style.transition = `stroke-dashoffset ${ms}ms cubic-bezier(.5,0,.2,1)`;
    // Next frame, so the browser has the "undrawn" state to transition away from.
    requestAnimationFrame(() => {
      el.style.strokeDashoffset = '0';
    });
  };

  const check = () => {
    clear();
    const reply = puzzleReply(cells.filter(Boolean).length);
    setSay(reply.say);
    setWin(reply.win);
    if (reply.ink) drawOn(reply.ink, reply.drawMs);
    if (reply.win) burstTimer.current = setTimeout(() => setBurst(true), BURST_DELAY_MS);
  };

  const reset = () => {
    clear();
    setCells(EMPTY);
    setSay('');
    setWin(false);
  };

  return (
    <section id="tries">
      <div className="wrap grid">
        <div className="tile mint reveal" ref={tileRef}>
          <div className="puzzle" aria-label={TRIES.puzzleLabel}>
            <div className="q">
              {TRIES.questionBefore}
              <i>{TRIES.questionFraction}</i>
              {TRIES.questionAfter}
            </div>
            <div className="cells">
              {TRIES.cells.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={cells[i] ? 'true' : 'false'}
                  aria-label={label}
                  onClick={() => setCells((c) => toggle(c, i))}
                />
              ))}
              <svg viewBox="-34 -34 264 264" aria-hidden="true" focusable="false">
                <path
                  ref={tickRef}
                  className="ink"
                  d="M-10 96 l30 30 l60 -70"
                  opacity="0"
                  style={{ stroke: 'var(--mint)', strokeWidth: 5 }}
                />
                <path
                  ref={ringRef}
                  className="ink pig"
                  d="M-6 -8 c-14 40 -14 90 6 112 s90 22 104 -6 s6 -96 -12 -108 s-84 -12 -98 2"
                  opacity="0"
                  style={{ strokeWidth: 4 }}
                />
                <g
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
              <button type="button" className="btn" onClick={check}>
                {TRIES.check}
              </button>
              <button type="button" className="reset" onClick={reset}>
                {TRIES.reset}
              </button>
            </div>
            <div className={win ? 'say win' : 'say'} aria-live="polite">
              {say}
            </div>
          </div>
          <WoboMark className="corner" />
        </div>

        <div>
          <span className="chapter reveal">{TRIES.chapter}</span>
          <h2 className="t reveal">
            {TRIES.headBefore}
            <span className="hl">{TRIES.headSwept}</span>
            {TRIES.headAfter}
          </h2>
          <p className="lead reveal">{TRIES.lead}</p>
        </div>
      </div>
    </section>
  );
}
