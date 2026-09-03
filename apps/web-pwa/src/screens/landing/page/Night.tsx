'use client';

/**
 * Tuesday, 9:40 pm — the cinematic chapter, pinned and scrubbed by the reader's own scroll.
 *
 * The scene is one drawing: a window with a moon that rises, a lamp whose cone lights, a book, a
 * phone with Wobo already on it, a mug that starts to steam, a pencil left where it fell. Two
 * captions hand over while it settles. Then the camera pushes into the phone, the phone becomes a
 * board, and the proof is drawn — by the scroll, at the reader's own speed. It closes on the beat
 * the whole page is built around: "9:46 pm. Oh."
 *
 * Nothing here animates itself. Every element the timeline touches is handed out through `refs`,
 * and `../engine/chapters.ts` owns the timing. Under reduced motion the engine places the chapter
 * at its end state instead, so the reader still gets the board and the closing caption.
 */

import type { RefObject } from 'react';
import { Lesson } from './Board';
import { HERO, NIGHT } from './copy';
import { WoboHead, WoboMark } from './defs';

export interface NightSectionRefs {
  section: RefObject<HTMLElement | null>;
  pin: RefObject<HTMLDivElement | null>;
  scene: RefObject<HTMLDivElement | null>;
  moon: RefObject<SVGPathElement | null>;
  cone: RefObject<SVGPathElement | null>;
  steam: RefObject<SVGPathElement | null>;
  board: RefObject<HTMLDivElement | null>;
  question: RefObject<HTMLDivElement | null>;
  captions: readonly RefObject<HTMLDivElement | null>[];
  lesson: RefObject<SVGGElement | null>;
  pen: RefObject<SVGGElement | null>;
  wobo: RefObject<SVGGElement | null>;
}

export function Night({ refs }: { refs: NightSectionRefs }) {
  return (
    <section id="night" ref={refs.section} aria-label={NIGHT.label}>
      <div className="pin" ref={refs.pin}>
        <div className="sky" />
        <div className="n">{NIGHT.stamp}</div>

        <div className="scene" ref={refs.scene}>
          <svg viewBox="0 0 1100 620" aria-hidden="true" focusable="false">
            <g>
              {/* the desk */}
              <rect x="0" y="470" width="1100" height="4" rx="2" fill="var(--ink)" />

              <g>
                <rect
                  x="90"
                  y="90"
                  width="220"
                  height="200"
                  rx="18"
                  fill="var(--pig-w)"
                  stroke="var(--ink)"
                  strokeWidth="5"
                />
                <path d="M200 90 v200 M90 190 h220" stroke="var(--ink)" strokeWidth="5" />
                <path
                  ref={refs.moon}
                  d="M150 160 a30 30 0 1 0 28 40 a24 24 0 0 1 -28 -40 z"
                  fill="var(--marigold)"
                />
              </g>

              <g>
                <path
                  d="M420 470 V220 c0 -70 110 -90 150 -40 l34 44"
                  fill="none"
                  stroke="var(--ink)"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <path d="M582 190 l74 -22 l38 80 l-86 8 z" fill="var(--ink)" />
                <path
                  d="M394 470 h60 M400 458 h48"
                  stroke="var(--ink)"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <path
                  ref={refs.cone}
                  d="M604 264 l-120 206 h260 z"
                  fill="var(--marigold)"
                  opacity="0"
                />
              </g>

              <g>
                <path
                  d="M470 470 l30 -110 h250 l-12 110 z"
                  fill="var(--paper)"
                  stroke="var(--ink)"
                  strokeWidth="5"
                  strokeLinejoin="round"
                />
                <path
                  d="M540 400 h140 M532 425 h120 M524 450 h150"
                  stroke="var(--ink-3)"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                <path
                  d="M640 392 l30 -28 l30 28 z"
                  fill="none"
                  stroke="var(--pig)"
                  strokeWidth="5"
                  strokeLinejoin="round"
                />
              </g>

              <g>
                <path
                  d="M790 470 l130 -10 v-150 l-124 8 z"
                  fill="var(--paper)"
                  stroke="var(--ink)"
                  strokeWidth="5"
                  strokeLinejoin="round"
                />
                <g transform="translate(818 340) scale(.75)">
                  <WoboHead />
                </g>
              </g>

              <g>
                <path
                  d="M960 470 v-70 h70 v70 M1030 420 c26 0 26 34 0 34"
                  fill="var(--paper)"
                  stroke="var(--ink)"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                <path
                  ref={refs.steam}
                  d="M980 380 c-6 -14 8 -20 0 -34 M1002 376 c-6 -14 8 -20 0 -34"
                  fill="none"
                  stroke="var(--ink-3)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  opacity="0"
                />
              </g>

              <g>
                <path d="M960 360 l36 -84" stroke="var(--rose)" strokeWidth="8" strokeLinecap="round" />
                <path d="M996 276 l4 -12 l6 10" fill="var(--rose)" />
              </g>
            </g>
          </svg>
        </div>

        <div className="board" ref={refs.board}>
          <div className="bar">
            <b>Wobo</b> · {NIGHT.boardBar}
          </div>
          {/* The same question the hero's card carries, because it is the same evening. */}
          <div className="q" ref={refs.question}>
            <span className="who">{HERO.demoWho}</span>
            {HERO.demoAsk}
          </div>
          <Lesson className="b" lessonRef={refs.lesson} penRef={refs.pen} />
          <WoboMark className="mini" groupRef={refs.wobo} />
        </div>

        <div className="cap">
          {NIGHT.captions.map((caption, i) => (
            <div key={caption.big} ref={refs.captions[i]}>
              <div className="big">{caption.big}</div>
              <div className="small">{caption.small}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
