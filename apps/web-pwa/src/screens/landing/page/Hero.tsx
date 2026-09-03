'use client';

/**
 * The hero: the promise, the two doors, and the proof of it drawing itself beside them.
 *
 * The headline's phrase is written in the hand and then swept by a marigold highlighter — that is
 * two CSS animations on one `<em>`, deliberately NOT the scroll engine's job, because it is the
 * first thing on the page and has to run before any of the choreography wakes up.
 *
 * The card is a real board, not a picture of one: the lesson beside this paragraph is the same data
 * the night chapter draws, played on a fourteen-second loop with a three-and-a-half second hold at
 * the end so the finished proof can be read. The card tilts to the pointer, the little Wobo in its
 * corner watches the pen, and the big Wobo standing in front of it watches the reader.
 */

import { WoboBody } from '@wobo/wobo';
import type { RefObject } from 'react';
import { Lesson } from './Board';
import { HERO } from './copy';
import { WoboMark } from './defs';

export interface HeroRefs {
  demo: RefObject<HTMLDivElement | null>;
  bubble: RefObject<HTMLDivElement | null>;
  lesson: RefObject<SVGGElement | null>;
  pen: RefObject<SVGGElement | null>;
  wobo: RefObject<SVGGElement | null>;
}

export function Hero({
  refs,
  sectionRef,
  onLearner,
  onParent,
}: {
  refs: HeroRefs;
  sectionRef: RefObject<HTMLElement | null>;
  onLearner: () => void;
  onParent: () => void;
}) {
  return (
    <section id="hero" ref={sectionRef}>
      <div className="wrap grid">
        <div>
          <span className="chapter reveal">{HERO.chapter}</span>
          <h1 className="reveal">
            {HERO.headBefore}
            <em>{HERO.headSwept}</em>
            {HERO.headAfter}
          </h1>
          <p className="sub reveal">{HERO.sub}</p>
          <div className="cta reveal">
            <button type="button" className="btn pig" onClick={onLearner}>
              {HERO.learner}
            </button>
            <button type="button" className="btn quiet" onClick={onParent}>
              {HERO.parent}
            </button>
          </div>
          <div className="note reveal">
            {HERO.notes.map((note) => (
              <span key={note}>{note}</span>
            ))}
          </div>
        </div>

        <div className="stage">
          <div className="sticker reveal" aria-hidden="true">
            {HERO.sticker}
          </div>

          {/* Four drawn objects at three parallax depths, drifting as the hero leaves. */}
          <div className="float f1" data-depth="0.06" aria-hidden="true">
            <svg viewBox="0 0 80 80">
              <path d="M40 8 L72 66 L8 66 Z" fill="var(--marigold)" />
              <path
                d="M40 8 L72 66 L8 66 Z"
                fill="none"
                stroke="var(--ink)"
                strokeWidth="4"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="float f2" data-depth="0.10" aria-hidden="true">
            <svg viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="26" fill="var(--mint)" />
              <circle cx="40" cy="40" r="26" fill="none" stroke="var(--ink)" strokeWidth="4" />
              <circle cx="31" cy="31" r="6" fill="var(--paper)" />
            </svg>
          </div>
          <div className="float f3" data-depth="0.04" aria-hidden="true">
            <svg viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="24" fill="none" stroke="var(--lilac)" strokeWidth="12" />
              <circle cx="40" cy="40" r="24" fill="none" stroke="var(--ink)" strokeWidth="4" />
              <circle cx="40" cy="40" r="12" fill="none" stroke="var(--ink)" strokeWidth="4" />
            </svg>
          </div>
          <div className="float f4" data-depth="0.08" aria-hidden="true">
            <svg viewBox="0 0 120 60">
              <text
                x="4"
                y="46"
                fontFamily="var(--hand)"
                fontWeight="700"
                fontSize="44"
                fill="var(--pig)"
              >
                a²+b²
              </text>
            </svg>
          </div>

          <div className="demo reveal" ref={refs.demo} aria-label={HERO.demoLabel}>
            <div className="frame">
              <div className="bar">
                <b>Wobo</b> · {HERO.demoBar}
                <span className="live">
                  {/* biome-ignore lint/a11y/useSemanticElements: a pulsing dot, not emphasis */}
                  <i aria-hidden="true" />
                  {HERO.demoLive}
                </span>
              </div>
              <div className="bubble" ref={refs.bubble}>
                <span className="who">{HERO.demoWho}</span>
                {HERO.demoAsk}
              </div>
              <Lesson className="board" lessonRef={refs.lesson} penRef={refs.pen} />
              <WoboMark className="mini" groupRef={refs.wobo} />
            </div>
          </div>

          {/* The real rig, standing in front of the card. Its gaze follows the reader's pointer. */}
          <div className="heroWobo reveal">
            <WoboBody
              size={230}
              label={HERO.woboLabel}
              style={{ width: '100%', height: 'auto', aspectRatio: '1 / 1' }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
