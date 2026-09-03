/**
 * The allowance widget reads the real budget or says nothing. It must never invent a number.
 */

import { describe, expect, it } from 'bun:test';
import type { Me } from '@wobo/sdk';
import { allowanceLine, readAllowance } from './allowance';

const me = (
  turns: { used: number | null; limit: number | null; remaining: number | null },
  resetAt: string | null,
): Me => ({
  subject: 'learner',
  anonymous: false,
  plan: 'free',
  consentTier: null,
  budget: { turns, generations: { used: null, limit: null, remaining: null }, resetAt },
});

const at = (d: Date): string => `${d.getUTCHours()}:00`;

describe('readAllowance', () => {
  it('reads what is left and when it comes back', () => {
    const a = readAllowance(me({ used: 8, limit: 20, remaining: 12 }, '2026-09-04T00:00:00Z'));
    expect(a).toMatchObject({ known: true, remaining: 12, limit: 20 });
    expect(a.resetsAt?.toISOString()).toBe('2026-09-04T00:00:00.000Z');
  });

  it('works out what is left where the brain sent only a limit and a count', () => {
    expect(readAllowance(me({ used: 3, limit: 5, remaining: null }, null)).remaining).toBe(2);
  });

  it('never goes below zero', () => {
    expect(readAllowance(me({ used: 9, limit: 5, remaining: null }, null)).remaining).toBe(0);
  });

  it('is unknown where there is no answer at all', () => {
    expect(readAllowance(null)).toEqual({
      known: false,
      remaining: null,
      limit: null,
      resetsAt: null,
    });
  });

  it('ignores a reset instant it cannot read', () => {
    expect(readAllowance(me({ used: 1, limit: 2, remaining: 1 }, 'soon')).resetsAt).toBe(null);
  });
});

describe('allowanceLine', () => {
  it('says what is left, and when it comes back', () => {
    const a = readAllowance(me({ used: 8, limit: 20, remaining: 12 }, '2026-09-04T05:00:00Z'));
    expect(allowanceLine(a, at)).toBe('12 turns of 20 left today. They come back at 5:00.');
  });

  it('counts one turn as one turn', () => {
    const a = readAllowance(me({ used: 19, limit: 20, remaining: 1 }, null));
    expect(allowanceLine(a, at)).toBe('1 turn of 20 left today.');
  });

  it('says the day is spent without a number nobody asked for', () => {
    const a = readAllowance(me({ used: 20, limit: 20, remaining: 0 }, null));
    expect(allowanceLine(a, at)).toBe(
      'No turns left today (20 a day). They come back when the day rolls over.',
    );
  });

  it('admits when it cannot see the budget', () => {
    expect(allowanceLine(readAllowance(null), at)).toBe(
      'Sign in and this shows how many turns are left today, and when they come back.',
    );
  });
});
