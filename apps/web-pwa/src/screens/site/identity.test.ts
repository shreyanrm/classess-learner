/**
 * The guard on `identity.ts`: nothing may be filled in here that the legal set does not already
 * publish in plain text.
 *
 * This is the whole reason the module is allowed to exist. Filling a bracket in reviewed copy is
 * one keystroke away from inventing a postal address, so the rule is mechanical: every value is
 * read back out of `docs/legal/**`, and a value that is not there fails the build rather than
 * shipping as a plausible-looking fact.
 */

import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MAILBOXES, OPEN_TERMS, RESOLVED_SLOTS, resolveSlot } from './identity';

const LEGAL = join(import.meta.dir, '..', '..', '..', '..', '..', 'docs', 'legal');
const SET = readdirSync(LEGAL)
  .filter((f) => f.endsWith('.md'))
  .map((f) => readFileSync(join(LEGAL, f), 'utf8'))
  .join('\n');

/** Every address the documents actually print, so a test can compare against the source. */
const PUBLISHED = new Set(
  [...SET.matchAll(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)].map((m) =>
    m[0].toLowerCase(),
  ),
);

describe('the decided values', () => {
  it('publishes nothing the legal set does not already publish', () => {
    for (const [slot, value] of Object.entries(RESOLVED_SLOTS)) {
      expect([slot, PUBLISHED.has(value.toLowerCase())]).toEqual([slot, true]);
    }
  });

  it('fills the two slots that were showing as gaps beside a page that printed them', () => {
    expect(resolveSlot('support email')).toBe('support@heywobo.com');
    expect(resolveSlot('[privacy email]')).toBe('privacy@heywobo.com');
  });

  it('leaves an undecided term as an undecided term', () => {
    for (const term of OPEN_TERMS) expect([term, resolveSlot(term)]).toEqual([term, null]);
    // The two the copy deck lists as open and nobody has answered.
    expect(resolveSlot('careers email')).toBe(null);
    expect(resolveSlot('grievance email')).toBe(null);
  });

  it('reads a slot however the copy happens to write it', () => {
    expect(resolveSlot('  [Support Email] ')).toBe('support@heywobo.com');
  });
});

describe('the mailbox list on /contact', () => {
  it('lists only addresses the documents publish', () => {
    for (const box of MAILBOXES) {
      expect([box.address, PUBLISHED.has(box.address.toLowerCase())]).toEqual([box.address, true]);
    }
  });

  it('says what each one is for, so a reader picks rather than guesses', () => {
    for (const box of MAILBOXES) expect(box.what.length).toBeGreaterThan(10);
  });

  it('lists every address once, support first', () => {
    const addresses = MAILBOXES.map((b) => b.address);
    expect(new Set(addresses).size).toBe(addresses.length);
    expect(addresses[0]).toBe('support@heywobo.com');
  });

  it('carries every mailbox the documents name, so /contact is the complete list', () => {
    const listed = new Set(MAILBOXES.map((b) => b.address.toLowerCase()));
    // hello@ is the sender on outbound mail, not a box a reader writes to; everything else the
    // documents print is somewhere a person can write, and has to appear on the contact page.
    const expected = [...PUBLISHED].filter((a) => !a.startsWith('hello@'));
    for (const address of expected) expect([address, listed.has(address)]).toEqual([address, true]);
  });
});
