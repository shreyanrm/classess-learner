import { describe, expect, it } from 'bun:test';
import { chrome, dark, ink, paper } from '../src/index';

/** WCAG 2.1 relative luminance of an #rrggbb colour. */
function luminance(hex: string): number {
  const v = hex.replace('#', '');
  const channel = (i: number) => {
    const c = Number.parseInt(v.slice(i * 2, i * 2 + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

/** WCAG 2.1 contrast ratio between two #rrggbb colours. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi as number) + 0.05) / ((lo as number) + 0.05);
}

/**
 * inkFaint is not a decorative grey: captions, meta lines, hints and empty-state copy are painted
 * with it across the app. It carries real informational text, so it owes the AA 4.5:1 floor in
 * BOTH themes — the same floor ink[300] was already tuned to.
 */
describe('faint ink clears the WCAG AA floor for real text', () => {
  it('sanity-checks the ratio function against known pairs', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 1);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
  });

  it('passes AA on paper', () => {
    expect(contrastRatio(chrome.inkFaint, paper)).toBeGreaterThanOrEqual(4.5);
  });

  it('passes AA on graphite', () => {
    const faint = dark['--clss-ink-faint'] as string;
    const page = dark['--clss-page'] as string;
    expect(contrastRatio(faint, page)).toBeGreaterThanOrEqual(4.5);
  });

  it('is the whisper value the ink scale already computed, in both themes', () => {
    expect(chrome.inkFaint).toBe(ink[300]);
    expect(dark['--clss-ink-faint']).toBe(dark['--clss-ink-300']);
  });

  it('keeps the rest of the text ramp above the floor too', () => {
    expect(contrastRatio(chrome.ink, paper)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(chrome.inkSoft, paper)).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(dark['--clss-ink'] as string, dark['--clss-page'] as string),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(dark['--clss-ink-soft'] as string, dark['--clss-page'] as string),
    ).toBeGreaterThanOrEqual(4.5);
  });
});
