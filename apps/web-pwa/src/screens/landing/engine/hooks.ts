/**
 * The React surface of the engine: four hooks, each of which mounts a piece of the landing page's
 * behaviour and — this is the whole point — takes ALL of it back down again.
 *
 * The landing page is one route inside an app. Everything started here is therefore scoped and
 * reversible: one rAF loop per hook and it is cancelled, listeners are removed, GSAP triggers are
 * killed, Lenis is destroyed, the canvas is cleared, and the marks that hide the native cursor
 * come off the page root and `<body>`. A mount/unmount cycle leaves the document as it found it.
 *
 * The pointer is shared by reference count rather than tracked four times (see `pointer.ts`), so
 * the nib, the ribbon, the magnets and the card's tilt all read the same position in the same
 * frame.
 *
 * The ref shapes here are the ones the section components hand out, so a page composes as:
 *
 *     useClay({ root, hero, depth, film });
 *     useDemo(heroRefs);
 *     const beat = useScrollBeats({ night: nightRefs, sunday: sundayRefs });
 *     const { nibRef, traceRef, active } = usePenCursor(root);
 */

import { type RefObject, useEffect, useRef, useState } from 'react';
import { mountNight, mountSunday } from './chapters';
import { nextBeat } from './choreography';
import { applyTilt, bubbleGone, createLesson, DEMO_HOLD, DEMO_MS, demoPhase } from './demo';
import { type Disposer, disposeAll, finePointer, prefersReducedMotion } from './env';
import {
  mountDepth,
  mountFilmLasso,
  mountFloats,
  mountMagnets,
  mountReveals,
  mountTiles,
  settleStill,
} from './motion';
import { mountNib } from './nib';
import { acquirePointer } from './pointer';
import { mountRibbon } from './ribbon';
import { registerScrollTrigger, startScroll } from './scroll';

type Ref<T> = RefObject<T | null>;

/** Read a ref, falling back to a selector inside a root — sections that hand out no ref still work. */
function resolve<T extends Element>(
  ref: Ref<T> | undefined,
  root: ParentNode | null,
  selector: string,
): T | null {
  return ref?.current ?? root?.querySelector<T>(selector) ?? null;
}

// --- The pen ------------------------------------------------------------------------------------

export interface PenCursorHandles {
  /** Attach to the nib element (the one holding `.core`). */
  nibRef: Ref<HTMLDivElement>;
  /** Attach to the full-viewport canvas the ribbon is drawn on. */
  traceRef: Ref<HTMLCanvasElement>;
  /** False on a touch device or under reduced motion — the caller can skip rendering both layers. */
  active: boolean;
}

/**
 * The pen of light and the ribbon it leaves. Inert — and rendering nothing — on a coarse pointer or
 * under reduced motion, which is also when the native cursor is left alone.
 *
 * `scope` is the landing route's root: the cursor takeover is marked on it rather than on the
 * document, so it cannot outlive this page.
 */
export function usePenCursor(scope?: Ref<HTMLElement>): PenCursorHandles {
  const nibRef = useRef<HTMLDivElement | null>(null);
  const traceRef = useRef<HTMLCanvasElement | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const on = finePointer() && !prefersReducedMotion();
    setActive(on);
    if (!on) return;
    const { state, release } = acquirePointer();
    const nib = mountNib(nibRef.current, { pointer: state, scope: scope?.current ?? null });
    const ribbon = mountRibbon(traceRef.current, { pointer: state });
    return () => {
      nib.dispose();
      ribbon.dispose();
      release();
    };
  }, [scope]);

  return { nibRef, traceRef, active };
}

// --- The page's material ------------------------------------------------------------------------

export interface ClayRefs {
  /** The landing route's root element. Every selector in the engine is scoped to it. */
  root: Ref<HTMLElement>;
  /** The hero section, which the floats parallax against. Falls back to `#hero`. */
  hero?: Ref<HTMLElement>;
  /** The fixed layer holding the blurred colour blobs. Falls back to `.lv6-depth`. */
  depth?: Ref<HTMLElement>;
  /** The tile holding the film still, whose lasso draws on entry. Falls back to `#filmTile`. */
  film?: Ref<HTMLElement>;
}

/**
 * The clay the page is shaped from: inertia scroll, section reveals, tile springs, highlight
 * sweeps, drifting depth blobs, parallaxing floats, and buttons that reach for the pointer.
 *
 * Reduced motion takes the other path entirely — no Lenis, no triggers, no loop. Everything is
 * placed at its settled state once, and `data-motion="off"` on the page root lets the stylesheet
 * put back anything that would otherwise have waited for a reveal that is never coming.
 */
export function useClay(refs: ClayRefs): void {
  const { root: rootRef, hero: heroRef, depth: depthRef, film: filmRef } = refs;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    registerScrollTrigger();

    const reduced = prefersReducedMotion();
    root.setAttribute('data-motion', reduced ? 'off' : 'on');
    if (reduced) {
      settleStill(root);
      return () => root.removeAttribute('data-motion');
    }

    const hero = resolve(heroRef, root, '#hero');
    const film = resolve(filmRef, root, '#filmTile');
    const depth = depthRef?.current ?? document.querySelector<HTMLElement>('.lv6-depth');

    const scroll = startScroll();
    const disposers: Disposer[] = [];
    disposers.push(mountReveals(root, hero));
    disposers.push(mountTiles(root));
    disposers.push(mountFilmLasso(film));
    disposers.push(mountFloats(root, hero));
    if (depth) disposers.push(mountDepth([...depth.children]));

    const { state, release } = acquirePointer();
    const magnets = mountMagnets(root, state, finePointer());
    let frame = requestAnimationFrame(function loop() {
      if (!document.hidden) magnets.frame();
      frame = requestAnimationFrame(loop);
    });

    // Measure once the first frame has laid out, or every pin starts from a stale height.
    const measure = requestAnimationFrame(() => scroll.refresh());

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(measure);
      magnets.dispose();
      release();
      disposeAll(disposers);
      scroll.destroy();
      root.removeAttribute('data-motion');
    };
  }, [rootRef, heroRef, depthRef, filmRef]);
}

// --- The hero's lesson --------------------------------------------------------------------------

/** The refs the hero section hands out. */
export interface DemoRefs {
  /** The tinted product card, which tilts toward the pointer. */
  demo: Ref<HTMLElement>;
  /** The learner's question, which clears off the board once the drawing starts. */
  bubble: Ref<HTMLElement>;
  /** The `<g>` holding the marks, each carrying `data-s` and `data-e`. */
  lesson: Ref<SVGGElement>;
  /** The pen group that travels along them. */
  pen: Ref<SVGGElement>;
  /** The mini Wobo whose eyes follow the pen. */
  wobo: Ref<SVGElement>;
}

/**
 * The hero's timed lesson: fourteen seconds of Wobo drawing the proof, three and a half seconds
 * holding the finished board, then again. Under reduced motion the board is simply drawn — the
 * proof is the content, so it is never withheld; only the animation of it is.
 */
export function useDemo(refs: DemoRefs): void {
  const { demo: cardRef, bubble: bubbleRef, lesson: lessonRef, pen: penRef, wobo: woboRef } = refs;

  useEffect(() => {
    const lesson = createLesson(lessonRef.current, penRef.current, woboRef.current);
    if (!lesson.count) return;
    const bubble = bubbleRef.current;
    const card = cardRef.current;

    if (prefersReducedMotion()) {
      lesson.draw(1);
      bubble?.classList.add('gone');
      return () => {
        lesson.reset();
        bubble?.classList.remove('gone');
      };
    }

    const { state, release } = acquirePointer();
    const start = performance.now();
    let frame = requestAnimationFrame(function loop(time: number) {
      if (!document.hidden) {
        const p = demoPhase(time - start, DEMO_MS, DEMO_HOLD);
        bubble?.classList.toggle('gone', bubbleGone(p));
        lesson.draw(p);
        applyTilt(card, state, window);
      }
      frame = requestAnimationFrame(loop);
    });

    return () => {
      cancelAnimationFrame(frame);
      release();
      lesson.reset();
      bubble?.classList.remove('gone');
      card?.style.removeProperty('--rx');
      card?.style.removeProperty('--ry');
    };
  }, [cardRef, bubbleRef, lessonRef, penRef, woboRef]);
}

// --- The chapters -------------------------------------------------------------------------------

/** The refs the night section hands out. */
export interface NightSectionRefs {
  section: Ref<HTMLElement>;
  pin: Ref<HTMLElement>;
  scene: Ref<HTMLElement>;
  moon: Ref<SVGElement>;
  cone: Ref<SVGElement>;
  steam: Ref<SVGElement>;
  board: Ref<HTMLElement>;
  question: Ref<HTMLElement>;
  captions: readonly Ref<HTMLElement>[];
  lesson: Ref<SVGGElement>;
  pen: Ref<SVGGElement>;
  wobo: Ref<SVGElement>;
}

/** The refs the Sunday section hands out. */
export interface SundaySectionRefs {
  section: Ref<HTMLElement>;
  pin: Ref<HTMLElement>;
  envelope: Ref<HTMLElement>;
  flap: Ref<SVGPathElement>;
  letter: Ref<HTMLElement>;
}

export interface ScrollBeatRefs {
  night: NightSectionRefs;
  sunday: SundaySectionRefs;
  /** Sections whose arrival names the beat, for anything that wants to know where the reader is. */
  beats?: readonly { id: string; ref: Ref<HTMLElement> }[];
}

/**
 * The two pinned chapters, plus the name of the beat the reader is currently on. The beat is
 * reported rather than acted on here — it is what lets a caption be announced, or a header change
 * tone, without another observer being wired up somewhere else.
 */
export function useScrollBeats(refs: ScrollBeatRefs): string | null {
  const [beat, setBeat] = useState<string | null>(null);
  const { night, sunday, beats } = refs;

  useEffect(() => {
    registerScrollTrigger();
    const reduced = prefersReducedMotion();
    const lesson = createLesson(night.lesson.current, night.pen.current, night.wobo.current);
    const disposers: Disposer[] = [];

    disposers.push(
      mountNight(
        {
          section: night.section.current,
          pin: night.pin.current,
          scene: night.scene.current,
          moon: night.moon.current,
          cone: night.cone.current,
          steam: night.steam.current,
          board: night.board.current,
          question: night.question.current,
          captions: night.captions.map((caption) => caption.current),
        },
        (p) => lesson.draw(p),
        { reduced },
      ),
    );
    disposers.push(
      mountSunday(
        {
          section: sunday.section.current,
          pin: sunday.pin.current,
          envelope: sunday.envelope.current,
          flap: sunday.flap.current,
          letter: sunday.letter.current,
        },
        { reduced },
      ),
    );

    const watched = (beats ?? []).flatMap((entry) => {
      const el = entry.ref.current;
      return el ? [{ id: entry.id, el }] : [];
    });
    if (watched.length && typeof IntersectionObserver !== 'undefined') {
      const byElement = new Map(watched.map((entry) => [entry.el, entry.id]));
      const observer = new IntersectionObserver(
        (entries) => {
          const seen = entries.flatMap((entry) => {
            const id = byElement.get(entry.target as HTMLElement);
            return id ? [{ id, visible: entry.isIntersecting }] : [];
          });
          setBeat((current) => nextBeat(current, seen));
        },
        { rootMargin: '-40% 0px -40% 0px' },
      );
      for (const entry of watched) observer.observe(entry.el);
      disposers.push(() => observer.disconnect());
    }

    return () => {
      disposeAll(disposers);
      lesson.reset();
    };
  }, [night, sunday, beats]);

  return beat;
}
