/**
 * The conversation renders on the lesson plane, so chat.css adds only the thread on the canvas and
 * the ask box in the say row. This holds those rules to the law, and holds the screen to the
 * promise the wave made of it: the plane, not a chat app — no bubble, no side, no tail.
 */

import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = join(import.meta.dir, '..', '..', '..', '..', '..');
const APP = readFileSync(join(REPO, 'design', 'prototypes', 'app-v1.html'), 'utf8');
const CSS = readFileSync(join(import.meta.dir, 'chat.css'), 'utf8');
const TSX = readFileSync(join(import.meta.dir, '..', 'ChatScreen.tsx'), 'utf8');

/** Every `selector{declarations}` in a stylesheet, media blocks flattened, comments dropped. */
function rules(css: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const flat = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@media[^{]+\{/g, '');
  for (const m of flat.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = (m[1] as string).replace(/\s+/g, ' ').trim();
    const decls = (m[2] as string)
      .split(';')
      .map((d) =>
        d
          .replace(/\s+/g, ' ')
          .trim()
          .replace(/\s*:\s*/, ':'),
      )
      .filter(Boolean);
    if (!selector || selector.startsWith('@')) continue;
    out.set(selector, [...(out.get(selector) ?? []), ...decls]);
  }
  return out;
}

const mine = rules(CSS);

describe('the conversation is the lesson plane, not a chat app', () => {
  it('is built from the plane, its canvas, its say row and its side column', () => {
    for (const cls of [
      'ls-lesson',
      'ls-plane',
      'ls-bar',
      'ls-canvas',
      'ls-stage',
      'ls-say',
      'ls-side',
    ]) {
      expect(TSX).toContain(cls);
    }
    expect(TSX).toContain("import './course/lesson.css'");
  });

  it('keeps the board’s two side cards, in the board’s own words', () => {
    expect(TSX).toContain('Ask about this');
    expect(TSX).toContain('Circle any part of the board and ask why. Or just say it.');
    expect(TSX).toContain('Your place');
    expect(TSX).toContain('Saved as you go. Leave any time, come back to this line.');
  });

  it('asks in the say row, with the kit’s own ask box', () => {
    expect(TSX).toContain('<AskBox');
    expect(TSX).toMatch(/className="ls-say ch-say"/);
  });

  it('draws no bubble — nothing in the thread is aligned to a side or given a tail', () => {
    expect(CSS).not.toMatch(/align-self/);
    expect(CSS).not.toMatch(/border-radius/);
  });
});

describe('the chat stylesheet keeps the law (DESIGN.md §2, §3)', () => {
  it('prefixes every class, so nothing meets an older screen’s rule', () => {
    for (const selector of mine.keys()) {
      for (const cls of selector.matchAll(/\.([\w-]+)/g)) {
        const c = cls[1] ?? '';
        expect(c.startsWith('ch-') || c.startsWith('wk-')).toBe(true);
      }
    }
  });

  it('draws no hairline and no border', () => {
    expect(CSS).not.toMatch(/border[^;]*:\s*1px/);
    expect(CSS).not.toMatch(/border[^;]*:\s*0?\.\d+px/);
  });

  it('names no colour of its own', () => {
    expect(CSS).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    for (const rgba of CSS.matchAll(/rgba?\([^)]+\)/g)) expect(APP).toContain(rgba[0]);
  });

  it('uses the two faces only, through the tokens, and never under the 13px floor', () => {
    expect(CSS).not.toMatch(/font-family\s*:\s*(?!inherit|var\()/);
    for (const [, decls] of mine) {
      for (const d of decls) {
        for (const size of d.matchAll(/(?:^font-size:|font:[^;]*?\s)(\d+)px/g)) {
          expect(Number(size[1])).toBeGreaterThanOrEqual(13);
        }
      }
    }
  });
});
