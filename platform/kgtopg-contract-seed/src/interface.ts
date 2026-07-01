import type { ClassessEvent } from '@classess/contracts';
import type {
  ConsentGrant,
  ConsentTierView,
  MasteryBandView,
  OntologyNode,
  TwinAnswer,
} from './dto';

/**
 * The KGtoPG governed-view interface — the ONLY way the app touches the platform plane. It is
 * implemented by the in-repo reference (for the mock-first walkable atom) and, later, by a Supabase
 * client that calls the real platform functions (platform.read_events, satisfied_purposes, the
 * ontology, the event write). The app calls these through the SDK; it never reads platform tables.
 */
export interface KGtoPG {
  identity: {
    /** Resolve or mint an opaque canonical subject. In dev this returns the fixed mock subject. */
    resolveOrCreateSubject(seed: { hint?: string }): Promise<{ subject_id: string }>;
  };
  ontology: {
    getNode(nodeId: string): Promise<OntologyNode | null>;
    getPrerequisites(nodeId: string): Promise<OntologyNode[]>;
    /** Create-anything: compile a learner-defined course into a verified node sequence. */
    compileCourse(spec: {
      title: string;
      seedNodeIds?: string[];
    }): Promise<{ course_id: string; nodes: OntologyNode[] }>;
  };
  mastery: {
    getBands(subjectId: string, scope?: string): Promise<MasteryBandView[]>;
    /** The orchestrator hook: the node that best advances mastery along the prereq graph. */
    getNextBestNode(subjectId: string, scope?: string): Promise<OntologyNode | null>;
    /** Evidence is recorded via an event, idempotently. */
    recordEvidence(event: ClassessEvent): Promise<void>;
  };
  twin: {
    query(subjectId: string, question: string): Promise<TwinAnswer>;
  };
  consent: {
    /** Derived from the platform's active grants (DPDP): un_elevated unless a grant elevates it. */
    getTier(subjectId: string): Promise<ConsentTierView>;
    grants(subjectId: string): Promise<ConsentGrant[]>;
  };
}

/**
 * The event consumer — the "up" write target of the outbox relay (the KGtoPG event store). Idempotent
 * on event_id: consuming the same event twice is a no-op that reports `deduped`.
 */
export interface EventConsumer {
  consume(event: ClassessEvent): Promise<{ accepted: boolean; deduped: boolean }>;
}
