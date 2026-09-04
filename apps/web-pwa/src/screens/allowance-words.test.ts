/**
 * The copy law's app half (DESIGN.md §0), held to.
 *
 * Two things are tested here. First, that the plan card says what a plan carries in words. Second
 * — and this is the one that catches a regression nobody meant — that no AUTHENTICATED screen
 * ships a raw allowance, an invented learner's name, or a class range. The scan is over the app
 * screens only: the public site is Worker C's lane and `services/gateway/tests/test_copy_law.py`
 * covers the copy files, so this one stays where it can be exact.
 */

import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { multipleInWords, planInWords } from './allowance-words';
import { PLAN_TIERS } from './plans/prices';

describe('a plan says what it carries, never how many questions', () => {
  it('spells the multiple and leaves free without one', () => {
    expect(multipleInWords(1)).toBe('');
    expect(multipleInWords(5)).toBe('five times the free allowance');
    expect(multipleInWords(20)).toBe('twenty times the free allowance');
  });

  it('writes the rail line for every tier the product actually sells', () => {
    const lines = PLAN_TIERS.map((t) => planInWords(t.name, t.allowanceMultiple));
    expect(lines).toEqual([
      'Free · enough for a normal evening, every day',
      'Pro · five times the free allowance',
      'Max · twenty times the free allowance',
    ]);
    for (const line of lines) expect(line).not.toMatch(/\d/);
  });

  it('never prints a bare number, whatever multiple it is handed', () => {
    for (const n of [1, 2, 3, 5, 10, 12, 15, 20, 25, 50]) {
      expect(planInWords('Tier', n)).not.toMatch(/\d/);
    }
  });
});

// --- the sweep -----------------------------------------------------------------------------------

const SCREENS = join(import.meta.dir);
/** The app's own screens. The public site and the landing are other lanes and other tests. */
const MINE = [
  'Home.tsx',
  'Learn.tsx',
  'Course.tsx',
  'SubjectScreen.tsx',
  'ChatScreen.tsx',
  'Practice.tsx',
  'ProgressScreen.tsx',
  'You.tsx',
  'Onboarding.tsx',
  'FrameBuilding.tsx',
  'home',
  'learn',
  'course',
  'subject',
  'chat',
  'practice',
  'you',
  'onboarding',
  'states',
];

function walk(path: string, out: string[] = []): string[] {
  if (statSync(path).isFile()) {
    if (/\.(ts|tsx|css)$/.test(path) && !path.includes('.test.')) out.push(path);
    return out;
  }
  for (const entry of readdirSync(path)) walk(join(path, entry), out);
  return out;
}

const FILES = MINE.flatMap((entry) => walk(join(SCREENS, entry)));

/** Comments are the place a law is explained, so they are not the place it is enforced. */
function code(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ');
}

describe('no authenticated screen breaks the copy law', () => {
  it('scans a real set of files', () => {
    expect(FILES.length).toBeGreaterThan(25);
  });

  it('names no invented learner or parent', () => {
    const NAMES = /\b(Aanya|Ananya|Priya|Riya|Meera|Arjun|Rahul|Kabir|Ishaan|Sneha|Nikhil)\b/;
    for (const file of FILES) {
      const hit = code(readFileSync(file, 'utf8')).match(NAMES);
      expect(hit ? `${file}: ${hit[0]}` : null).toBeNull();
    }
  });

  it('prints no class range and no age range', () => {
    // "class 8" alone is the learner's OWN class and is allowed; a RANGE is the gate the law bans.
    const RANGE = /\b(class(es)?|grades?|ages?)\s*\d{1,2}\s*(to|through|–|—|-)\s*\d{1,2}\b/i;
    for (const file of FILES) {
      const hit = code(readFileSync(file, 'utf8')).match(RANGE);
      expect(hit ? `${file}: ${hit[0]}` : null).toBeNull();
    }
  });

  it('prints no raw allowance', () => {
    const RAW =
      /\b\d{1,4}\s*(questions?|turns?|asks?)\s*(a|per)\s*day\b|\b\d{1,4}\s+of\s+\d{1,4}\s*(questions?|turns?)\b/i;
    for (const file of FILES) {
      const hit = code(readFileSync(file, 'utf8')).match(RAW);
      expect(hit ? `${file}: ${hit[0]}` : null).toBeNull();
    }
  });
});
