import { describe, expect, it } from 'bun:test';
import { chosenNames, parseMailPrefs } from './mailPrefs';
import {
  inviteParent,
  looksLikeEmail,
  parseStatus,
  readParentLink,
  refusalMessage,
} from './parentLink';

const reply = (status: number, body: unknown) =>
  (async () => new Response(JSON.stringify(body), { status })) as never;

describe('the parent link seam', () => {
  it('reads the status the server wrote, line and all', async () => {
    const got = await readParentLink(
      'https://brain',
      reply(200, { status: 'invited', parent_email: 'a***@x.in', line: 'Invite sent.' }),
    );
    expect(got).toEqual({
      status: 'invited',
      parent_email: 'a***@x.in',
      revoked_by: null,
      line: 'Invite sent.',
    });
  });
  it('answers null with no gateway, and on a body that is not a status', async () => {
    expect(await readParentLink(undefined)).toBeNull();
    expect(await readParentLink('https://brain', reply(200, { hello: 1 }))).toBeNull();
    expect(parseStatus({ status: 'odd', line: 'x' })).toBeNull();
  });
  it('carries a refusal in the server’s own words', async () => {
    const got = await inviteParent(
      { email: 'p@x.in' },
      'https://brain',
      reply(409, { detail: { code: 'link_active', message: 'A parent is already linked.' } }),
    );
    expect(got).toEqual({ ok: false, message: 'A parent is already linked.' });
    expect(refusalMessage({ detail: [{ loc: ['email'] }] })).toBe(
      'I could not send that just now. Try again in a moment.',
    );
  });
  it('reports a sent invite', async () => {
    const got = await inviteParent(
      { email: 'p@x.in', learnerName: 'the learner' },
      'https://brain',
      reply(200, { status: 'invited', line: 'Invite sent to p***@x.in.', sent: true }),
    );
    expect(got.ok).toBe(true);
    if (got.ok) expect(got.status.status).toBe('invited');
  });
  it('tells an email from a phone number', () => {
    expect(looksLikeEmail('mum@example.com')).toBe(true);
    expect(looksLikeEmail('+91 98765 43210')).toBe(false);
  });
});

describe('the festival calendars', () => {
  it('reads the chosen calendars by name', () => {
    const view = parseMailPrefs({
      preferences: { festival_calendar: ['hindu', 'tamil'] },
      calendars: [
        { id: 'hindu', name: 'Hindu festivals' },
        { id: 'tamil', name: 'Tamil festivals', community: true },
      ],
      about_calendars: 'One line.',
    });
    expect(chosenNames(view)).toBe('Hindu festivals, Tamil festivals');
    expect(view?.calendars[1]?.community).toBe(true);
    expect(chosenNames(parseMailPrefs({ preferences: {}, calendars: [] }))).toBeNull();
  });
});
