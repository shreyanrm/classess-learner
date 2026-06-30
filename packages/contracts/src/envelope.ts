import { z } from 'zod';
import { App, ConsentTier, Env, Surface } from './enums';
import { zIsoUtc, zUuid } from './primitives';

/**
 * The canonical event envelope. Every meaningful action emits exactly one event with this
 * envelope. Defined once here (TS source of truth) and mirrored into the Python services
 * via the emitted JSON Schema bundle. Immutable from commit 1: add fields, never repurpose.
 */

export const Actor = z.object({
  /** Opaque canonical learner UUID (KGtoPG identity); a fixed dev-mock subject in dev. */
  subject_id: zUuid,
  surface: Surface,
  session_id: zUuid,
});
export type Actor = z.infer<typeof Actor>;

export const Context = z.object({
  app: App,
  env: Env,
  /** Present when the action is about a concept. */
  ontology_node_id: zUuid.optional(),
  course_id: zUuid.optional(),
  /** Gates downstream intelligence (DPDP). Required on every event. */
  consent_tier: ConsentTier,
});
export type Context = z.infer<typeof Context>;

export const Trace = z.object({
  request_id: zUuid,
  causation_id: zUuid.optional(),
  correlation_id: zUuid.optional(),
});
export type Trace = z.infer<typeof Trace>;

/**
 * The envelope fields shared by every event. The per-event schemas in `events.ts` extend
 * this with a literal `event_type` and a typed `payload`.
 */
export const EnvelopeBase = z.object({
  /** uuid v7, time-ordered. Also the idempotency key end to end. */
  event_id: zUuid,
  /** dot-namespaced + versioned, e.g. "learn.attempt.submitted.v1". */
  event_type: z.string(),
  /** ISO-8601 UTC. Client-truthful, server-stamped on ingest. */
  occurred_at: zIsoUtc,
  actor: Actor,
  context: Context,
  trace: Trace,
});
export type EnvelopeBase = z.infer<typeof EnvelopeBase>;

/** The envelope minus event_type/payload — the common shape callers must supply. */
export type Envelope = Omit<EnvelopeBase, 'event_type'>;
