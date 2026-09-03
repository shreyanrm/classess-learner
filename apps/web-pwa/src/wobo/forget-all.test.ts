import { describe, expect, it } from 'bun:test';

/** A localStorage stand-in — the mind writes through it, so the wipe is observable here. */
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

const { capabilityById, forgetAllOffer } = await import('./capabilities');
const { loadMind, rememberFact } = await import('../store/mind');

describe("forget everything — Wobo asks before Wobo wipes the learner's memory", () => {
  it('is a capability on the permission ladder, not something a model reply can just do', () => {
    const capability = capabilityById('forget_all');
    expect(capability).toBeDefined();
    // execute_with_permission is what renders the approve / not now card in the thread.
    expect(capability?.rung).toBe('execute_with_permission');
  });

  it('offers it as a card the learner has to approve, with the cost stated on it', () => {
    const offer = forgetAllOffer('offer-1');
    expect(offer.capability).toBe('forget_all');
    expect(offer.status).toBe('offered'); // offered, not taken — nothing has happened yet
    expect(offer.offerId).toBe('offer-1');
    expect(offer.evidence.join(' ')).toContain('cannot be undone');
    expect(capabilityById(offer.capability)?.rung).toBe('execute_with_permission');
  });

  it('leaves the memory untouched until the card is approved, then clears it', async () => {
    rememberFact('exam on Friday');
    expect(loadMind().facts).toContain('exam on Friday');

    // Minting the offer is what a turn does; the mind must survive it intact.
    forgetAllOffer('offer-2');
    expect(loadMind().facts).toContain('exam on Friday');

    // Approving the card is the only thing that runs the capability.
    const capability = capabilityById('forget_all');
    const said = await capability?.run(
      {} as Parameters<NonNullable<typeof capability>['run']>[0],
      {},
    );
    expect(loadMind().facts).toEqual([]);
    expect(said).toContain('cleared everything');
  });
});
