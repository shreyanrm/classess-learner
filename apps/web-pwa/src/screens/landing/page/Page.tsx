'use client';

/**
 * The landing page — the whole of it, assembled, and the four fixed layers hoisted out of it.
 *
 * WHY THE HOISTING. The app wraps every screen in an element carrying `will-change: transform`,
 * which makes that element the containing block for `position: fixed` descendants. Four things on
 * this page are fixed and must stay fixed to the VIEWPORT: the header, the depth layer of blurred
 * colour, the ribbon canvas and the nib. Left in place they would anchor to the screen wrapper —
 * a header that scrolls away, blobs stretched over the whole document, a ribbon five thousand
 * pixels tall. So each is portalled into `document.body`, and the two hosts sit on either side of
 * the app: depth BEFORE it (it paints behind every pixel the page draws) and the pen and the header
 * AFTER it (they paint over everything). Each host carries `lv6` so the palette still resolves.
 *
 * The page's own background is painted on `<body>` for the same reason: an opaque background on the
 * page itself would cover the depth layer sitting behind it. The class comes off on unmount, so the
 * app's own page colour is back the moment the reader leaves.
 *
 * Everything that moves belongs to `../engine`. This file owns the DOM and the words; the engine
 * owns the timing, and takes all of it back down again on the way out.
 */

import { useReducedMotion } from '@wobo/motion';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from '../../../shell/router';
import type { NightRefs, SundayRefs } from '../engine';
import { useClay, useDemo, usePenCursor, useScrollBeats } from '../engine';
import { Ask } from './Ask';
import { Close } from './Close';
import { Defs } from './defs';
import { Devices } from './Devices';
import { Faq } from './Faq';
import { Film } from './Film';
import { PageFooter } from './Footer';
import { Header } from './Header';
import { Hero } from './Hero';
import { Night } from './Night';
import { Parents } from './Parents';
import { ensurePageStyles } from './styles';
import { Subjects } from './Subjects';
import { Sunday } from './Sunday';
import { Tries } from './Tries';

/**
 * The stylesheet goes in at import time: the chunk arriving IS the page being opened, and an effect
 * would let the first paint land unstyled for a frame.
 */
ensurePageStyles();

/**
 * A portal host in the body, on one side of the app or the other.
 *
 * The element is made during render rather than in an effect, so the portal has somewhere to render
 * on the FIRST pass and the engine's effects find it already populated — a host created in an effect
 * arrives a render too late for hooks whose effects only ever run once. It is inserted in a layout
 * effect, which is before any passive effect in the same commit, and removed on the way out.
 */
function useBodyHost(
  className: string,
  where: 'before' | 'after',
  decorative = false,
): HTMLDivElement | null {
  const ref = useRef<HTMLDivElement | null>(null);
  if (ref.current === null && typeof document !== 'undefined') {
    const el = document.createElement('div');
    el.className = className;
    // The depth layer is decoration. The pen host is not — it carries the header.
    if (decorative) el.setAttribute('aria-hidden', 'true');
    ref.current = el;
  }
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof document === 'undefined') return;
    if (where === 'before' && document.body.firstChild) {
      document.body.insertBefore(el, document.body.firstChild);
    } else {
      document.body.appendChild(el);
    }
    return () => {
      el.remove();
    };
  }, [where]);
  return ref.current;
}

export function Landing() {
  const router = useRouter();
  const reduced = useReducedMotion();
  /** Every door on this page opens the same one: Wobo's onboarding, where signing in happens. */
  const start = () => router.navigate({ name: 'onboarding' });

  const root = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLElement>(null);
  const depthHostRef = useRef<HTMLElement | null>(null);
  const filmTile = useRef<HTMLDivElement>(null);
  const triesTile = useRef<HTMLDivElement>(null);

  // --- the hero's card ---
  const demo = {
    demo: useRef<HTMLDivElement>(null),
    bubble: useRef<HTMLDivElement>(null),
    lesson: useRef<SVGGElement>(null),
    pen: useRef<SVGGElement>(null),
    wobo: useRef<SVGGElement>(null),
  };

  // --- the night chapter ---
  const nightEls = {
    section: useRef<HTMLElement>(null),
    pin: useRef<HTMLDivElement>(null),
    scene: useRef<HTMLDivElement>(null),
    moon: useRef<SVGPathElement>(null),
    cone: useRef<SVGPathElement>(null),
    steam: useRef<SVGPathElement>(null),
    board: useRef<HTMLDivElement>(null),
    question: useRef<HTMLDivElement>(null),
    captions: [
      useRef<HTMLDivElement>(null),
      useRef<HTMLDivElement>(null),
      useRef<HTMLDivElement>(null),
      useRef<HTMLDivElement>(null),
    ] as const,
    lesson: useRef<SVGGElement>(null),
    pen: useRef<SVGGElement>(null),
    wobo: useRef<SVGGElement>(null),
  };

  // --- the Sunday chapter ---
  const sundayEls = {
    section: useRef<HTMLElement>(null),
    pin: useRef<HTMLDivElement>(null),
    envelope: useRef<HTMLDivElement>(null),
    flap: useRef<SVGPathElement>(null),
    letter: useRef<HTMLDivElement>(null),
  };

  /**
   * The chapters' own ref shape holds ELEMENTS, not React refs, and the hooks that read it key their
   * effects on its identity — so it has to be one stable object, filled in before those effects run.
   * A layout effect always runs before a passive one in the same commit, which is exactly the seam
   * this needs: the object below is created once and populated there, and the engine mounts once,
   * with every element already in it.
   */
  const chapters = useRef<{
    night: NightRefs & {
      lesson: typeof nightEls.lesson;
      pen: typeof nightEls.pen;
      wobo: typeof nightEls.wobo;
    };
    sunday: SundayRefs;
  }>({
    night: {
      section: null,
      pin: null,
      scene: null,
      moon: null,
      cone: null,
      steam: null,
      board: null,
      question: null,
      captions: [null, null, null, null],
      lesson: nightEls.lesson,
      pen: nightEls.pen,
      wobo: nightEls.wobo,
    },
    sunday: { section: null, pin: null, envelope: null, flap: null, letter: null },
  }).current;

  useLayoutEffect(() => {
    const n = chapters.night;
    n.section = nightEls.section.current;
    n.pin = nightEls.pin.current;
    n.scene = nightEls.scene.current;
    n.moon = nightEls.moon.current;
    n.cone = nightEls.cone.current;
    n.steam = nightEls.steam.current;
    n.board = nightEls.board.current;
    n.question = nightEls.question.current;
    n.captions = nightEls.captions.map((ref) => ref.current);
    const s = chapters.sunday;
    s.section = sundayEls.section.current;
    s.pin = sundayEls.pin.current;
    s.envelope = sundayEls.envelope.current;
    s.flap = sundayEls.flap.current;
    s.letter = sundayEls.letter.current;
  });

  const beats = useMemo(
    () => [
      { id: 'hero', ref: hero },
      { id: 'night', ref: nightEls.section },
      { id: 'sunday', ref: sundayEls.section },
    ],
    [nightEls.section, sundayEls.section],
  );
  const beatRefs = useMemo(
    () => ({ night: chapters.night, sunday: chapters.sunday, beats }),
    [chapters, beats],
  );

  // The page's paper is painted on the body, so the depth layer behind the page is not covered.
  useEffect(() => {
    document.body.classList.add('lv6-on');
    return () => document.body.classList.remove('lv6-on');
  }, []);

  // The hosts first: the engine's effects read `depth.current` on mount, and a host made later
  // would arrive after the only pass those effects ever make.
  const depthHost = useBodyHost('lv6 lv6-depth', 'before', true);
  const penHost = useBodyHost('lv6 lv6-pen-host', 'after');
  // Same element every render, so this is an assignment rather than a change.
  depthHostRef.current = depthHost;

  const pen = usePenCursor();
  useClay({ root, hero, depth: depthHostRef, film: filmTile });
  useDemo({
    lesson: demo.lesson,
    pen: demo.pen,
    wobo: demo.wobo,
    card: demo.demo,
    bubble: demo.bubble,
  });
  const beat = useScrollBeats(beatRefs);

  return (
    <div
      className="lv6 lv6-page"
      ref={root}
      data-beat={beat ?? undefined}
      data-motion={reduced ? 'off' : 'on'}
    >
      <Defs />

      {depthHost
        ? createPortal(
            <>
              <i className="b1" />
              <i className="b2" />
              <i className="b3" />
              <i className="b4" />
            </>,
            depthHost,
          )
        : null}

      {penHost && pen.active
        ? createPortal(
            <>
              <canvas className="lv6-trace" ref={pen.traceRef} aria-hidden="true" />
              <div className="lv6-nib" ref={pen.nibRef} aria-hidden="true">
                <div className="halo" />
                <div className="core" />
              </div>
            </>,
            penHost,
          )
        : null}

      {penHost ? createPortal(<Header onStart={start} onSignIn={start} />, penHost) : null}

      <main>
        <Hero refs={demo} sectionRef={hero} onLearner={start} onParent={start} />
        <Night refs={nightEls} />
        <Tries tileRef={triesTile} />
        <Sunday refs={sundayEls} />
        <Film tileRef={filmTile} />
        <Subjects />
        <Parents />
        <Ask />
        <Faq />
        <Devices />
        <Close onStart={start} />
      </main>

      <PageFooter />
    </div>
  );
}
