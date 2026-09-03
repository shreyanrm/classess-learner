import type { GapType, MasteryBand } from '@wobo/contracts';

/**
 * Governed-view DTOs — the typed shapes the app reads DOWN from the KGtoPG plane. These mirror the
 * real platform (opaque canonical UUID, no PII, purpose + age-tier consent, ontology topics with
 * expert-validated prerequisite edges, confidence-gated content). The app never sees platform tables;
 * it sees these DTOs through the KGtoPG interface.
 */

export interface OntologyNode {
  node_id: string;
  name: string;
  kind: 'subject' | 'chapter' | 'topic';
  /** Confirmed prerequisite topics (only steward-validated edges are trusted for routing). */
  prerequisite_ids: string[];
  /** The concept's earned content-colour (a @wobo/config accent). */
  accent?: string;
  sequence?: number;
}

/** The six multiplicative mastery factors (Independence is the keystone). */
export interface MasteryFactorView {
  performance: number;
  reliability: number;
  independence: number;
  difficulty: number;
  recency: number;
  consistency: number;
}

export interface MasteryBandView {
  node_id: string;
  band: MasteryBand;
  scope: 'node' | 'chapter' | 'subject';
  factors?: Partial<MasteryFactorView>;
  gap_types?: GapType[];
}

/** Twin answers are honest conditional ranges, never guarantees. */
export interface TwinAnswer {
  question: string;
  answer: string;
  ranges?: { label: string; low: number; high: number }[];
}

/** A consent grant (platform.consents): purpose + scope + age_tier, active while not revoked. */
export interface ConsentGrant {
  purpose: string;
  scope: string;
  age_tier: string;
}

/** The app-facing consent tier, derived from the platform's active grants. */
export type ConsentTierView = 'un_elevated' | 'elevated';

/** A verified content artifact (operational.content_versions): served only when verified_served. */
export interface VerifiedContent {
  node_id: string;
  modality: string;
  verification_hash: string;
  verified_served: boolean;
  verification_confidence?: number;
  body: unknown;
}
