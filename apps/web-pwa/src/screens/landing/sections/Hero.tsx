'use client';

/**
 * The hero: one question, answered four ways.
 *
 * The card is the argument. It says the thing the whole page has to say before a visitor scrolls —
 * that Wobo is not a whiteboard with a chatbot bolted on — by answering the same question drawn,
 * filmed, tried and spoken, and by letting the reader pick.
 *
 * TWO RULES ARE BUILT INTO THIS COMPONENT:
 *
 *  · THE DRAWN ANSWER IS COMPLETE ON FIRST PAINT. The drawn card is the one that is up when the
 *    page loads, its own timeline runs immediately (`engine/motion.ts`), and under reduced motion
 *    the finished drawing is simply there. A visitor never meets an empty stage.
 *  · THE RAIL IS A CONTROL, NOT A CAROUSEL. It cycles on its own so a visitor who does nothing
 *    still sees all four, and the moment anyone taps it, the cycling stops for good. An auto-rotate
 *    that fights the reader is the oldest hostile pattern on the web.
 */

import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { useMagnet } from '../../../ui/primitives/magnetic';
import { HeroDrawn, HeroFilmed, HeroFloats, HeroSpoken, HeroTried } from '../art';
import { earlyAccessHandler, LandingLink } from '../link';
import { AUTH, HERO, HERO_CYCLE_MS, HERO_FORMS } from '../page-copy';

export function Hero({ sectionRef }: { sectionRef: RefObject<HTMLElement | null> }) {
  const [form, setForm] = useState(0);
  // A ref, not state: it is read by the interval, and turning it into state would restart the
  // interval on every tick.
  const stopped = useRef(false);
  const current = HERO_FORMS[form] ?? HERO_FORMS[0];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      if (stopped.current) return;
      setForm((i) => (i + 1) % HERO_FORMS.length);
    }, HERO_CYCLE_MS);
    return () => window.clearInterval(timer);
  }, []);

  const pick = useCallback((i: number) => {
    stopped.current = true;
    setForm(i);
  }, []);

  return (
    <section id="hero" ref={sectionRef as RefObject<HTMLElement>}>
      <div className="wrap grid">
        <div>
          <div className="eyebrow reveal">
            {HERO.eyebrow.lead}
            <b>{HERO.eyebrow.accent}</b>
          </div>
          <h1 className="reveal">
            <span className="wake">{HERO.wake}</span>
            {HERO.title}
          </h1>
          <p className="lede reveal">{HERO.lede}</p>
          <div className="cta reveal">
            {/* biome-ignore lint/a11y/useValidAnchor: a real in-page anchor, not a button in
                disguise. `#early` works with no JavaScript, can be copied and shared, and the click
                handler only eases the scroll and puts the caret in the field. */}
            <a className="btn pig" href="#early" onClick={earlyAccessHandler()} ref={useMagnet()}>
              <span>{AUTH.early}</span>
            </a>
            <LandingLink className="btn ghost" href={HERO.seeHow.href}>
              <span>{HERO.seeHow.label}</span>
            </LandingLink>
          </div>
          <div className="under reveal">
            {HERO.under.map((line) => (
              <span key={line}>
                <i />
                {line}
              </span>
            ))}
          </div>
        </div>
        <div className="stagewrap" style={{ position: 'relative' }}>
          <HeroFloats />
          <div className="device" id="device">
            <div className="top">
              <b>{HERO.device.who}</b> · {HERO.device.live}
              <span className="live">
                <i />
                {/* Announced politely: the label changes on its own, and a reader on a screen
                    reader should hear it change without being interrupted mid-sentence. */}
                <span aria-live="polite">{current?.live}</span>
              </span>
            </div>
            <div className="stage" id="heroStage">
              <div className={form === 0 ? 'on' : undefined} data-form="draw">
                <HeroDrawn label="Wobo draws the leaf and where the light goes" />
              </div>
              <div className={form === 1 ? 'on' : undefined} data-form="video">
                <HeroFilmed label="The same idea as a short film" caption={HERO.filmed.caption} />
              </div>
              <div className={form === 2 ? 'on' : undefined} data-form="try">
                <HeroTried label="Now you try one" copy={HERO.tried} />
              </div>
              <div className={form === 3 ? 'on' : undefined} data-form="say">
                <HeroSpoken label="Wobo says it out loud" line={HERO.spoken.line} />
              </div>
            </div>
            <div className="rail" id="heroRail">
              {HERO_FORMS.map((entry, i) => (
                <button
                  key={entry.key}
                  type="button"
                  className={i === form ? 'on' : undefined}
                  data-go={entry.key}
                  aria-pressed={i === form}
                  onClick={() => pick(i)}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
