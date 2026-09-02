import { describe, expect, it } from 'bun:test';
import { mintTurnId } from './chat';

describe('turn ids (the single mint site)', () => {
  it('never repeats — not even past the archive cap, where the old scheme did', () => {
    // The bug: ids were `t${archive.length}-${role}`. The archive is capped at 2000, so from the
    // 2000th turn on every user turn was minted "t2000-user" — colliding for ever after.
    const ids = new Set<string>();
    for (let i = 0; i < 5000; i++) ids.add(mintTurnId());
    expect(ids.size).toBe(5000);
  });

  it('is independent of anything the archive knows: two mints in a row differ', () => {
    expect(mintTurnId()).not.toBe(mintTurnId());
  });

  it('mints something a DOM key and an archive lookup can both use', () => {
    const id = mintTurnId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(8);
  });
});
