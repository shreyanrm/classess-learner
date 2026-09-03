import { describe, expect, it } from 'bun:test';
import { seedVizSvg } from './classify';

describe('the seeded visualization is drawn in the theme, not in black on white', () => {
  it('inks every stroke and label with currentColor', () => {
    for (const kind of ['diagram', 'chart', 'conceptmap'] as const) {
      const svg = seedVizSvg(kind, 'how a lever multiplies force');
      expect(svg).toContain('currentColor');
      expect(svg).not.toContain('#111'); // hard ink vanishes on a dark page
      expect(svg).not.toContain('#fff');
    }
  });

  it('knocks out node fills against the paper token', () => {
    const svg = seedVizSvg('conceptmap', 'photosynthesis');
    expect(svg).toContain('var(--wobo-paper)');
  });

  it('still escapes the concept it was handed', () => {
    const svg = seedVizSvg('diagram', '<script>alert(1)</script>');
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
  });
});
