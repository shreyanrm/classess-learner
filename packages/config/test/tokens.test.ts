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

describe('design tokens (DESIGN.md §2 is law)', () => {
  it('carries the signature pigment: ultramarine, reserved for brand and mastery', () => {
    expect(ultramarine).toBe('#1F35E0');
  });

  it('reserves Molten for Vidya and never assigns it to a subject', () => {
    expect(vidyaMolten).toBe('#FF5A1F');
    expect(accent.molten).toBe('#FF5A1F');
    expect(subjectAccents).not.toContain('molten');
  });

  it('keeps the accent family rare and intentional: molten, magenta, acid', () => {
    expect(Object.keys(accent).sort()).toEqual(['acid', 'magenta', 'molten']);
    expect(accent.magenta).toBe('#CC1E7A');
    expect(accent.acid).toBe('#66B300');
  });

  it('uses sharp corners: 3px default radius; large radii only for Vidya and overlays', () => {
    expect(radius.sm).toBe(3);
    expect(radius.jelly).toBeGreaterThan(radius.lg);
  });

  it('never defines a drop-shadow token (depth is hairline, tonal step, frost)', () => {
    const json = JSON.stringify(tokens).toLowerCase();
    expect(json).not.toContain('shadow');
    expect(json).not.toContain('box-shadow');
  });

  it('emits CSS custom properties for the web root', () => {
    const css = cssVariables();
    expect(css).toContain('--clss-ink-900: #0D0D10;');
    expect(css).toContain('--clss-ultramarine: #1F35E0;');
    expect(css).toContain('--clss-vidya-molten: #FF5A1F;');
    expect(css).toContain('--clss-radius-sm: 3px;');
  });

  it("carries Vidya's annotation palette: molten leads, ultramarine seconds, acid third", () => {
    expect(vidyaHighlight.primary).toBe(vidyaMolten);
    expect(vidyaHighlight.secondary).toBe(ultramarine);
    expect(vidyaHighlight.tertiary).toBe(accent.acid);
    const css = cssVariables();
    expect(css).toContain('--clss-vidya-highlight-primary: #FF5A1F;');
    expect(css).toContain(`--clss-vidya-highlight-secondary: ${ultramarine};`);
    expect(css).toContain('--clss-vidya-highlight-tertiary: #66B300;');
  });
});
