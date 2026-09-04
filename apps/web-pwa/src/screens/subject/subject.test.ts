/**
 * A subject is the Learn board scoped to one subject, with the Practice board's set list behind
 * its second tab — so subject.css owns three rules and borrows everything else. This holds the
 * frame the set list sits in to the practice board's own grid, and holds the screen to composing
 * from the two boards rather than inventing a third.
 */

import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DisplaySubject } from '../../curriculum/registry';
import { resolveSubject } from '../SubjectScreen';

const REPO = join(import.meta.dir, '..', '..', '..', '..', '..');
const APP = readFileSync(join(REPO, 'design', 'prototypes', 'app-v1.html'), 'utf8');
const CSS = readFileSync(join(import.meta.dir, 'subject.css'), 'utf8');
const TSX = readFileSync(join(import.meta.dir, '..', 'SubjectScreen.tsx'), 'utf8');

/** Every `selector{declarations}` in a stylesheet, media blocks flattened, comments dropped. */
function rules(css: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const flat = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@media[^{]+\{/g, '');
  for (const m of flat.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = (m[1] as string).replace(/\s+/g, ' ').trim();
    const decls = (m[2] as string)
      .split(';')
      .map((d) =>
        d
          .replace(/\s+/g, ' ')
          .trim()
          .replace(/\s*:\s*/, ':'),
      )
      .filter(Boolean);
    if (!selector || selector.startsWith('@')) continue;
    out.set(selector, [...(out.get(selector) ?? []), ...decls]);
  }
  return out;
}

const proto = rules(APP);
const mine = rules(CSS);

describe('a subject is composed from the two boards it belongs to', () => {
  it('the set list sits in the practice board’s own two columns', () => {
    const source = proto.get('.prac') ?? [];
    const ported = mine.get('.sb-sets') ?? [];
    expect(source).toContain('grid-template-columns:1fr 360px');
    for (const decl of source) expect(ported).toContain(decl);
    // the phone folds it to one column, exactly as the practice board does
    expect(ported).toContain('grid-template-columns:1fr');
  });

  it('the chapter rows are the learn board’s rows, and the set rows the practice board’s', () => {
    for (const cls of ['ln-units', 'ln-unit', 'ln-now', 'ln-done', 'ln-state', 'ln-prog']) {
      expect(TSX).toContain(cls);
    }
    for (const cls of ['pr-set', 'pr-on', 'pr-ok', 'pr-dot']) expect(TSX).toContain(cls);
    expect(TSX).toContain("import './learn/Learn.css'");
    expect(TSX).toContain("import './practice/practice.css'");
  });

  it('keeps the two boards’ own lines, word for word', () => {
    const line =
      "Something your school does differently? Tell me and I'll reorder, add or drop a chapter for you.";
    expect(APP.replace(/\s+/g, ' ')).toContain(line);
    expect(TSX).toContain(line);
    const how =
      'Wobo never says wrong. When you’re close, it draws the difference on your answer and waits. Get it, and it makes a small fuss.';
    expect(APP.replace(/\s+/g, ' ')).toContain(how.replace(/’/g, "'"));
    expect(TSX.replace(/\s+/g, ' ')).toContain(how.replace(/’/g, "'"));
  });

  it('the crumb names the door and the subject, and the pill names the syllabus', () => {
    expect(TSX).toContain("intent === 'practice' ? 'Practice' : 'Learn'");
    expect(TSX).toContain('ln-prov');
  });
});

/**
 * `/subject/math/learn` was the address before subjects were keyed by their own name, and it is
 * still in every old bookmark and palette entry. It used to print its own URL segment where the
 * subject's name goes — a headline naming "math", a tile grid with nothing outlined, and another
 * subject's chapters underneath.
 */
describe('an address names a subject, whatever the address happens to say', () => {
  const subjects: DisplaySubject[] = [
    { id: 'Mathematics', name: 'Mathematics', line: '', subjectIds: ['math'] },
    { id: 'Science', name: 'Science', line: '', subjectIds: ['science'] },
  ];

  it('resolves the subject’s own id', () => {
    expect(resolveSubject(subjects, 'Mathematics')?.id).toBe('Mathematics');
  });

  it('resolves the name however it is cased', () => {
    expect(resolveSubject(subjects, 'mathematics')?.id).toBe('Mathematics');
    expect(resolveSubject(subjects, 'SCIENCE')?.id).toBe('Science');
  });

  it('resolves the old slug through the family behind it', () => {
    expect(resolveSubject(subjects, 'math')?.id).toBe('Mathematics');
    expect(resolveSubject(subjects, 'maths')?.id).toBe('Mathematics');
  });

  it('resolves nothing rather than inventing a subject out of the URL', () => {
    expect(resolveSubject(subjects, 'no-such-subject')).toBeUndefined();
    expect(resolveSubject(subjects, '')).toBeUndefined();
    expect(resolveSubject([], 'math')).toBeUndefined();
  });

  it('hands the address over rather than rendering the segment', () => {
    // the screen replaces onto the canonical address, and onto Learn when nothing resolves
    expect(TSX).toContain("router.replace({ name: 'subject', subjectId: subject.id, intent })");
    expect(TSX).toContain("router.replace({ name: 'learn' })");
    // and everything it draws reads the resolved subject, never the raw segment
    expect(TSX).toContain('const openId = subject?.id ?? subjectId;');
    expect(TSX).toContain('useUnits(openId)');
    expect(TSX).toContain('rowsOf(openId)');
    expect(TSX).toContain('on={s.id === openId}');
  });
});

describe('the subject stylesheet keeps the law (DESIGN.md §2, §3)', () => {
  it('prefixes every class, so nothing meets an older screen’s rule', () => {
    for (const selector of mine.keys()) {
      for (const cls of selector.matchAll(/\.([\w-]+)/g)) {
        const c = cls[1] ?? '';
        expect(c.startsWith('sb-') || c.startsWith('wk-') || c.startsWith('pr-')).toBe(true);
      }
    }
  });

  it('draws no hairline, names no colour, and adds no corner of its own', () => {
    expect(CSS).not.toMatch(/border[^;]*:\s*1px/);
    expect(CSS).not.toMatch(/border[^;]*:\s*0?\.\d+px/);
    expect(CSS).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(CSS).not.toMatch(/border-radius/);
  });

  it('puts a set row on the 44px touch floor', () => {
    expect(mine.get('.sb-sets .pr-set button')).toContain('min-height:44px');
  });
});
