'use client';

/**
 * The first fold.
 *
 * On the left the ask, written the way a learner says it: "Hey Wobo," in Wobo's hand, then the
 * question, with the equation written on over about a second and swept by a marigold highlighter a
 * beat later. Both are CSS animations rather than script, so they play on the first paint and cost
 * nothing; both are off under reduced motion (`styles.ts`).
 *
 * On the right the stage: a tinted card where Wobo draws the proof live on a loop, three floating
 * drawn objects at three parallax depths plus the handwritten a²+b², the "drawn live" sticker, and
 * Wobo standing in front of the card with the pen.
 *
 * The Wobo here is the REAL rig, not a picture — it blinks, it gets bored if nothing happens, and
 * its gaze follows the pointer. The layout sizes it as a share of the stage, so `useBoxWidth`
 * measures the box and hands the rig a pixel size (see `measure.ts`).
 *
 * The card's own small Wobo (`#demoWobo`) stays a drawn head: the scroll engine writes its gaze
 * straight onto the `.eyes` group from the pen's position on the board, thirty times a second, and
 * that is a truer thing to watch than a rig looking at the mouse.
 */

import { WoboBody } from '@wobo/wobo';
import { type RefObject, useRef } from 'react';
import { LessonDrawing, WoboHeadGroup } from '../art';
import { useLastInput } from '../attention';
import type { DemoRefs } from '../engine';
import { LandingLink } from '../link';
import { useBoxWidth, woboSize } from '../measure';
import { DEMO, HERO } from '../page-copy';

/** The four floating drawn objects, with the parallax depth each one moves at. */
function Floats() {
  return (
    <>
      <div className="float f1" data-depth="0.06" aria-hidden="true">
        <svg viewBox="0 0 80 80" aria-hidden="true">
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
        <svg viewBox="0 0 80 80" aria-hidden="true">
          <circle cx="40" cy="40" r="26" fill="var(--mint)" />
          <circle cx="40" cy="40" r="26" fill="none" stroke="var(--ink)" strokeWidth="4" />
          <circle cx="31" cy="31" r="6" fill="var(--paper)" />
        </svg>
      </div>
      <div className="float f3" data-depth="0.04" aria-hidden="true">
        <svg viewBox="0 0 80 80" aria-hidden="true">
          <circle cx="40" cy="40" r="24" fill="none" stroke="var(--lilac)" strokeWidth="12" />
          <circle cx="40" cy="40" r="24" fill="none" stroke="var(--ink)" strokeWidth="4" />
          <circle cx="40" cy="40" r="12" fill="none" stroke="var(--ink)" strokeWidth="4" />
        </svg>
      </div>
      <div className="float f4" data-depth="0.08" aria-hidden="true">
        <svg viewBox="0 0 120 60" aria-hidden="true">
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
    </>
  );
}

export function Hero({
  onStart,
  refs,
  sectionRef,
}: {
  onStart: () => void;
  /** The five handles the engine's `useDemo` drives. Created by `Landing`, attached here. */
  refs: DemoRefs;
  /** The section itself, which the floats parallax against. */
  sectionRef: RefObject<HTMLElement | null>;
}) {
  const woboBox = useRef<HTMLDivElement>(null);
  const idleSince = useLastInput();
  // The prototype's `min(230px, 34%)`: the stylesheet still owns the box, this only turns the box
  // it produced into the pixel count the rig needs.
  const size = woboSize(useBoxWidth(woboBox), 1, 230, 88);

  return (
    <section id="hero" ref={sectionRef}>
      <div className="wrap grid">
        <div>
          <span className="chapter reveal">{HERO.chapter}</span>
          <h1 className="reveal">
            <span className="ask">{HERO.wake}</span> {HERO.askBefore}
            <em>{HERO.equation}</em>
            {HERO.askAfter}
          </h1>
          <p className="sub reveal">{HERO.sub}</p>
          <div className="cta reveal">
            <button type="button" className="btn pig" onClick={onStart}>
              {HERO.primary}
            </button>
            <LandingLink className="btn quiet" href="#parents-note">
              {HERO.secondary}
            </LandingLink>
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
          <Floats />

          {/* A picture of the product working, so it is announced as one rather than as an
              unnamed box full of decorative SVG. */}
          <div
            className="demo reveal"
            id="demo"
            role="img"
            aria-label={DEMO.label}
            ref={refs.demo as RefObject<HTMLDivElement>}
          >
            <div className="frame">
              <div className="bar">
                <b>{DEMO.who}</b>
                {DEMO.withWhom}
                <span className="live">
                  <i />
                  {DEMO.live}
                </span>
              </div>
              <div
                className="bubble"
                id="demoBubble"
                ref={refs.bubble as RefObject<HTMLDivElement>}
              >
                <span className="who">{DEMO.askedBy}</span>
                {DEMO.question}
              </div>
              <svg className="board" viewBox="0 0 640 400" aria-hidden="true">
                <LessonDrawing
                  strokeGroupId="lessonA"
                  penId="pen"
                  groupRef={refs.lesson}
                  penRef={refs.pen}
                />
              </svg>
              <svg className="mini" viewBox="0 0 120 120" aria-hidden="true">
                <WoboHeadGroup id="demoWobo" headRef={refs.wobo as RefObject<SVGGElement>} />
              </svg>
            </div>
          </div>

          <div className="heroWobo reveal" ref={woboBox}>
            {/* `drawing` is what raises the mitt and the ultramarine-tipped pen. The prototype's
                hero head carries its nib (`#wobo-full`'s `.nib`), and it is the point of the
                character: Wobo is drawing the proof on the card right behind it. Without it the
                rig stands there empty-handed and the hero loses the one detail that says what
                Wobo does. The gaze still follows the pointer — a pinned gaze outranks the
                expression's own look. */}
            <WoboBody
              size={size}
              mood="drawing"
              gaze="pointer"
              idleSince={idleSince}
              label="Wobo"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
