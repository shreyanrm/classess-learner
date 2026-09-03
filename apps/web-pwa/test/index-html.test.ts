import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chrome, dark } from '@classess/config';

const APP = join(import.meta.dir, '..');
const html = readFileSync(join(APP, 'index.html'), 'utf8');

const LIGHT_PAGE = chrome.page;
const DARK_PAGE = dark['--clss-page'] as string;

/**
 * The document shell is what a learner on a cheap phone sees before a single byte of JS runs. What
 * it declares there has to be right on its own — the token layer arrives much later.
 */
describe('the document shell paints correctly before any JS', () => {
  it('ships a theme-color for each scheme, so the chrome is never dark over a white app', () => {
    expect(html).toContain('media="(prefers-color-scheme: light)"');
    expect(html).toContain('media="(prefers-color-scheme: dark)"');
    const tags = [...html.matchAll(/<meta name="theme-color"[^>]*>/g)].map((m) => m[0]);
    expect(tags).toHaveLength(2);
    expect(tags.filter((t) => t.includes('prefers-color-scheme: light'))).toHaveLength(1);
    expect(tags.filter((t) => t.includes('prefers-color-scheme: dark'))).toHaveLength(1);
  });

  it('uses the token page colours, not a hand-picked pair', () => {
    const light = html.match(
      /<meta name="theme-color" media="\(prefers-color-scheme: light\)" content="([^"]+)"/,
    );
    const night = html.match(
      /<meta name="theme-color" media="\(prefers-color-scheme: dark\)" content="([^"]+)"/,
    );
    expect(light?.[1]?.toUpperCase()).toBe(LIGHT_PAGE.toUpperCase());
    expect(night?.[1]?.toUpperCase()).toBe(DARK_PAGE.toUpperCase());
  });

  it('declares a first-paint background for both schemes, so dark mode never flashes white', () => {
    expect(html).toContain('color-scheme: light dark');
    expect(html).toMatch(/@media \(prefers-color-scheme: dark\)[^}]*background: #17181C/i);
    expect(html.toUpperCase()).toContain(DARK_PAGE.toUpperCase());
  });

  it('honours an explicit theme in the pre-JS style too', () => {
    expect(html).toContain("html[data-theme='dark']");
    expect(html).toContain("html[data-theme='light']");
  });

  it('loads no font from a third-party CDN — every face is bundled and same-origin', () => {
    expect(html).not.toContain('fonts.googleapis.com');
    expect(html).not.toContain('fonts.gstatic.com');
    expect(html).not.toMatch(/<link[^>]+rel="stylesheet"[^>]+https?:/);
  });

  it('imports both bundled faces from the app entry', () => {
    const main = readFileSync(join(APP, 'src', 'main.tsx'), 'utf8');
    expect(main).toContain('@fontsource-variable/plus-jakarta-sans');
    expect(main).toContain('@fontsource-variable/caveat');
  });

  it('names those bundled families in the type stack', async () => {
    const { fontFamily } = await import('@classess/config');
    expect(fontFamily.system).toContain('Plus Jakarta Sans Variable');
    expect(fontFamily.handwritten).toContain('Caveat Variable');
  });
});
