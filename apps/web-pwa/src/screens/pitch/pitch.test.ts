/**
 * The six pitch pages say what their prototypes say — every line of copy on
 * design/prototypes/site-{security,meet,parents,students,how,subjects}.html, word for word.
 *
 * The check is blunt on purpose: every run of text the prototype's body carries (twelve
 * characters or longer, so a stray "yes" or a tick does not count) has to appear in the page's
 * source, or in the two modules a page draws its words from — `maths.ts` for the three things a
 * visitor can try, `Ask.tsx` for the ask block's label and the shell's ClosePanel for the shared
 * close. The prototype's text is split at its tags; on both sides quotes and brackets are dropped
 * and whitespace is folded, so a sentence wrapped across three JSX lines, or handed to a
 * component as a prop, still matches its one prototype line, and a sentence with a word changed
 * does not.
 *
 * The one line that is data rather than copy — the mailbox the security page's report panel names,
 * which the page reads from the legal set's published addresses — is checked against that source
 * instead.
 */

import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONTACT } from '../auth/copy';
import { MAILBOXES } from '../site/identity';
import { overviewMailto } from './Security';

const REPO = join(import.meta.dir, '..', '..', '..', '..', '..');
const PROTO = join(REPO, 'design', 'prototypes');

const PAGES: readonly { proto: string; source: string }[] = [
  { proto: 'site-security.html', source: 'Security.tsx' },
  { proto: 'site-meet.html', source: 'MeetWobo.tsx' },
  { proto: 'site-parents.html', source: 'ForParents.tsx' },
  { proto: 'site-students.html', source: 'ForStudents.tsx' },
  { proto: 'site-how.html', source: 'HowItWorks.tsx' },
  { proto: 'site-subjects.html', source: 'Subjects.tsx' },
];

/** Lines a page renders from data rather than from its own copy. */
const DATA_LINES = new Set(['support@heywobo.com']);

/** Text as both sides are compared: no quotes, no brackets, whitespace folded. */
function fold(s: string): string {
  return s
    .replace(/\{' '\}/g, ' ')
    .replace(/[<>/{}]/g, ' ')
    .replace(/['"`’]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Every run of text the prototype's page body carries, plus every placeholder it types. */
function phrases(html: string): string[] {
  const body = html.split('</header>')[1]?.split('<footer>')[0] ?? '';
  const noScript = body.replace(/<script>[\s\S]*?<\/script>/g, '');
  const placeholders = [...noScript.matchAll(/placeholder="([^"]+)"/g)].map((m) => m[1] as string);
  const runs = noScript
    .replace(/<[^>]*>/g, '\n')
    .split('\n')
    .map((s) => s.replace(/\s+/g, ' ').trim());
  return [...new Set([...runs, ...placeholders].map(fold).filter((s) => s.length >= 12))];
}

const SHARED = ['maths.ts', 'Ask.tsx', join('..', 'site', 'ClosePanel.tsx')]
  .map((f) => fold(readFileSync(join(import.meta.dir, f), 'utf8')))
  .join(' ');

describe('each pitch page carries every line of its prototype', () => {
  for (const page of PAGES) {
    it(`${page.source} says what ${page.proto} says`, () => {
      const html = readFileSync(join(PROTO, page.proto), 'utf8');
      const source = `${fold(readFileSync(join(import.meta.dir, page.source), 'utf8'))} ${SHARED}`;
      const missing = phrases(html).filter((p) => !DATA_LINES.has(p) && !source.includes(p));
      expect(missing).toEqual([]);
    });
  }
});

describe('the security overview request', () => {
  it('composes a draft to the mailbox that answers anything, with the school when given', () => {
    const href = overviewMailto('lead@school.example', 'A school');
    expect(href.startsWith(`mailto:${CONTACT.address}?`)).toBe(true);
    const query = new URLSearchParams(href.split('?')[1]);
    expect(query.get('subject')).toBe('Security overview');
    expect(query.get('body')).toBe(
      'Please send the security overview to lead@school.example.\nSchool or organisation: A school',
    );
    expect(new URLSearchParams(overviewMailto('a@b.c', '').split('?')[1]).get('body')).toBe(
      'Please send the security overview to a@b.c.',
    );
  });
});

describe('the lines a page reads from data', () => {
  it('names the mailbox the legal set publishes, rather than one typed on the page', () => {
    expect(MAILBOXES.some((box) => box.address === 'support@heywobo.com')).toBe(true);
    const source = readFileSync(join(import.meta.dir, 'Security.tsx'), 'utf8');
    expect(source).toContain("startsWith('support@')");
  });
});
