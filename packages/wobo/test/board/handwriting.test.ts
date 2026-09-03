import { beforeAll, describe, expect, it } from 'bun:test';
import {
  fallbackLines,
  flattenContours,
  glyphAt,
  HAND_SYMBOLS,
  type HandFont,
  handFont,
  hasScripts,
  isDrawnSymbol,
  layoutTex,
  measureText,
  orderContours,
  parseHandFont,
  scriptText,
  setHandFont,
  startNearTopLeft,
  texPlainText,
  wrapText,
  writeScripted,
  writeText,
} from '../../src/board/handwriting';
import type { BoardPoint } from '../../src/board/schema';

const FONT_PATH = new URL(
  '../../../../apps/web-pwa/public/fonts/Caveat-Regular.ttf',
  import.meta.url,
).pathname;

let font: HandFont;

beforeAll(async () => {
  const bytes = await Bun.file(FONT_PATH).arrayBuffer();
  const parsed = await parseHandFont(bytes);
  if (!parsed) throw new Error('Caveat did not parse — the hand has no font');
  font = parsed;
  setHandFont(parsed);
});

describe('the font', () => {
  it('is Caveat, with a real em square', () => {
    expect(font.unitsPerEm).toBeGreaterThan(0);
    expect(handFont()).toBe(font);
  });

  it('refuses garbage without throwing', async () => {
    expect(await parseHandFont(new ArrayBuffer(8))).toBeNull();
  });
});

describe('glyphs become strokes in the order a hand makes them', () => {
  it('a letter has a fill and a traceable pen path', () => {
    const { glyph, advance } = glyphAt(font, 'a', 40, [0, 100]);
    expect(advance).toBeGreaterThan(0);
    expect(glyph).not.toBeNull();
    expect(glyph?.fill?.length).toBeGreaterThan(10);
    expect(glyph?.trace.length).toBeGreaterThan(0);
    expect((glyph?.trace[0]?.length ?? 0) > 0).toBe(true);
  });

  it('a space advances the pen and draws nothing', () => {
    const { glyph, advance } = glyphAt(font, ' ', 40, [0, 100]);
    expect(glyph).toBeNull();
    expect(advance).toBeGreaterThan(0);
  });

  it('orders contours top band first, then left to right', () => {
    const contours: BoardPoint[][] = [
      [
        [50, 100],
        [60, 110],
        [50, 100],
      ],
      [
        [0, 0],
        [10, 5],
        [0, 0],
      ],
      [
        [30, 2],
        [40, 6],
        [30, 2],
      ],
    ];
    const ordered = orderContours(contours, 40);
    expect(ordered[0]?.[0]).toEqual([0, 0]);
    expect(ordered[1]?.[0]).toEqual([30, 2]);
    expect(ordered[2]?.[0]).toEqual([50, 100]);
  });

  it('starts a contour at its own top-left', () => {
    const ring: BoardPoint[] = [
      [10, 10],
      [0, 0],
      [10, 0],
      [10, 10],
    ];
    expect(startNearTopLeft(ring)[0]).toEqual([0, 0]);
  });

  it('flattens curves into dense polylines', () => {
    const path = font.charToGlyph('s').getPath(0, 100, 40);
    const contours = flattenContours(path, 40);
    expect(contours.length).toBeGreaterThan(0);
    expect((contours[0]?.length ?? 0) > 6).toBe(true);
  });
});

describe('writing a phrase', () => {
  it('measures, lays out and reports its own pen travel', () => {
    const laid = writeText(font, 'so c = 5', [0, 0], { size: 30 });
    expect(laid.glyphs.length).toBeGreaterThan(4);
    expect(laid.width).toBeGreaterThan(0);
    expect(laid.length).toBeGreaterThan(0);
    expect(laid.height).toBeCloseTo(30 * 1.22, 5);
  });

  it('wraps at a maximum width without splitting a word that fits', () => {
    const lines = wrapText(font, 'the two small squares fill the big one', 30, 200);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) expect(line.includes('  ')).toBe(false);
  });

  it('measureText grows with the phrase', () => {
    expect(measureText(font, 'aa', 30)).toBeGreaterThan(measureText(font, 'a', 30));
  });

  it('honours explicit newlines', () => {
    expect(wrapText(font, 'one\ntwo', 30, undefined)).toEqual(['one', 'two']);
  });
});

describe('symbols Caveat does not carry, Wobo draws', () => {
  it('knows which ones they are', () => {
    expect(isDrawnSymbol('π')).toBe(true);
    expect(isDrawnSymbol('a')).toBe(false);
  });

  it('draws them as bare strokes with real length', () => {
    const { glyph, advance } = glyphAt(font, 'π', 40, [0, 100]);
    expect(advance).toBeGreaterThan(0);
    expect(glyph?.drawn).toBe(true);
    expect(glyph?.fill).toBeUndefined();
    expect((glyph?.trace.length ?? 0) >= 3).toBe(true);
  });
});

describe('tex, the school subset, written by hand', () => {
  it('lays out a power', () => {
    const laid = layoutTex(font, 'a^2 + b^2 = c^2', [0, 0], 40);
    expect(laid.glyphs.length).toBe(8); // a 2 + b 2 = c 2 — spaces draw nothing
    expect(laid.width).toBeGreaterThan(0);
    expect(laid.length).toBeGreaterThan(0);
  });

  it('a fraction gets a ruled bar and stacks its parts', () => {
    const laid = layoutTex(font, '\\frac{a}{b}', [0, 0], 40);
    expect(laid.rules).toHaveLength(1);
    expect(laid.height).toBeGreaterThan(40);
  });

  it('a root gets a radical and an overbar', () => {
    const laid = layoutTex(font, '\\sqrt{x}', [0, 0], 40);
    expect(laid.rules).toHaveLength(1);
    expect(laid.glyphs.length).toBeGreaterThanOrEqual(2);
  });

  it("maps Greek and relations through to Wobo's hand", () => {
    const laid = layoutTex(font, '\\theta \\le \\pi', [0, 0], 40);
    expect(laid.glyphs.filter((g) => g.drawn).length).toBeGreaterThanOrEqual(2);
  });

  it('subscripts sit below and superscripts above the same base', () => {
    const laid = layoutTex(font, 'x_1^2', [0, 0], 40);
    const ys = laid.glyphs.map((g) => g.box.y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(10);
  });

  it('an unknown command is dropped, never thrown', () => {
    expect(() => layoutTex(font, '\\wat{x} + 1', [0, 0], 40)).not.toThrow();
  });

  it('never loops on an unbalanced brace', () => {
    expect(() => layoutTex(font, '\\frac{a', [0, 0], 40)).not.toThrow();
    expect(() => layoutTex(font, '}}}', [0, 0], 40)).not.toThrow();
  });
});

describe('the fallback when the font never arrives', () => {
  it('breaks the phrase into readable lines', () => {
    const lines = fallbackLines('the two small squares fill the big one exactly', 20);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) expect(line.length).toBeLessThanOrEqual(24);
  });
});

// --- Wave 5 polish: every symbol in the pipelines' vocabulary renders ------------------------------

/** A font that carries nothing at all — every glyph misses, so only the hand's own paths remain. */
const EMPTY_FONT: HandFont = {
  unitsPerEm: 1000,
  charToGlyph: () => ({
    index: 0,
    advanceWidth: 500,
    getPath: () => ({ commands: [], toPathData: () => '' }),
  }),
};

describe('a glyph Caveat does not carry is still written', () => {
  /** The vocabulary the TeX subset and the domain pipelines can put on a board. */
  const VOCABULARY = [
    'Ω',
    '→',
    '≤',
    '≥',
    '≠',
    '×',
    '·',
    '°',
    'π',
    'θ',
    'Δ',
    'α',
    'β',
    'γ',
    'Σ',
    '√',
    '∫',
    '∞',
    '÷',
    '±',
    '≈',
  ];

  it.each(VOCABULARY)('draws %s by hand, with real strokes', (ch) => {
    const { glyph, advance } = glyphAt(EMPTY_FONT, ch, 40, [0, 100]);
    expect(isDrawnSymbol(ch)).toBe(true);
    expect(glyph).not.toBeNull();
    expect(glyph?.trace.length ?? 0).toBeGreaterThan(0);
    expect(glyph?.trace.every((t) => t.length > 0)).toBe(true);
    expect(glyph?.drawn).toBe(true);
    expect(advance).toBeGreaterThan(0);
  });

  it('every symbol the TeX subset maps to is one Wobo can draw', () => {
    for (const ch of HAND_SYMBOLS) expect(isDrawnSymbol(ch)).toBe(true);
    for (const ch of VOCABULARY) expect(HAND_SYMBOLS).toContain(ch);
  });

  it('a character with no outline and no hand is still SOMETHING, never nothing', () => {
    const { glyph, advance } = glyphAt(EMPTY_FONT, '字', 40, [0, 100]);
    expect(glyph).not.toBeNull();
    expect(glyph?.trace.length ?? 0).toBeGreaterThan(0);
    expect(advance).toBeGreaterThan(0);
  });

  it('measures a line of symbols the same width it writes it', () => {
    const line = 'θ ≤ 90°';
    const measured = measureText(EMPTY_FONT, line, 40);
    const written = writeText(EMPTY_FONT, line, [0, 0], { size: 40 });
    expect(measured).toBeCloseTo(written.width, 3);
  });
});

describe('powers and indices in a plain written line', () => {
  it('spots the lines that carry them', () => {
    expect(hasScripts('a^2 + b^2 = c^2')).toBe(true);
    expect(hasScripts('x_1')).toBe(true);
    expect(hasScripts('so c = 5')).toBe(false);
  });

  it('raises a power and drops an index', () => {
    expect(scriptText('a^2 + b^2 = c^2')).toBe('a² + b² = c²');
    expect(scriptText('x_1')).toBe('x₁');
    expect(scriptText('v_x^2')).toBe('vₓ²');
    expect(scriptText('CO_2')).toBe('CO₂');
  });

  it('leaves a group alone when any of it has no raised form', () => {
    expect(scriptText('e^{kt}')).toBe('e^{kt}');
  });

  it('turns an equation into the plain line it degrades to', () => {
    expect(texPlainText('a^2 + b^2 = c^2')).toBe('a² + b² = c²');
    expect(texPlainText('\\theta \\le 90\\degree')).toBe('θ ≤ 90°');
  });

  it("writes them in Wobo's own hand when the font is there", () => {
    const laid = writeScripted(font, 'a^2 + b^2 = c^2', [0, 0], 40);
    expect(laid.glyphs.length).toBeGreaterThan(6);
    const tops = laid.glyphs.map((g) => g.box.y);
    // The raised twos ride above the letters they belong to.
    expect(Math.min(...tops)).toBeLessThan(Math.max(...tops));
    expect(laid.length).toBeGreaterThan(0);
  });
});
