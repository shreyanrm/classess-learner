import { type Actor, type ClassessEvent, type Context, makeEvent } from '@classess/contracts';
import { describe, expect, it } from 'bun:test';
import { ATOM_NODE_IDS } from '../src/atom-seed';
import { InMemoryKgtopg } from '../src/reference/in-memory';

const actor: Actor = {
  subject_id: '00000000-0000-7000-8000-000000000001',
  surface: 'pwa',
  session_id: '00000000-0000-7000-8000-0000000000a1',
};
const context: Context = { app: 'learner', env: 'dev', consent_tier: 'un_elevated' };

function evidence(nodeId: string, correct: boolean, independence: number, id: string): ClassessEvent {
  return makeEvent({
    event_id: id,
    event_type: 'evidence.recorded.v1',
    actor,
    context,
    payload: {
      evidence_id: id,
      node_id: nodeId,
      source: 'practice',
      correct,
      independence,
      gap_types: [],
    },
  });
}

describe('InMemoryKgtopg — ontology', () => {
  it('returns the atom node and its confirmed prerequisites', async () => {
    const kg = new InMemoryKgtopg();
    const node = await kg.ontology.getNode(ATOM_NODE_IDS.linearEquations);
    expect(node?.name).toContain('linear equations');
    const prereqs = await kg.ontology.getPrerequisites(ATOM_NODE_IDS.linearEquations);
    expect(prereqs.map((p) => p.node_id)).toEqual([ATOM_NODE_IDS.variables]);
  });
});

describe('InMemoryKgtopg — evidence and mastery', () => {
  it('is idempotent on event_id', async () => {
    const kg = new InMemoryKgtopg();
    const ev = evidence(ATOM_NODE_IDS.integers, true, 0.95, '00000000-0000-7000-8000-0000000000e1');
    expect((await kg.consume(ev)).deduped).toBe(false);
    expect((await kg.consume(ev)).deduped).toBe(true);
    const bands = await kg.mastery.getBands(actor.subject_id);
    const integers = bands.find((b) => b.node_id === ATOM_NODE_IDS.integers);
    // One correct attempt => emerging, and the duplicate did not double-count.
    expect(integers?.band).toBe('emerging');
  });

  it('reaches the independent band on repeated unaided correct evidence', async () => {
    const kg = new InMemoryKgtopg();
    for (let i = 0; i < 4; i++) {
      await kg.consume(evidence(ATOM_NODE_IDS.linearEquations, true, 0.95, `00000000-0000-7000-8000-0000000000f${i}`));
    }
    const bands = await kg.mastery.getBands(actor.subject_id);
    const target = bands.find((b) => b.node_id === ATOM_NODE_IDS.linearEquations);
    expect(target?.band).toBe('independent');
  });

  it('selects forward: the next-best node respects the prerequisite graph', async () => {
    const kg = new InMemoryKgtopg();
    let seq = 0;
    const nextId = () => `00000000-0000-7000-8000-${(seq++).toString(16).padStart(12, '0')}`;
    // Nothing mastered yet: the first node with satisfied prereqs is integers (no prereqs).
    expect((await kg.mastery.getNextBestNode(actor.subject_id))?.node_id).toBe(ATOM_NODE_IDS.integers);
    // Secure integers + variables, then next-best becomes linear equations.
    for (const node of [ATOM_NODE_IDS.integers, ATOM_NODE_IDS.variables]) {
      for (let i = 0; i < 3; i++) {
        await kg.consume(evidence(node, true, 0.85, nextId()));
      }
    }
    expect((await kg.mastery.getNextBestNode(actor.subject_id))?.node_id).toBe(ATOM_NODE_IDS.linearEquations);
  });
});

describe('InMemoryKgtopg — consent', () => {
  it('grants only teaching under un_elevated, and profiling only when elevated', async () => {
    const kg = new InMemoryKgtopg();
    expect(await kg.consent.getTier(actor.subject_id)).toBe('un_elevated');
    expect(await kg.consent.grants(actor.subject_id)).toHaveLength(1);
    kg.setConsentTier('elevated');
    expect(await kg.consent.getTier(actor.subject_id)).toBe('elevated');
    expect((await kg.consent.grants(actor.subject_id)).map((g) => g.purpose)).toContain(
      'behavioural_personalisation',
    );
  });
});
