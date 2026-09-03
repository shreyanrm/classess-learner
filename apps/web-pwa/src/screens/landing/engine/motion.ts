/**
 * The page's smaller motions: things arriving, things landing, things drifting, things reaching.
 *
 * Everything in here is scoped to a root element rather than to the document, because this page is
 * one route inside an app — a global selector would reach into whatever else is mounted. Every
 * mount returns a disposer, and the triggers it creates are handed to the scroll handle so a route
 * change kills them with the rest.
 *
 * The values are the prototype's, to the digit: a reveal is 0.9 s of `power3.out` staggered by
 * 0.1 from 72% of the viewport, a tile lands on `back.out(1.4)` from 78%, a blob drifts 120 px per
 * layer, a float moves 720 px per unit of depth, and a magnet reaches 120 px and pulls 10.
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  FILM_START_FRACTION,
  REVEAL_START_FRACTION,
  startAt,
  TILE_START_FRACTION,
} from './choreography';
import type { Disposer } from './env';
import type { PointerState } from './pointer';
import { vectorTo } from './pointer';

/** How close the pointer has to come before a button reaches for it. */
export const MAGNET_RADIUS = 120;

/** How far a button will go to meet it. */
export const MAGNET_PULL = 10;

/** How far each depth blob drifts over the page — one layer further back per index. */
export function blobDrift(index: number): number {
  return -(index + 1) * 120;
}

/** How far a floating drawn object moves across the hero, from its declared depth. */
export function floatDrift(depth: number): number {
  return -180 * depth * 4;
}

/** The offset a magnetic button takes, or null when the pointer is out of its reach. */
export function magnetOffset(
  dx: number,
  dy: number,
  d: number,
  radius = MAGNET_RADIUS,
  pull = MAGNET_PULL,
): { x: number; y: number } | null {
  if (d >= radius) return null;
  const k = (1 - d / radius) * pull;
  return { x: (dx / d) * k, y: (dy / d) * k };
}

/** Query inside a root, always as an array. */
function all<T extends Element>(root: ParentNode, selector: string): T[] {
  return [...root.querySelectorAll<T>(selector)];
}

/**
 * Sections arrive: the hero (and the header with it) on load, everything else as its top crosses
 * the trigger line, with its handwritten headline swept by the marigold highlighter as it lands.
 */
export function mountReveals(root: ParentNode, hero: Element | null): Disposer {
  const tweens: gsap.core.Tween[] = [];
  const triggers: ScrollTrigger[] = [];

  // Which reveals wait for the scroll, and which arrive with the page. Working this out FIRST
  // matters: a single opening tween over every `.reveal` would record its start values on the next
  // tick — after the per-section `set` below — and then animate the whole page in at load, leaving
  // the scroll reveals with nothing left to reveal.
  const waiting = new Set<Element>();
  const sections: { section: HTMLElement; els: Element[] }[] = [];
  for (const section of all<HTMLElement>(root, 'section')) {
    const els = all(section, '.reveal');
    if (!els.length || section === hero) continue;
    for (const el of els) waiting.add(el);
    sections.push({ section, els });
    gsap.set(els, { opacity: 0, y: 24 });
  }

  // The hero and the header arrive on load, in the order they are read.
  const opening = all(root, '.reveal').filter((el) => !waiting.has(el));
  if (opening.length) {
    tweens.push(
      gsap.to(opening, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.08,
        delay: 0.1,
      }),
    );
  }

  // Everything else arrives as its section crosses the trigger line, with its headline swept by
  // the marigold highlighter as it lands.
  for (const { section, els } of sections) {
    triggers.push(
      ScrollTrigger.create({
        trigger: section,
        start: startAt(REVEAL_START_FRACTION),
        once: true,
        onEnter: () => {
          tweens.push(
            gsap.to(els, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.1 }),
          );
          for (const headline of all(section, 'h2.t')) headline.classList.add('in');
        },
      }),
    );
  }

  return () => {
    for (const tween of tweens) tween.kill();
    for (const trigger of triggers) trigger.kill();
  };
}

/** Tiles land with a spring, from below and slightly turned, and settle square. */
export function mountTiles(root: ParentNode): Disposer {
  const triggers: ScrollTrigger[] = [];
  const tweens: gsap.core.Tween[] = [];
  for (const tile of all<HTMLElement>(root, '.tile')) {
    gsap.set(tile, { y: 48, scale: 0.94, rotate: -1.5, opacity: 0 });
    triggers.push(
      ScrollTrigger.create({
        trigger: tile,
        start: startAt(TILE_START_FRACTION),
        once: true,
        onEnter: () => {
          tweens.push(
            gsap.to(tile, {
              y: 0,
              scale: 1,
              rotate: 0,
              opacity: 1,
              duration: 1,
              ease: 'back.out(1.4)',
            }),
          );
        },
      }),
    );
  }
  return () => {
    for (const tween of tweens) tween.kill();
    for (const trigger of triggers) trigger.kill();
  };
}

/** The film's lasso draws itself on entry, then says where to start, then offers the chip. */
export function mountFilmLasso(tile: Element | null): Disposer {
  if (!tile) return () => {};
  const tweens: gsap.core.Tween[] = [];
  const trigger = ScrollTrigger.create({
    trigger: tile,
    start: startAt(FILM_START_FRACTION),
    once: true,
    onEnter: () => {
      tweens.push(
        gsap.to(all(tile, '.lasso path'), {
          strokeDashoffset: 0,
          duration: 1.3,
          ease: 'power2.inOut',
          delay: 0.4,
        }),
        gsap.to(all(tile, '.lasso text'), { opacity: 1, duration: 0.4, delay: 1.6 }),
        gsap.to(all(tile, '.chip'), { opacity: 1, y: 0, duration: 0.4, delay: 1.8 }),
      );
    },
  });
  return () => {
    for (const tween of tweens) tween.kill();
    trigger.kill();
  };
}

/** The blurred colour blobs behind everything, drifting with the scroll, one layer per blob. */
export function mountDepth(blobs: readonly Element[]): Disposer {
  const tweens = blobs.map((blob, i) =>
    gsap.to(blob, { y: () => blobDrift(i), ease: 'none', scrollTrigger: { scrub: 1 } }),
  );
  return () => {
    for (const tween of tweens) {
      tween.scrollTrigger?.kill();
      tween.kill();
    }
  };
}

/** The drawn objects around the product card, at three depths, parallaxing off the hero. */
export function mountFloats(root: ParentNode, hero: Element | null): Disposer {
  if (!hero) return () => {};
  const tweens = all<HTMLElement>(root, '.float').map((float) =>
    gsap.to(float, {
      y: () => floatDrift(Number(float.dataset.depth ?? 0)),
      ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 },
    }),
  );
  return () => {
    for (const tween of tweens) {
      tween.scrollTrigger?.kill();
      tween.kill();
    }
  };
}

export interface FrameHandle {
  frame(): void;
  dispose: Disposer;
}

/**
 * Buttons reach for the pointer. Driven from the page's one frame loop rather than from a listener
 * per button, and every transform is cleared on dispose so nothing is left displaced.
 */
export function mountMagnets(
  root: ParentNode,
  pointer: PointerState,
  enabled: boolean,
): FrameHandle {
  const buttons = enabled ? all<HTMLElement>(root, '.btn') : [];
  return {
    frame() {
      if (!pointer.has) return;
      for (const button of buttons) {
        const rect = button.getBoundingClientRect();
        const { dx, dy, d } = vectorTo(
          pointer,
          rect.left + rect.width / 2,
          rect.top + rect.height / 2,
        );
        const offset = magnetOffset(dx, dy, d);
        if (offset)
          button.style.transform = `translate(${offset.x.toFixed(1)}px, ${offset.y.toFixed(1)}px)`;
        else if (button.style.transform) button.style.transform = '';
      }
    },
    dispose() {
      for (const button of buttons) button.style.transform = '';
    },
  };
}

/**
 * The still page. Under reduced motion nothing animates in, so everything that would have been
 * revealed is simply put where it belongs, once.
 */
export function settleStill(root: ParentNode): void {
  // The page's own stylesheet puts the reveals back under `data-motion="off"`; clearing the props
  // here means nothing this engine wrote is left fighting it.
  gsap.set(all(root, '.reveal'), { clearProps: 'all' });
  gsap.set(all(root, '.tile'), { clearProps: 'all' });
  for (const headline of all(root, 'h2.t')) headline.classList.add('in');
  gsap.set(all(root, '.lasso path'), { strokeDashoffset: 0 });
  gsap.set(all(root, '.lasso text'), { opacity: 1 });
  gsap.set(all(root, '.chip'), { opacity: 1, y: 0 });
}
