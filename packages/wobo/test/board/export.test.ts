import { describe, expect, it } from 'bun:test';
import {
  boardFileName,
  DARK_EXPORT,
  LIGHT_EXPORT,
  saveBoard,
  standaloneSvg,
  wordmarkPlacement,
} from '../../src/board/export';
import type { BoardObject } from '../../src/board/schema';
import { BoardStore } from '../../src/board/store';

const SVG =
  '<svg width="100%" height="100%" viewBox="0 0 1000 620"><path d="M 0 0 L 10 10" stroke="var(--wobo-ink)"/></svg>';

describe('an exported board stands on its own', () => {
  it('carries its own size, paper and ink tokens', () => {
    const out = standaloneSvg(SVG, { width: 800, height: 500 }, LIGHT_EXPORT);
    expect(out.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(out).toContain('width="800"');
    expect(out).toContain('viewBox="0 0 1000 620"');
    expect(out).toContain(`--wobo-ink:${LIGHT_EXPORT.ink}`);
    expect(out).toContain(`fill="${LIGHT_EXPORT.background}"`);
    expect(out).toContain('M 0 0 L 10 10');
    expect(out.match(/<svg/g)).toHaveLength(1); // the original wrapper is unwrapped, not nested
  });

  it('exports on slate as well as on paper', () => {
    expect(standaloneSvg(SVG, { width: 10, height: 10 }, DARK_EXPORT)).toContain(
      `--wobo-ink:${DARK_EXPORT.ink}`,
    );
  });

  it('falls back to the given size when the markup has no viewBox', () => {
    expect(standaloneSvg('<svg><g/></svg>', { width: 40, height: 30 }, LIGHT_EXPORT)).toContain(
      'viewBox="0 0 40 30"',
    );
  });
});

describe('the wordmark', () => {
  it('sits inside the board’s own breathing room, scaled to it', () => {
    const mark = wordmarkPlacement(800, 500);
    expect(mark.x).toBeLessThan(800);
    expect(mark.y).toBeLessThan(500);
    expect(mark.size).toBeGreaterThanOrEqual(14);
    expect(wordmarkPlacement(2000, 1400).size).toBeGreaterThan(mark.size);
  });
});

describe('the file it leaves as', () => {
  it('is calm and sentence case, with no punctuation to escape', () => {
    expect(boardFileName('Pythagoras — the big square')).toBe('pythagoras-the-big-square.png');
    expect(boardFileName()).toBe('board.png');
    expect(boardFileName('!!!')).toBe('board.png');
  });
});

describe('save to notes', () => {
  it('saves objects and a title, never pixels', () => {
    const store = new BoardStore({ presentation: 'plane' });
    const object: BoardObject = { id: 'a', kind: 'circle', anchor: { target: 'btn' } };
    store.ink(object);
    const saved = saveBoard(store, 'pythagoras');
    expect(saved.title).toBe('pythagoras');
    expect(saved.objects).toEqual([object]);
    expect(Number.isNaN(Date.parse(saved.savedAt))).toBe(false);
  });
});
