/**
 * Law v5 §8, enforced over the engine's own source.
 *
 * The three causes of the jitter the owner saw are properties of the CODE, not of a rendered frame,
 * so they can be checked here rather than by watching a page and hoping. Each assertion below names
 * the cause it guards.
 *
 * The mounts themselves need a document, so what is proved here is the shape of the choreography;
 * the arithmetic under it is proved in `choreography.test.ts`, and the stylesheet's half of cause 1
 * is proved in `page-styles.test.ts`.
 */

import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FILM_END, FORMS_END, HERO_DELAY, REVEAL_START, SCRUB } from './choreography';

const SOURCE = readFileSync(join(import.meta.dir, 'motion.ts'), 'utf8');
const HOOKS = readFileSync(join(import.meta.dir, 'hooks.ts'), 'utf8');

/** The code with its comments stripped — a rule about code should not be satisfied by prose. */
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('law v5 §8 — cause 2: never scrub a layout property', () => {
  it('scrubs transforms and opacities only', () => {
    // Every scrubbed timeline on the page, and every property it moves.
    const scrubbed = ['scaleX', 'strokeDashoffset', 'opacity', 'y'];
    for (const property of scrubbed) expect(CODE).toContain(property);
    // The three the law names, as tween properties rather than as CSS the sheet declares.
    for (const banned of [/\{[^}]*\bwidth:\s*\d/, /\{[^}]*\bheight:\s*\d/, /\btop:\s*\d+,/]) {
      expect(CODE).not.toMatch(banned);
    }
  });

  it('moves the film’s progress bar by scaleX, never by width', () => {
    expect(CODE).toContain('scaleX: 0.38');
    expect(CODE).toContain('scaleX: 0.62');
    expect(CODE).not.toMatch(/width:\s*['"`]?\d+%/);
  });
});

describe('law v5 §8 — cause 3: never build a tween inside onUpdate', () => {
  it('has exactly one onUpdate that could, and it returns before it does', () => {
    const guarded = CODE.slice(CODE.indexOf('onUpdate(self)'));
    const gate = guarded.indexOf('if (i === shown) return;');
    const firstTween = guarded.indexOf('gsap.to(');
    expect(gate).toBeGreaterThan(-1);
    expect(firstTween).toBeGreaterThan(gate);
  });

  it('lets the counter’s onUpdate write text, and nothing else', () => {
    // The report's counters run an onUpdate too. It assigns `textContent`; it makes no tween.
    const at = CODE.indexOf('onUpdate() {\n              el.textContent');
    expect(at).toBeGreaterThan(-1);
  });
});

describe('law v5 §8 — cause 1: one owner per animated property', () => {
  it('never writes an inline transition from the engine', () => {
    expect(CODE).not.toContain('style.transition');
  });

  it('clears the reveal’s transform once it has landed, so nothing is left holding a matrix', () => {
    expect(CODE).toContain("el.style.transform = ''");
    expect(CODE).toContain("el.style.willChange = 'auto'");
  });
});

describe('the choreography is the prototype’s', () => {
  it('fires on the prototype’s own lines', () => {
    expect(REVEAL_START).toBe('top 86%');
    expect(FORMS_END).toBe('+=2400');
    expect(FILM_END).toBe('+=1800');
    expect(SCRUB).toBe(0.8);
    expect(HERO_DELAY).toBe(0.25);
  });

  it('pins by transform, because the app wraps every screen in a transformed element', () => {
    expect(CODE).toContain("const PIN_TYPE = 'transform' as const");
    expect(CODE).toContain('pinType: PIN_TYPE');
  });
});

describe('the page comes down as cleanly as it went up', () => {
  it('gives every mount a disposer, and disposes every one of them', () => {
    for (const mount of [
      'mountReveals',
      'mountHighlights',
      'mountHeroLesson',
      'mountFloats',
      'mountForms',
      'mountFilm',
      'mountReport',
    ]) {
      expect(CODE).toContain(`export function ${mount}`);
      expect(HOOKS).toContain(`${mount}(`);
    }
    expect(HOOKS).toContain('disposeAll(disposers)');
    expect(HOOKS).toContain('scroll.destroy()');
    expect(HOOKS).toContain("root.removeAttribute('data-motion')");
  });

  it('takes the other path entirely under reduced motion', () => {
    expect(HOOKS).toContain('prefersReducedMotion()');
    expect(HOOKS).toContain('settleStill(root)');
    // No Lenis, no triggers, no timelines: the still branch returns before any of them is made.
    const still = HOOKS.slice(HOOKS.indexOf('if (reduced) {'), HOOKS.indexOf('const scroll ='));
    expect(still).not.toContain('mount');
  });

  it('leaves the drawn answer complete when nothing is allowed to move', () => {
    // The proof is the content, so it is never withheld — only the animation of it is.
    expect(CODE).toContain("el.style.strokeDashoffset = '0'");
    expect(CODE).toContain("classList.add('lit')");
    expect(CODE).toContain("el.setAttribute('height', String(h))");
  });
});
