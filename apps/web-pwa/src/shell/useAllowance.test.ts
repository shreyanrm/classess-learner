import { describe, expect, it } from 'bun:test';
import { allowanceNote, allowanceProgress } from './useAllowance';

describe('the rail’s allowance card', () => {
  const now = new Date('2026-09-03T20:00:00+05:30');

  it('says what is left and when it comes back', () => {
    const resetsAt = new Date('2026-09-04T06:00:00+05:30');
    const a = { known: true, remaining: 25, limit: 40, resetsAt };
    const note = allowanceNote(a, now);
    expect(note.startsWith('25 of 40 turns left · resets ')).toBe(true);
    expect(note).toMatch(/resets \d{1,2}:\d{2}( [ap]m)?$/);
    expect(allowanceProgress(a)).toBe(0.625);
  });

  it('leaves the reset off when the brain gave none', () => {
    expect(allowanceNote({ known: true, remaining: 3, limit: null, resetsAt: null }, now)).toBe(
      '3 turns left',
    );
    expect(
      allowanceProgress({ known: true, remaining: 3, limit: null, resetsAt: null }),
    ).toBeUndefined();
  });

  it('says it could not read one rather than inventing a number', () => {
    expect(allowanceNote({ known: false, remaining: null, limit: null, resetsAt: null }, now)).toBe(
      'Sign in and this shows how much of today is left, and when it comes back.',
    );
  });
});
