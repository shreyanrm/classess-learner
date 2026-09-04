/**
 * Palette v4 is the only palette, and a hex is how an old one gets back in.
 *
 * The three colours below are the ones the law audit measured on live app routes after palette v4
 * landed: ultramarine `#1F35E0` (v3's Wobo blue) drawn on `/building` and inside every engine
 * caption, and the two the art system carried — `#FFC93C`, which `packages/wobo` already lists as
 * retired, and `#0D0D10`, an ink that is neither `--ink` nor night's. Each was identical in light
 * and in night, because a JS colour constant cannot know which theme is live: palette v4 designs
 * night on its own (DESIGN.md §2), so a hex in the source is a light-theme colour painted into a
 * dark page.
 *
 * The ban is narrow on purpose — it names the three that were actually on a page, not every hex —
 * and it binds shipped source only, so a test may still write one down to prove it is gone.
 */

import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** v3's Wobo blue, the art system's gold, and the art system's ink. */
const RETIRED = ['#1F35E0', '#FFC93C', '#0D0D10'];

const SRC = join(import.meta.dir, '..');

function sources(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      out.push(...sources(path));
      continue;
    }
    if (!/\.tsx?$/.test(entry)) continue;
    if (/\.test\.tsx?$/.test(entry)) continue;
    out.push(path);
  }
  return out;
}

/** Comments stripped: the ban is on what the code DRAWS, never on what a doc block explains. */
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

describe('the retired palette cannot come back', () => {
  const files = sources(SRC);

  it('finds no retired hex in any shipped source file', () => {
    for (const file of files) {
      const body = code(readFileSync(file, 'utf8')).toUpperCase();
      for (const hex of RETIRED) {
        expect(`${file.slice(SRC.length + 1)}: ${body.includes(hex) ? hex : 'clean'}`).toBe(
          `${file.slice(SRC.length + 1)}: clean`,
        );
      }
    }
  });

  it('reads the subject hues as tokens, so both themes resolve them', async () => {
    const { SUBJECT_HUES } = await import('./hues');
    for (const [family, tone] of Object.entries(SUBJECT_HUES)) {
      expect(`${family}: ${tone.hue}`).toMatch(/^[a-z]+: var\(--[a-z]+\)$/);
      expect(`${family}: ${tone.wash}`).toMatch(/^[a-z]+: var\(--[a-z]+-w\)$/);
    }
  });
});
