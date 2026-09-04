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
import {
  COMPANY,
  MAILBOXES,
  OPEN_TERMS,
  POSTAL_ADDRESS,
  RESOLVED_SLOTS,
  resolveSlot,
} from './identity';

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
    // An address must be one the documents print; anything else (the company, its registered
    // office) must appear in them word for word. Either way the source is the reviewed copy,
    // never this module — that is the only thing standing between a filled bracket and a
    // plausible-looking invention.
    for (const [slot, value] of Object.entries(RESOLVED_SLOTS)) {
      const isEmail = value.includes('@');
      const published = isEmail ? PUBLISHED.has(value.toLowerCase()) : SET.includes(value);
      expect([slot, published]).toEqual([slot, true]);
    }
    expect(SET).toContain(COMPANY);
    expect(SET).toContain(POSTAL_ADDRESS);
  });

  it('fills the two slots that were showing as gaps beside a page that printed them', () => {
    expect(resolveSlot('support email')).toBe('support@heywobo.com');
    // The privacy policy gives support@ as the address a data request goes to, so that is what
    // the slot resolves to — the module reads the documents, it never picks a mailbox.
    expect(resolveSlot('[privacy email]')).toBe('support@heywobo.com');
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

  it('lists nothing the documents have stopped publishing', () => {
    // The legal set collapsed onto one mailbox a reader writes to, plus the two it still names
    // for a specific kind of message. A box that leaves the documents has to leave /contact in
    // the same breath, or the page prints an address nobody reads.
    const listed = MAILBOXES.map((b) => b.address.toLowerCase()).sort();
    expect(listed).toEqual([...PUBLISHED].filter((a) => !a.startsWith('hello@')).sort());
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
