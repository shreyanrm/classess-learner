import { describe, expect, it } from 'bun:test';
import { accent, cssVariables, radius, subjectAccents, tokens, vidyaMolten } from '../src/index';

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
});
