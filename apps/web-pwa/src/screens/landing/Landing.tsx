'use client';

/**
 * The landing page — what someone who has never met Wobo sees first.
 *
 * It is the unauthenticated root route, and it is a faithful port of the owner-approved prototype
 * (`scratchpad/design/landing-v7.html`): the same composition, the same copy word for word, the
 * same colours, densities and timings. This file is only the assembly — the words are in `copy.ts`,
 * the look is in `styles.ts`, the drawn pieces are in `art.tsx`, each chapter is its own section,
 * and every piece of motion belongs to `engine/**`.
 *
 * Two structural decisions worth knowing before changing anything here:
 *
 *  1. THE CHROME IS PORTALLED. The app wraps every screen in an element carrying
 *     `will-change: transform`, which makes that element the containing block for `position: fixed`
 *     descendants. Anything genuinely fixed — the header, the depth layer, the pen and its ribbon —
 *     would therefore be pinned to the page rather than to the viewport and would scroll away. All
 *     four are rendered into a host inserted at the FRONT of `<body>`: in the body so they are
 *     fixed to the viewport, at the front so the depth blobs paint behind the app rather than over
 *     it, while the header, the ribbon and the nib carry z-indices that lift them above it.
 *  2. THE ENGINE OWNS EVERY REF. `useClay`, `useDemo`, `useScrollBeats` and `usePenCursor` take
 *     handles rather than hunting the document, so the bundles below are built once and kept
 *     stable — a bundle rebuilt per render would tear down and remount the whole choreography on
 *     every keystroke in the ask box.
 *
 * Every door on the page (Get started, Sign in, both hero buttons, the close) opens Wobo's
 * onboarding flow, which is where the sign-in beat lives.
 */

import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from '../../shell/router';
import { LandingDefs } from './art';
import {
  type DemoRefs,
  type NightSectionRefs,
  type SundaySectionRefs,
  useClay,
  useDemo,
  usePenCursor,
  useScrollBeats,
} from './engine';
import { ensureLandingStyles, ROOT } from './page-styles';
import { Ask } from './sections/Ask';
import { Close } from './sections/Close';
import { Devices } from './sections/Devices';
import { Faq } from './sections/Faq';
import { Header } from './sections/Header';
import { Hero } from './sections/Hero';
import { Night } from './sections/Night';
import { PageFooter } from './sections/PageFooter';
import { ParentsNote } from './sections/ParentsNote';
import { Practice } from './sections/Practice';
import { Safe } from './sections/Safe';
import { Students } from './sections/Students';
import { Subjects } from './sections/Subjects';
import { Why } from './sections/Why';

// The chunk arriving IS the page being opened, so the stylesheet goes in at import time rather than
// in an effect — an effect would let the first paint land unstyled for a frame.
ensureLandingStyles();

/**
 * A host for the fixed chrome, inserted at the front of `<body>` (see the note above). It carries
 * the page's own root class, so every token and every rule in `page-styles.ts` still reaches it.
 *
 * THE ELEMENT IS MADE DURING RENDER AND ATTACHED IN A LAYOUT EFFECT, and both halves of that
 * matter. Built in a state-setting effect instead — created, inserted, then handed back through
 * setState — the host does not exist on the first commit, so the portal below renders nothing, so
 * `#nib` and `#trace` are not in the document when the engine's effects run and `usePenCursor` and
 * `useClay` bind to null. Their effects depend on ref objects that never change identity, so they
 * never run again: the pen, its ribbon and the depth blobs' scroll drift are silently dead for the
 * life of the page. That is exactly what the proof pass found — a ribbon canvas with zero painted
 * pixels and a nib that had never been given a transform.
 *
 * Creating the node in render is safe and idempotent: it is stored in a ref, so React's double
 * render in development makes one element, not two. It is detached until the layout effect puts it
 * in the body, and React mounts portal children into a detached container perfectly well — the
 * refs are assigned on the same commit. Every layout effect runs before any passive effect, so the
 * host is in the document before the engine looks for anything inside it, whatever order the hooks
 * are called in.
 */
function useChromeHost(): HTMLDivElement | null {
  const ref = useRef<HTMLDivElement | null>(null);
  if (ref.current === null && typeof document !== 'undefined') {
    const el = document.createElement('div');
    el.className = `${ROOT} chrome`;
    ref.current = el;
  }
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof document === 'undefined') return;
    document.body.insertBefore(el, document.body.firstChild);
    return () => el.remove();
  }, []);
  return ref.current;
}

export function Landing() {
  const router = useRouter();

  // --- the handles the engine drives ------------------------------------------------------------
  const rootRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const depthRef = useRef<HTMLDivElement>(null);

  const demoCard = useRef<HTMLElement>(null);
  const demoBubble = useRef<HTMLElement>(null);
  const demoLesson = useRef<SVGGElement>(null);
  const demoPen = useRef<SVGGElement>(null);
  const demoWobo = useRef<SVGElement>(null);

  const nightSection = useRef<HTMLElement>(null);
  const nightPin = useRef<HTMLElement>(null);
  const nightScene = useRef<HTMLElement>(null);
  const nightMoon = useRef<SVGElement>(null);
  const nightCone = useRef<SVGElement>(null);
  const nightSteam = useRef<SVGElement>(null);
  const nightBoard = useRef<HTMLElement>(null);
  const nightQuestion = useRef<HTMLElement>(null);
  const nightLesson = useRef<SVGGElement>(null);
  const nightPen = useRef<SVGGElement>(null);
  const nightWobo = useRef<SVGElement>(null);
  const caption1 = useRef<HTMLElement>(null);
  const caption2 = useRef<HTMLElement>(null);
  const caption3 = useRef<HTMLElement>(null);
  const caption4 = useRef<HTMLElement>(null);

  const sundaySection = useRef<HTMLElement>(null);
  const sundayPin = useRef<HTMLElement>(null);
  const sundayEnvelope = useRef<HTMLElement>(null);
  const sundayFlap = useRef<SVGPathElement>(null);
  const sundayLetter = useRef<HTMLElement>(null);

  // Built once. The engine's effects depend on these objects by identity, so a fresh object per
  // render would remount two pinned chapters and a fourteen-second lesson loop on every render.
  const demoRefs = useMemo<DemoRefs>(
    () => ({
      demo: demoCard,
      bubble: demoBubble,
      lesson: demoLesson,
      pen: demoPen,
      wobo: demoWobo,
    }),
    [],
  );
  const nightRefs = useMemo<NightSectionRefs>(
    () => ({
      section: nightSection,
      pin: nightPin,
      scene: nightScene,
      moon: nightMoon,
      cone: nightCone,
      steam: nightSteam,
      board: nightBoard,
      question: nightQuestion,
      captions: [caption1, caption2, caption3, caption4],
      lesson: nightLesson,
      pen: nightPen,
      wobo: nightWobo,
    }),
    [],
  );
  const sundayRefs = useMemo<SundaySectionRefs>(
    () => ({
      section: sundaySection,
      pin: sundayPin,
      envelope: sundayEnvelope,
      flap: sundayFlap,
      letter: sundayLetter,
    }),
    [],
  );
  const beatRefs = useMemo(
    () => ({ night: nightRefs, sunday: sundayRefs }),
    [nightRefs, sundayRefs],
  );

  // The fixed chrome — the paper, the depth blobs, the ribbon, the nib and the header. Claimed
  // BEFORE the engine hooks below, because they bind to elements that live inside it.
  const host = useChromeHost();

  // --- the motion -------------------------------------------------------------------------------
  useClay({ root: rootRef, hero: heroRef, depth: depthRef });
  useDemo(demoRefs);
  useScrollBeats(beatRefs);
  const { nibRef, traceRef, active: penActive } = usePenCursor(rootRef);

  // Every door leads to the same place: Wobo's onboarding, where signing in happens.
  const start = useCallback(() => router.navigate({ name: 'onboarding' }), [router]);

  const chrome = host
    ? createPortal(
        <>
          {/* The paper itself, fixed under everything. It lives here rather than on the page root so
              the blobs below can drift BEHIND the page's content; see the note in `page-styles.ts`. */}
          <div className="ground" aria-hidden="true" />
          {/* Depth, not dust: four wide, blurred colour blobs that drift as the page scrolls. */}
          <div id="depth" aria-hidden="true" ref={depthRef}>
            <i className="b1" />
            <i className="b2" />
            <i className="b3" />
            <i className="b4" />
          </div>
          {/* Both layers are always in the DOM, never gated on `penActive`. The engine's cursor
              hook reads these two refs in its own first effect, and an element that is not
              rendered until a state change AFTER that effect is an element the engine never sees —
              the pen would simply never appear. They cost nothing when the pen is off: the nib is
              `display: none` outside a fine pointer and under reduced motion, and the canvas is an
              empty, pointer-transparent layer that nothing ever draws into. */}
          <canvas id="trace" aria-hidden="true" tabIndex={-1} ref={traceRef} />
          <div id="nib" aria-hidden="true" ref={nibRef} data-pen={penActive ? 'on' : 'off'}>
            <div className="core" />
          </div>
          <Header onStart={start} onSignIn={start} />
        </>,
        host,
      )
    : null;

  return (
    <div className={ROOT} ref={rootRef} data-motion="on">
      <LandingDefs />
      {chrome}
      <main>
        <Hero onStart={start} refs={demoRefs} sectionRef={heroRef} />
        <Night refs={nightRefs} />
        <Why />
        <Students />
        <Practice />
        <ParentsNote refs={sundayRefs} />
        <Subjects />
        <Safe />
        <Ask />
        <Faq />
        <Devices />
        <Close onStart={start} />
      </main>
      <PageFooter />
    </div>
  );
}
