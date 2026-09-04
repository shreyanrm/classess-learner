/**
 * LAW v5's copy law, held over every public page outside the landing (DESIGN.md §0).
 *
 * The six rules below are the owner's, written on 2026-09-04, and every one of them was broken
 * somewhere on this site before this test existed: an invented learner called Aanya in three
 * chapters and a phone mock, "classes 4 to 12" on the about page and the plans table, "40 questions
 * a day" on a plan card, a country switch above the prices, and eight pages closing on "begin
 * tonight" for a product that has not opened.
 *
 * They are asserted over the SOURCE of the pages rather than over one exported object, because
 * these pages write most of their words inline in JSX and an object-shaped test would have missed
 * every one of the strings that were actually wrong. Comments are stripped first, so a note that
 * names a banned phrase in order to ban it — as the ones in `prices.ts` and `ClosePanel.tsx` do —
 * is not itself a violation.
 *
 * The generated `content/*.json` is not scanned: it is compiled from `docs/copy/**`, which a
 * reviewer owns and `content.test.ts` already holds to its source.
 */

import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { BENEFITS, PLANS_PAGE } from '../plans/copy';
import { PLAN_TIERS } from '../plans/prices';
import { CLOSE } from './ClosePanel';
import { DOORS } from './nav';

const SCREENS = join(import.meta.dir, '..');
/** Every page this worker owns: the six pitch pages, the site shell, plans, contact, the legal set. */
const LANES = ['pitch', 'site', 'plans', 'contact', 'legal'];

function sources(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      // `content/` is compiled from the reviewed copy, not written here
      if (entry.name !== 'content') sources(path, out);
    } else if (['.ts', '.tsx'].includes(extname(entry.name)) && !entry.name.endsWith('.test.ts')) {
      out.push(path);
    }
  }
  return out;
}

/** A file's shipped words: block comments and whole-line `//` notes taken out. */
function shipped(path: string): string {
  return readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ');
}

const PAGES = LANES.flatMap((lane) => sources(join(SCREENS, lane))).map((path) => ({
  name: relative(SCREENS, path),
  text: shipped(path),
}));

/** Assert no page's shipped words match `pattern`, naming the page and the line that did. */
function nowhere(pattern: RegExp, why: string): void {
  const hits: string[] = [];
  for (const page of PAGES) {
    for (const line of page.text.split('\n')) {
      if (pattern.test(line)) hits.push(`${page.name}: ${line.trim().slice(0, 110)}`);
    }
  }
  expect(hits, why).toEqual([]);
}

describe('law v5 — the copy law, over every public page', () => {
  it('scans the pages it claims to scan', () => {
    // a guard on the guard: a rename that empties this list must fail here, not pass in silence
    expect(PAGES.length).toBeGreaterThan(20);
    expect(PAGES.map((p) => p.name)).toContain('plans/Plans.tsx');
    expect(PAGES.map((p) => p.name)).toContain('pitch/Security.tsx');
  });

  it('names no learner and no parent — the reader has their own child in mind', () => {
    nowhere(
      /\b(aanya|arjun|riya|meera|priya|ananya|rohan|kavya|ishaan|sanya)\b/i,
      'an invented name puts someone else’s child on the page',
    );
  });

  it('gates nobody by grade or by age', () => {
    nowhere(/\bclass(?:es)? \d/i, 'a class number on a public surface is a gate');
    nowhere(/\bgrades? \d/i, 'a grade number on a public surface is a gate');
    nowhere(/\bages? \d/i, 'an age on a public surface is a gate');
    nowhere(/\b\d+ ?(?:to|–|-) ?\d+ ?(?:class|grade|year)/i, 'a range of levels is a gate');
  });

  it('states no raw allowance — what a day feels like, never how many questions it holds', () => {
    nowhere(
      /\b\d+ (?:questions|turns) a day\b/i,
      'a raw allowance makes a gift sound like a meter',
    );
    nowhere(/\b(?:forty|two hundred|eight hundred) questions\b/i, 'the same number, spelt out');
    nowhere(/\bof \d+ (?:questions|turns)\b/i, 'a remaining count against a stated limit');
  });

  it('gives the free plan no multiplier, and every paid one its multiple in words', () => {
    const free = PLAN_TIERS.find((t) => t.id === 'free');
    expect(free?.allowanceMultiple).toBe(1);
    expect(BENEFITS.find((r) => r.label === 'Daily allowance')?.free).not.toMatch(/\d/);
    for (const tier of PLAN_TIERS.filter((t) => t.allowanceMultiple > 1)) {
      expect([tier.id, tier.lines[0]]).toEqual([tier.id, expect.stringMatching(/times/i)]);
    }
  });

  it('never asks a reader which country they are in', () => {
    expect('regions' in PLANS_PAGE).toBe(false);
    expect('regionLabel' in PLANS_PAGE).toBe(false);
    // the only way a surface learns the market is by reading the browser
    nowhere(
      /setMarket|Show prices for|Everywhere else/i,
      'a country switch is a question we can answer ourselves',
    );
  });

  it('promotes before it invites — every door asks for early access', () => {
    expect(CLOSE.primary.label).toBe('Get early access');
    expect(DOORS.getStarted).toBe('Get early access');
    expect(PLANS_PAGE.close.primary).toBe('Get early access');
    nowhere(/begin tonight|start learning for free|start free\b/i, 'the product has not opened');
  });
});

/**
 * The other half of law v5: WHITE ground, colour only where it does a job. The paper itself is the
 * token layer's business (`src/ui/tokens.test.ts`); what belongs here is where the two site sheets
 * are still allowed to paint a wash — a pill, a tick, a selected row, or a node in a drawn diagram,
 * and never a card, a tile, a panel, a column or a section.
 */
describe('law v5 — no tinted surface on either site sheet', () => {
  const sheets = [
    ['site', readFileSync(join(SCREENS, 'site', 'styles.ts'), 'utf8')],
    ['pitch', readFileSync(join(SCREENS, 'pitch', 'styles.ts'), 'utf8')],
  ] as const;

  /** Every selector whose rule paints or fills a wash, in either sheet. */
  const washed = sheets.flatMap(([, css]) =>
    [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}\n]+)\{([^{}]*)\}/g)]
      .filter((m) =>
        /(?:background|fill):var\(--(?:pig|mint|marigold|rose|lilac|violet)-w\)/.test(
          m[2] as string,
        ),
      )
      .flatMap((m) => (m[1] as string).split(',').map((s) => s.trim())),
  );

  it('paints a wash on nothing but the marks the law allows', () => {
    expect([...washed].sort()).toEqual(
      [
        // a status pill on the parent's phone mock, and the deletion pill in the data table
        '.pa-mock .pa-row .pa-ok',
        '.sc-tbl .sc-del',
        // the Sunday note, highlighted in the phone mock
        '.pa-mock .pa-note',
        // nodes in two drawn diagrams: the data-flow and the how-it-works strip
        '.hw-strip .hw-box.hw-marigold',
        '.hw-strip .hw-box.hw-mint',
        '.hw-strip .hw-box.hw-pig',
        '.sc-flow .sc-box.sc-marigold',
        '.sc-flow .sc-box.sc-mint',
        '.sc-flow .sc-box.sc-pig',
        '.sc-flow .sc-box.sc-rose',
        // the drawn shield's own fill
        '.sc-shield .sc-fill',
        // the one selected row in the board typeahead
        '.sb-type .sb-opt.sb-lit',
        // rose cares: the error a door shows
        '.wa-error',
      ].sort(),
    );
  });

  it('sits every card, tile, panel and art frame on paper-2', () => {
    const surfaces = [
      '.st-tile',
      '.pt-art',
      '.sc-panel',
      '.sc-col',
      '.sb-tiles a',
      '.pl-gift',
      '.st-plain',
      '.hp-next',
      '.wa-parent',
      '.ab-story .ab-pull',
    ];
    const css = sheets.map(([, text]) => text).join('\n');
    for (const selector of surfaces) {
      // anchored to the start of a line, so `.pt-chapter.pt-flip .pt-art{order:-1}` is not the hit
      const rule = new RegExp(
        `^${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\{([^}]*)\\}`,
        'm',
      );
      const decls = rule.exec(css)?.[1] ?? '';
      expect([selector, decls]).toEqual([
        selector,
        expect.stringContaining('background:var(--paper-2)'),
      ]);
    }
  });

  it('points at one plan with pig rather than washing it', () => {
    const css = sheets.map(([, text]) => text).join('\n');
    expect(css).toContain(
      '.pl-plan.pl-pro{background:var(--paper-2);box-shadow:inset 0 0 0 3px var(--pig)}',
    );
  });
});
