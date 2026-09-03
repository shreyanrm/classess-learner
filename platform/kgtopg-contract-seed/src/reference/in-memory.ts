import type { MasteryBand, WoboEvent } from '@wobo/contracts';
import { ATOM_NODES } from '../atom-seed';
import type {
  ConsentGrant,
  ConsentTierView,
  MasteryBandView,
  OntologyNode,
  TwinAnswer,
} from '../dto';
import type { EventConsumer, KGtoPG } from '../interface';

const MOCK_SUBJECT = '00000000-0000-7000-8000-000000000001';

interface EvidencePoint {
  correct: boolean;
  independence: number;
}

export interface InMemoryKgtopgOptions {
  consentTier?: ConsentTierView;
  nodes?: OntologyNode[];
}

/**
 * The in-repo KGtoPG reference — enough to build and prove the atom on seed data, with the same
 * interface the live Supabase-backed client will present. It is BOTH the governed-read side and the
 * event store: consuming an evidence-bearing event updates the learner's bands. Idempotent on event_id.
 */
export class InMemoryKgtopg implements KGtoPG, EventConsumer {
  private readonly nodes: Map<string, OntologyNode>;
  private readonly seen = new Set<string>();
  private readonly evidence = new Map<string, EvidencePoint[]>();
  private consentTier: ConsentTierView;

  readonly identity: KGtoPG['identity'];
  readonly ontology: KGtoPG['ontology'];
  readonly mastery: KGtoPG['mastery'];
  readonly twin: KGtoPG['twin'];
  readonly consent: KGtoPG['consent'];

  constructor(opts: InMemoryKgtopgOptions = {}) {
    const nodeList = opts.nodes ?? ATOM_NODES;
    this.nodes = new Map(nodeList.map((n) => [n.node_id, n]));
    this.consentTier = opts.consentTier ?? 'un_elevated';

    this.identity = {
      resolveOrCreateSubject: async () => ({ subject_id: MOCK_SUBJECT }),
    };

    this.ontology = {
      getNode: async (nodeId) => this.nodes.get(nodeId) ?? null,
      getPrerequisites: async (nodeId) => {
        const node = this.nodes.get(nodeId);
        if (!node) return [];
        return node.prerequisite_ids
          .map((id) => this.nodes.get(id))
          .filter((n): n is OntologyNode => n != null);
      },
      compileCourse: async (spec) => {
        const nodes = spec.seedNodeIds?.length
          ? spec.seedNodeIds
              .map((id) => this.nodes.get(id))
              .filter((n): n is OntologyNode => n != null)
          : [...this.nodes.values()].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
        return { course_id: `course-${spec.title.toLowerCase().replace(/\s+/g, '-')}`, nodes };
      },
    };

    this.mastery = {
      getBands: async (subjectId) => this.bandsFor(subjectId),
      getNextBestNode: async (subjectId) => this.nextBestNode(subjectId),
      recordEvidence: async (event) => {
        await this.consume(event);
      },
    };

    this.twin = {
      query: async (subjectId, question) => this.answerTwin(subjectId, question),
    };

    this.consent = {
      getTier: async () => this.consentTier,
      grants: async () => this.grantsFor(),
    };
  }

  /** Idempotent event consumption (the "up" write target). */
  async consume(event: WoboEvent): Promise<{ accepted: boolean; deduped: boolean }> {
    if (this.seen.has(event.event_id)) return { accepted: true, deduped: true };
    this.seen.add(event.event_id);
    this.applyEvidence(event);
    return { accepted: true, deduped: false };
  }

  setConsentTier(tier: ConsentTierView): void {
    this.consentTier = tier;
  }

  private key(subjectId: string, nodeId: string): string {
    return `${subjectId}|${nodeId}`;
  }

  private applyEvidence(event: WoboEvent): void {
    const subject = event.actor.subject_id;
    let point: { nodeId: string; ev: EvidencePoint } | null = null;

    if (event.event_type === 'evidence.recorded.v1') {
      point = {
        nodeId: event.payload.node_id,
        ev: { correct: event.payload.correct, independence: event.payload.independence },
      };
    } else if (event.event_type === 'practice.item.answered.v1') {
      point = {
        nodeId: event.payload.node_id,
        ev: { correct: event.payload.correct, independence: event.payload.independence_signal },
      };
    } else if (event.event_type === 'learn.attempt.submitted.v1') {
      const raw = event.payload.independence_signal;
      // Aided attempts count for less toward the Independence keystone.
      point = {
        nodeId: event.payload.node_id,
        ev: { correct: event.payload.correct, independence: event.payload.aided ? raw * 0.5 : raw },
      };
    }

    if (!point) return;
    const key = this.key(subject, point.nodeId);
    const list = this.evidence.get(key) ?? [];
    list.push(point.ev);
    this.evidence.set(key, list);
  }

  private computeBand(points: EvidencePoint[] | undefined): MasteryBand {
    if (!points || points.length === 0) return 'not_started';
    const correct = points.filter((p) => p.correct);
    const independentCorrect = correct.filter((p) => p.independence >= 0.7);
    const highlyIndependent = correct.filter((p) => p.independence >= 0.9);
    if (highlyIndependent.length >= 4) return 'independent';
    if (independentCorrect.length >= 3) return 'secure';
    if (correct.length >= 2) return 'developing';
    return 'emerging';
  }

  private bandFor(subjectId: string, nodeId: string): MasteryBand {
    return this.computeBand(this.evidence.get(this.key(subjectId, nodeId)));
  }

  private bandsFor(subjectId: string): MasteryBandView[] {
    return [...this.nodes.values()].map((node) => ({
      node_id: node.node_id,
      band: this.bandFor(subjectId, node.node_id),
      scope: 'node',
    }));
  }

  private readonly bandRank: Record<MasteryBand, number> = {
    not_started: 0,
    emerging: 1,
    developing: 2,
    secure: 3,
    independent: 4,
  };

  private nextBestNode(subjectId: string): OntologyNode | null {
    const ordered = [...this.nodes.values()].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
    // Select forward: the first not-yet-secure node whose prerequisites are all at least secure.
    for (const node of ordered) {
      if (this.bandRank[this.bandFor(subjectId, node.node_id)] >= this.bandRank.secure) continue;
      const prereqsReady = node.prerequisite_ids.every(
        (id) => this.bandRank[this.bandFor(subjectId, id)] >= this.bandRank.secure,
      );
      if (prereqsReady) return node;
    }
    // Otherwise, the first node not yet independent.
    return ordered.find((n) => this.bandFor(subjectId, n.node_id) !== 'independent') ?? null;
  }

  private answerTwin(subjectId: string, question: string): TwinAnswer {
    const bands = this.bandsFor(subjectId);
    const weakest = bands.slice().sort((a, b) => this.bandRank[a.band] - this.bandRank[b.band])[0];
    const node = weakest ? this.nodes.get(weakest.node_id) : undefined;
    const answer = node
      ? `Right now your attention is best spent on ${node.name.toLowerCase()}. It is the next step that unlocks the most.`
      : 'There is not enough evidence yet to say. A short practice set will tell us more.';
    return {
      question,
      answer,
      // Honest conditional ranges, never a guarantee.
      ranges: [{ label: 'likely mastery within 3 focused sessions', low: 55, high: 80 }],
    };
  }

  private grantsFor(): ConsentGrant[] {
    if (this.consentTier === 'elevated') {
      return [
        { purpose: 'learning', scope: 'self', age_tier: 'minor' },
        { purpose: 'behavioural_personalisation', scope: 'self', age_tier: 'minor' },
      ];
    }
    // Un-elevated: teaching only, no profiling grant.
    return [{ purpose: 'learning', scope: 'self', age_tier: 'minor' }];
  }
}
