'use client';

/**
 * "One Tuesday night" — the cinematic chapter, pinned and scrubbed by scroll.
 *
 * This section renders the whole scene at rest and hands the choreography to the engine, which
 * pins `.pin` and scrubs one timeline across roughly four screens of scroll: the desk room settles,
 * the moon rises, the lamp's cone lights, the mug steams, four captions hold and hand over, the
 * camera zooms into the phone, and the board rises out of it and draws the proof line by line —
 * with the pen and the drawing scrubbed by the reader's own scroll, not by a clock.
 *
 * Everything the engine touches is named exactly as the prototype named it: `#nightScene`, `#moon`,
 * `#cone`, `#steam`, `#nightBoard`, `#nightQ`, `#lessonB`, `#pen2`, `#boardWobo`, `#c1`…`#c4`.
 * That is the contract between this file and `engine/**`, and it is why the ids read like a
 * prototype rather than like a component.
 */

import type { RefObject } from 'react';
import { LessonDrawing, WoboHeadGroup } from '../art';
import type { NightSectionRefs } from '../engine';
import { DEMO, NIGHT } from '../page-copy';

/** The desk at 9:40 pm: the window and its moon, the lamp, the book, the phone, the mug, a pencil. */
function DeskScene({ refs }: { refs: NightSectionRefs }) {
  return (
    <div className="scene" id="nightScene" ref={refs.scene as RefObject<HTMLDivElement>}>
      <svg viewBox="0 0 1100 620" aria-hidden="true">
        <g id="room">
          <rect x="0" y="470" width="1100" height="4" rx="2" fill="var(--ink)" />

          <g id="window">
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
              ref={refs.moon as RefObject<SVGPathElement>}
              id="moon"
              d="M150 160 a30 30 0 1 0 28 40 a24 24 0 0 1 -28 -40 z"
              fill="var(--marigold)"
            />
          </g>

          <g id="lamp">
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
              ref={refs.cone as RefObject<SVGPathElement>}
              id="cone"
              d="M604 264 l-120 206 h260 z"
              fill="var(--marigold)"
              opacity="0"
            />
          </g>

          <g id="book">
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

          <g id="phone">
            <path
              d="M790 470 l130 -10 v-150 l-124 8 z"
              fill="var(--paper)"
              stroke="var(--ink)"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <WoboHeadGroup transform="translate(818 340) scale(.75)" />
          </g>

          <g id="mug">
            <path
              d="M960 470 v-70 h70 v70 M1030 420 c26 0 26 34 0 34"
              fill="var(--paper)"
              stroke="var(--ink)"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              ref={refs.steam as RefObject<SVGPathElement>}
              id="steam"
              d="M980 380 c-6 -14 8 -20 0 -34 M1002 376 c-6 -14 8 -20 0 -34"
              fill="none"
              stroke="var(--ink-3)"
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0"
            />
          </g>

          <g id="pencil">
            <path d="M960 360 l36 -84" stroke="var(--rose)" strokeWidth="8" strokeLinecap="round" />
            <path d="M996 276 l4 -12 l6 10" fill="var(--rose)" />
          </g>
        </g>
      </svg>
    </div>
  );
}

export function Night({ refs }: { refs: NightSectionRefs }) {
  return (
    <section id="night" aria-label={NIGHT.label} ref={refs.section}>
      <div className="pin" ref={refs.pin as RefObject<HTMLDivElement>}>
        <div className="sky" />
        <div className="n">{NIGHT.chapter}</div>

        <DeskScene refs={refs} />

        {/* The board the camera flies into. It starts at a fifth of its size and invisible; the
            engine brings it up as the room falls away. */}
        <div className="board" id="nightBoard" ref={refs.board as RefObject<HTMLDivElement>}>
          <div className="bar">
            <b>{DEMO.who}</b>
            {DEMO.withWhom}
          </div>
          <div className="q" id="nightQ" ref={refs.question as RefObject<HTMLDivElement>}>
            <span className="who">{DEMO.askedBy}</span>
            {DEMO.question}
          </div>
          <svg className="b" viewBox="0 0 640 400" aria-hidden="true">
            <LessonDrawing
              strokeGroupId="lessonB"
              penId="pen2"
              groupRef={refs.lesson}
              penRef={refs.pen}
            />
          </svg>
          <svg className="mini" viewBox="0 0 120 120" aria-hidden="true">
            <WoboHeadGroup id="boardWobo" headRef={refs.wobo as RefObject<SVGGElement>} />
          </svg>
        </div>

        <div className="cap">
          {NIGHT.captions.map((caption, i) => (
            <div
              key={caption.id}
              id={caption.id}
              ref={refs.captions[i] as RefObject<HTMLDivElement>}
            >
              <div className="big">{caption.big}</div>
              <div className="small">{caption.small}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
