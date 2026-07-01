import { describe, expect, it } from 'bun:test';
import {
  accent,
  cssVariables,
  radius,
  subjectAccents,
  tokens,
  ultramarine,
  vidyaHighlight,
  vidyaMolten,
} from '../src/index';

describe('design tokens', () => {
  it('reserves Molten for Vidya and never assigns it to a subject', () => {
    expect(vidyaMolten).toBe('#FF4D1A');
    expect(accent.molten).toBe('#FF4D1A');
    expect(subjectAccents).not.toContain('molten');
  });

  it('exposes the full assignable palette minus Molten', () => {
    expect(Object.keys(accent).length).toBe(14);
    expect(subjectAccents.length).toBe(13);
  });

  it('uses a 2px default radius and large radii only for Vidya', () => {
    expect(radius.sm).toBe(2);
    expect(radius.jelly).toBeGreaterThan(radius.lg);
  });

  it('never defines a drop-shadow token (depth is tone, hairline, frost)', () => {
    const json = JSON.stringify(tokens).toLowerCase();
    expect(json).not.toContain('shadow');
    expect(json).not.toContain('box-shadow');
  });

  it('emits CSS custom properties for the web root', () => {
    const css = cssVariables();
    expect(css).toContain('--clss-ink-900: #0A0A0B;');
    expect(css).toContain('--clss-vidya-molten: #FF4D1A;');
    expect(css).toContain('--clss-radius-sm: 2px;');
  });

  it("carries Vidya's highlight palette: molten, then acid, then ultramarine", () => {
    expect(vidyaHighlight.primary).toBe(vidyaMolten); // molten leads (her identity)
    expect(vidyaHighlight.secondary).toBe(accent.acid); // #C2F000
    expect(vidyaHighlight.tertiary).toBe(ultramarine);
    // The highlight palette is her toolkit, never a subject/concept accent.
    expect(subjectAccents).not.toContain('ultramarine');
    const css = cssVariables();
    expect(css).toContain('--clss-vidya-highlight-primary: #FF4D1A;');
    expect(css).toContain('--clss-vidya-highlight-secondary: #C2F000;');
    expect(css).toContain(`--clss-vidya-highlight-tertiary: ${ultramarine};`);
  });
});
