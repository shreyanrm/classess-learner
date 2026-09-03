/**
 * The two cinematic chapters — Tuesday 9:40 pm, and Sunday 6 pm.
 *
 * Both are pinned and scrubbed: the section sticks to the viewport and the scroll wheel becomes
 * the transport for a timeline, so the reader is not watching an animation play, they are moving
 * it. The night runs 4200 px of scroll; the Sunday note runs 1800.
 *
 * The beats come from `choreography.ts` so the score is one readable table rather than a wall of
 * tween positions, and so the caption hand-overs can be tested. What lives here is only the
 * binding of that score to real elements.
 *
 * Under reduced motion neither chapter is built at all. Instead each is placed at its END state —
 * the proof drawn, the board up, the letter out of the envelope, the last caption held — so a
 * reader who asked for stillness gets the whole story as one composed frame rather than a blank
 * pinned section.
 */

import { gsap } from 'gsap';
import {
  NIGHT_BOARD_IN,
  NIGHT_CAPTIONS,
  NIGHT_DRAW,
  NIGHT_QUESTION_OUT,
  NIGHT_SCENE_OUT,
  NIGHT_SCRUB_PX,
  NIGHT_TAIL,
  NIGHT_ZOOM,
  SCRUB,
  SUNDAY_ENV_BACK,
  SUNDAY_ENV_IN,
  SUNDAY_FLAP,
  SUNDAY_LETTER_IN,
  SUNDAY_SCRUB_PX,
  SUNDAY_TAIL,
} from './choreography';
import type { Disposer } from './env';

/** Everything the night chapter moves. Any of them may be null; the timeline just skips it. */
export interface NightRefs {
  section: HTMLElement | null;
  pin: HTMLElement | null;
  scene: HTMLElement | null;
  moon: SVGElement | null;
  cone: SVGElement | null;
  steam: SVGElement | null;
  board: HTMLElement | null;
  question: HTMLElement | null;
  /** The four captions, in order. */
  captions: readonly (HTMLElement | null)[];
}

export interface ChapterOptions {
  /** Skip the timeline and place the chapter at its end state. */
  reduced?: boolean;
}

/**
 * HOW A CHAPTER IS PINNED, and why it is not the default.
 *
 * ScrollTrigger's default `pinType` is `'fixed'`: it holds the section still by switching it to
 * `position: fixed`. The app wraps every screen in an element that carries `will-change: transform`
 * (App.tsx), and that hint alone makes the wrapper the containing block for every fixed descendant
 * — so a "fixed" chapter resolves its offsets against the page instead of the viewport and simply
 * scrolls away. Both chapters rendered as an empty band; the first proof pass caught it.
 *
 * `'transform'` pins by translating the section instead, which needs no containing block and is
 * what ScrollTrigger itself picks whenever the scroller is not the document. It is correct inside
 * ANY transformed ancestor, so the page no longer depends on a global override of the app's own
 * hint, and the screen transition keeps the hint it was given.
 */
const PIN_TYPE = 'transform' as const;

/** A target GSAP can accept, or null if the element is not on the page. */
function target<T extends Element>(el: T | null): T[] {
  return el ? [el] : [];
}

/**
 * The night. The room settles, the moon rises, the lamp lights, the tea steams; two captions hand
 * over; the camera pushes into the phone and the phone becomes the board; the proof is drawn by
 * the scroll; and it closes on "9:46 pm. Oh."
 */
export function mountNight(
  refs: NightRefs,
  draw: (progress: number) => void,
  options: ChapterOptions = {},
): Disposer {
  if (options.reduced) {
    // The still. Everything the chapter would ever show is shown at once, because there is no
    // scroll to hand one beat to the next: the room stays lit, the question stays above the board,
    // the board is already drawn, and ALL FOUR captions are visible — the stylesheet's
    // reduced-motion block lays them out in flow so they read as four paragraphs instead of a
    // stack. Settling on the last beat, which is what this used to do, silently dropped the desk
    // scene and three of the four captions for every reader who asked for less motion.
    gsap.set(target(refs.scene), { opacity: 1, scale: 1, y: 0 });
    gsap.set(target(refs.board), { scale: 1, opacity: 1 });
    gsap.set(target(refs.question), { opacity: 1, y: 0 });
    gsap.set(target(refs.moon), { opacity: 1, y: 0 });
    gsap.set(target(refs.cone), { opacity: 0.7 });
    gsap.set(target(refs.steam), { opacity: 1 });
    for (const caption of refs.captions) {
      if (caption) gsap.set(caption, { opacity: 1, y: 0 });
    }
    draw(1);
    return () => {};
  }

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: refs.section,
      start: 'top top',
      end: `+=${NIGHT_SCRUB_PX}`,
      pin: refs.pin ?? undefined,
      pinType: PIN_TYPE,
      scrub: SCRUB,
      anticipatePin: 1,
    },
  });

  const scene = target(refs.scene);
  tl.fromTo(scene, { scale: 1.06, y: 40 }, { scale: 1, y: 0, duration: 1, ease: 'none' }, 0)
    .fromTo(target(refs.moon), { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, 0.05)
    .to(target(refs.cone), { opacity: 0.7, duration: 0.6 }, 0.2)
    .to(target(refs.steam), { opacity: 1, duration: 0.4 }, 0.4);

  // The captions, each arriving from below and leaving upward, in the order they hand over.
  NIGHT_CAPTIONS.forEach((caption, i) => {
    const el = target(refs.captions[i] ?? null);
    if (!el.length) return;
    tl.fromTo(el, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.3 }, caption.in);
    if (caption.out !== null) tl.to(el, { opacity: 0, y: -16, duration: 0.3 }, caption.out);
  });

  tl.to(
    scene,
    {
      scale: NIGHT_ZOOM.scale,
      x: NIGHT_ZOOM.x,
      y: NIGHT_ZOOM.y,
      duration: NIGHT_ZOOM.duration,
      ease: 'power2.inOut',
    },
    NIGHT_ZOOM.at,
  )
    .to(scene, { opacity: 0, duration: NIGHT_SCENE_OUT.duration }, NIGHT_SCENE_OUT.at)
    .fromTo(
      target(refs.board),
      { scale: 0.3, opacity: 0 },
      { scale: 1, opacity: 1, duration: NIGHT_BOARD_IN.duration, ease: 'power2.out' },
      NIGHT_BOARD_IN.at,
    )
    .to(
      target(refs.question),
      { opacity: 0, y: -8, duration: NIGHT_QUESTION_OUT.duration },
      NIGHT_QUESTION_OUT.at,
    )
    .to(
      { p: 0 },
      {
        p: 1,
        duration: NIGHT_DRAW.duration,
        ease: 'none',
        onUpdate() {
          const [holder] = this.targets() as { p: number }[];
          if (holder) draw(holder.p);
        },
      },
      NIGHT_DRAW.at,
    )
    .to({}, { duration: NIGHT_TAIL });

  return () => {
    tl.scrollTrigger?.kill();
    tl.kill();
  };
}

/** Everything the Sunday chapter moves. */
export interface SundayRefs {
  section: HTMLElement | null;
  pin: HTMLElement | null;
  envelope: HTMLElement | null;
  flap: SVGPathElement | null;
  letter: HTMLElement | null;
}

/**
 * Sunday. The envelope arrives, its flap folds back, the letter rises out of it with depth, and
 * the envelope settles behind — the week, in one honest note.
 */
export function mountSunday(refs: SundayRefs, options: ChapterOptions = {}): Disposer {
  if (options.reduced) {
    gsap.set(target(refs.envelope), { yPercent: 18, opacity: 0.5, rotate: -2, scale: 0.96 });
    if (refs.flap) refs.flap.setAttribute('d', SUNDAY_FLAP.d);
    gsap.set(target(refs.letter), { yPercent: -8, opacity: 1, rotate: -1.5, scale: 1 });
    return () => {};
  }

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: refs.section,
      start: 'top top',
      end: `+=${SUNDAY_SCRUB_PX}`,
      pin: refs.pin ?? undefined,
      pinType: PIN_TYPE,
      scrub: SCRUB,
      anticipatePin: 1,
    },
  });

  const envelope = target(refs.envelope);
  tl.fromTo(
    envelope,
    { yPercent: 30, opacity: 0, rotate: -6 },
    { yPercent: 0, opacity: 1, rotate: -2, duration: SUNDAY_ENV_IN.duration, ease: 'power2.out' },
    SUNDAY_ENV_IN.at,
  )
    .to(
      target(refs.flap),
      { attr: { d: SUNDAY_FLAP.d }, duration: SUNDAY_FLAP.duration },
      SUNDAY_FLAP.at,
    )
    .fromTo(
      target(refs.letter),
      { yPercent: 20, opacity: 0, rotate: 4, scale: 0.9 },
      {
        yPercent: -8,
        opacity: 1,
        rotate: -1.5,
        scale: 1,
        duration: SUNDAY_LETTER_IN.duration,
        ease: 'power2.out',
      },
      SUNDAY_LETTER_IN.at,
    )
    .to(
      envelope,
      { yPercent: 18, opacity: 0.5, scale: 0.96, duration: SUNDAY_ENV_BACK.duration },
      SUNDAY_ENV_BACK.at,
    )
    .to({}, { duration: SUNDAY_TAIL });

  return () => {
    tl.scrollTrigger?.kill();
    tl.kill();
  };
}
