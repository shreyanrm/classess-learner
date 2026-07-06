import { describe, expect, it } from 'bun:test';
import { ATOM_NODE_IDS, createSdk, reviewCard } from '../src/index';

function uuid(n: number): string {
  return `00000000-0000-7000-8000-${n.toString(16).padStart(12, '0')}`;
}

describe('event backbone -> mastery -> ignite', () => {
  it('records evidence events that carry the learner to independent', async () => {
    const sdk = createSdk();
    const session = await sdk.identity.getSession();

    for (let i = 0; i < 4; i++) {
      sdk.events.record(
        'evidence.recorded.v1',
        {
          evidence_id: uuid(i),
          node_id: ATOM_NODE_IDS.linearEquations,
          source: 'practice',
          correct: true,
          independence: 0.95,
          gap_types: [],
        },
        { ontologyNodeId: ATOM_NODE_IDS.linearEquations },
      );
    }

    const bands = await sdk.kgtopg.mastery.getBands(session.subject_id);
    const target = bands.find((b) => b.node_id === ATOM_NODE_IDS.linearEquations);
    // Unaided, independent, repeated correct evidence => the ignite-triggering band.
    expect(target?.band).toBe('independent');
    expect(sdk.events.countByType()['evidence.recorded.v1']).toBe(4);
    // Every recorded event carries the consent tier (the contract guarantee).
    expect(sdk.events.getLog().every((e) => e.context.consent_tier === 'un_elevated')).toBe(true);
  });
});

describe('FSRS-lite', () => {
  it('grows the interval on success and pulls a lapse back soon', () => {
    const now = Date.parse('2026-07-01T00:00:00Z');
    const first = reviewCard(null, true, now);
    const second = reviewCard(first, true, now);
    expect(second.stabilityDays).toBeGreaterThan(first.stabilityDays);

    const lapse = reviewCard(second, false, now);
    expect(lapse.stabilityDays).toBeLessThan(1);
    expect(lapse.difficulty).toBeGreaterThan(second.difficulty);
    expect(lapse.lapses).toBe(1);
  });
});

describe('practice content', () => {
  it('serves verified practice items for the atom', async () => {
    const sdk = createSdk();
    const items = await sdk.content.getPracticeItems(ATOM_NODE_IDS.linearEquations);
    expect(items.length).toBeGreaterThanOrEqual(5);
    expect(items.every((i) => i.answer.length > 0)).toBe(true);
  });
});
