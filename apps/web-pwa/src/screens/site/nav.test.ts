/**
 * The shell's words are the prototypes' words: the pill nav, the two doors, the footer's four
 * columns and its line, and the close panel. Read out of design/prototypes/site-about.html and
 * held here, so a label cannot drift from what the owner signed off.
 */

import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CLOSE } from './ClosePanel';
import { DOORS, FOOTER_COLUMNS, FOOTER_LINE, NAV_LINKS } from './nav';

const REPO = join(import.meta.dir, '..', '..', '..', '..', '..');
const HTML = readFileSync(join(REPO, 'design', 'prototypes', 'site-about.html'), 'utf8');

const text = (s: string): string => s.replace(/<[^>]+>/g, '').trim();
const anchors = (html: string): string[] =>
  [...html.matchAll(/<a[^>]*>([^<]*)<\/a>/g)].map((m) => text(m[1] as string));

describe('the shell says what the prototype says', () => {
  it('lists the six pill-nav pages in order', () => {
    const nav = /<header>[\s\S]*?<nav>([\s\S]*?)<\/nav>/.exec(HTML)?.[1] ?? '';
    expect(NAV_LINKS.map((l) => l.label)).toEqual(anchors(nav));
  });

  it('names the two doors', () => {
    const cta = /<div class="cta">([\s\S]*?)<\/div>/.exec(HTML)?.[1] ?? '';
    const doors: string[] = [DOORS.signIn, DOORS.getStarted];
    expect(doors).toEqual(anchors(cta));
  });

  it('carries the footer, column for column', () => {
    const footer = /<footer>[\s\S]*?<\/footer>/.exec(HTML)?.[0] ?? '';
    const columns = [...footer.matchAll(/<div><b>([^<]*)<\/b>([\s\S]*?)<\/div>/g)].map((m) => ({
      title: m[1] as string,
      links: anchors(m[2] as string),
    }));
    expect(
      FOOTER_COLUMNS.map((c) => ({ title: c.title, links: c.links.map((l) => l.label) })),
    ).toEqual(columns);
    expect(footer).toContain(FOOTER_LINE);
  });

  it('gives every link a distinct address, and every address a leading slash', () => {
    const hrefs = [...NAV_LINKS, ...FOOTER_COLUMNS.flatMap((c) => c.links)].map((l) => l.href);
    for (const href of hrefs) expect(href.startsWith('/')).toBe(true);
    const footerHrefs = FOOTER_COLUMNS.flatMap((c) => c.links).map((l) => l.href);
    expect(new Set(footerHrefs).size).toBe(footerHrefs.length);
  });

  it('closes the way the prototype closes', () => {
    const close = /<div class="close">([\s\S]*?)<\/div><\/div>/.exec(HTML)?.[1] ?? '';
    expect(close).toContain(`<h2>${CLOSE.title}</h2>`);
    expect(close).toContain(`<span class="hand">${CLOSE.hand}</span>`);
    expect(anchors(close)).toEqual([CLOSE.primary.label, CLOSE.quiet.label]);
  });
});
