import { beforeEach, describe, expect, it } from 'bun:test';

class FakeStorage {
  readonly map = new Map<string, string>();
  get length(): number {
    return this.map.size;
  }
  key(i: number): string | null {
    return [...this.map.keys()][i] ?? null;
  }
  getItem(k: string): string | null {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.map.set(k, String(v));
  }
  removeItem(k: string): void {
    this.map.delete(k);
  }
  clear(): void {
    this.map.clear();
  }
}

const storage = new FakeStorage();
(globalThis as { localStorage?: unknown }).localStorage = storage;

const { inviteLink, newReferralCode, referralCode } = await import('./referral');

beforeEach(() => storage.clear());

const NAMES = ['Asha Mehta', 'asha', 'Riya', 'riya-sharma', 'Kabir'];

/**
 * An invite link is forwarded — into a class group, a parent's chat, someone's browser history and
 * every downstream referrer header. A minor's name must not be the thing that travels.
 */
describe('an invite link carries a code, never the child', () => {
  it('puts an opaque code in `via`, with no trace of any name', () => {
    const link = inviteLink('https://app.example', 'friend', referralCode());
    const via = new URL(link).searchParams.get('via') ?? '';
    expect(via).toMatch(/^[2-9a-z]{8}$/);
    for (const name of NAMES) {
      const slug = name.toLowerCase().replace(/\s+/g, '-');
      expect(link).not.toContain(slug);
      expect(link).not.toContain(name);
    }
  });

  it('keeps the join route and the guest kind', () => {
    const url = new URL(inviteLink('https://app.example', 'parent', 'abcd2345'));
    expect(url.pathname).toBe('/join');
    expect(url.searchParams.get('as')).toBe('parent');
    expect(url.searchParams.get('via')).toBe('abcd2345');
  });

  it('does not double the slash when the origin already ends in one', () => {
    expect(inviteLink('https://app.example/', 'friend', 'code1234')).toContain(
      'https://app.example/join?',
    );
  });

  it('is stable per device, so a second copy is the same invitation', () => {
    const first = referralCode();
    expect(referralCode()).toBe(first);
    expect(storage.getItem('wobo-referral-code-v1')).toBe(first);
  });

  it('lives under the wobo- prefix, so erase-and-start-over takes it too', () => {
    referralCode();
    expect([...storage.map.keys()].every((k) => k.startsWith('wobo-'))).toBe(true);
  });

  it('mints a fresh code once the device has been erased', () => {
    const before = referralCode();
    storage.clear();
    const after = referralCode();
    expect(after).not.toBe(before);
  });

  it('draws only from the read-aloud alphabet — no 0/1/i/l/o to mishear', () => {
    const code = newReferralCode(new Uint8Array([0, 40, 80, 120, 160, 200, 240, 255]));
    expect(code).toHaveLength(8);
    expect(code).not.toMatch(/[01ilo]/);
  });
});
