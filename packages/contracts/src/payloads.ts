import { z } from 'zod';
import {
  AssistanceLevel,
  ConsentTier,
  GapType,
  MasteryBand,
  Modality,
  Surface,
  Track,
} from './enums';
import { zIsoUtc, zLabel, zLatencyMs, zUnitInterval, zUuid } from './primitives';

/**
 * Typed payloads for every event_type in the taxonomy. No untyped blobs: every shape here
 * is a real schema. Payloads are invented implementation detail (permitted); the taxonomy
 * and envelope are the locked contract. Add fields additively; introduce *.v2 rather than
 * repurposing a v1 payload.
 */

// --- Shared value objects ---------------------------------------------------

/** A learner's response to a prompt/item. Tagged union so each modality is typed. */
export const AttemptResponse = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('choice'), selected: z.array(z.string()).min(1) }),
  z.object({ kind: z.literal('numeric'), value: z.number() }),
  z.object({ kind: z.literal('expression'), latex: z.string(), normalized: z.string().optional() }),
  z.object({ kind: z.literal('text'), text: z.string() }),
  z.object({ kind: z.literal('steps'), steps: z.array(z.object({ latex: z.string() })).min(1) }),
]);
export type AttemptResponse = z.infer<typeof AttemptResponse>;

/** The six multiplicative mastery factors (each normalized 0..1). Independence is the keystone. */
export const MasteryFactors = z.object({
  performance: zUnitInterval,
  reliability: zUnitInterval,
  independence: zUnitInterval,
  difficulty: zUnitInterval,
  recency: zUnitInterval,
  consistency: zUnitInterval,
});
export type MasteryFactors = z.infer<typeof MasteryFactors>;

// --- Identity / session -----------------------------------------------------

export const IdentitySubjectCreated = z.object({
  source: z.enum(['dev_mock', 'phone_otp', 'linked']),
  age_branch: z.enum(['adult', 'minor', 'unknown']),
  country_code: z.string().length(2).optional(),
  consent_tier_initial: ConsentTier,
});

export const SessionStarted = z.object({
  surface: Surface,
  app_version: z.string(),
  locale: z.string(),
  resumed: z.boolean(),
});

export const SessionEnded = z.object({
  duration_ms: zLatencyMs,
  reason: z.enum(['user_exit', 'timeout', 'backgrounded', 'meter_cut']),
});

// --- Onboarding -------------------------------------------------------------

export const OnboardingStepCompleted = z.object({
  step: z.enum(['door_choice', 'age_grade', 'goal', 'diagnostic', 'aha']),
  step_index: z.number().int().nonnegative(),
  total_steps: z.number().int().positive(),
  door: z.enum(['template', 'create']).optional(),
});

export const OnboardingGoalSet = z.object({
  goal_text: zLabel,
  goal_kind: z.enum(['exam', 'mastery', 'curiosity', 'board_completion', 'other']),
  target_node_id: zUuid.optional(),
});

export const OnboardingDiagnosticAnswered = z.object({
  item_id: zUuid,
  node_id: zUuid,
  response: AttemptResponse,
  correct: z.boolean(),
  latency_ms: zLatencyMs,
  placement_band: MasteryBand.optional(),
});

// --- Learn loop -------------------------------------------------------------

export const LearnNodeEntered = z.object({
  node_id: zUuid,
  course_id: zUuid.optional(),
  entry: z.enum(['onboarding', 'map', 'next_best', 'create', 'practice_review']),
  initial_band: MasteryBand,
});

export const LearnOpenerPosed = z.object({
  node_id: zUuid,
  opener_id: zUuid,
  modality: Modality,
  verification_hash: z.string(),
  interactive: z.boolean(),
});

export const LearnAttemptSubmitted = z.object({
  node_id: zUuid,
  opener_id: zUuid.optional(),
  item_id: zUuid.optional(),
  response: AttemptResponse,
  correct: z.boolean(),
  /** Whether help (Wobo/hint/reveal) was active when this attempt was made. */
  aided: z.boolean(),
  /** 0 = fully supported, 1 = fully independent. Feeds the Independence keystone. */
  independence_signal: zUnitInterval,
  latency_ms: zLatencyMs,
  attempt_index: z.number().int().nonnegative(),
});

export const LearnRevealShown = z.object({
  node_id: zUuid,
  reveal_id: zUuid,
  modality: Modality,
  /** Reveals only fade in AFTER a struggle; this records how many attempts preceded it. */
  after_attempts: z.number().int().nonnegative(),
  verification_hash: z.string(),
});

export const LearnModalitySwitched = z.object({
  node_id: zUuid,
  from: Modality,
  to: Modality,
  reason: z.enum(['repeated_miss', 'frustration', 'request', 'orchestrator']),
});

export const LearnNodeCompleted = z.object({
  node_id: zUuid,
  course_id: zUuid.optional(),
  final_band: MasteryBand,
  attempts_total: z.number().int().nonnegative(),
  duration_ms: zLatencyMs,
});

// --- Practice / evidence / mastery ------------------------------------------

export const PracticeItemServed = z.object({
  node_id: zUuid,
  item_id: zUuid,
  difficulty: zUnitInterval,
  irt_b: z.number().optional(),
  scheduled_by: z.enum(['fsrs', 'orchestrator']),
  /** Practice is deliberately unaided; recorded here as a contract guarantee. */
  aided: z.literal(false),
});

export const PracticeItemAnswered = z.object({
  node_id: zUuid,
  item_id: zUuid,
  response: AttemptResponse,
  correct: z.boolean(),
  latency_ms: zLatencyMs,
  independence_signal: zUnitInterval,
});

export const PracticeRetrievalScheduled = z.object({
  node_id: zUuid,
  item_id: zUuid.optional(),
  due_at: zIsoUtc,
  stability: z.number().optional(),
  difficulty: z.number().optional(),
  scheduler: z.literal('fsrs'),
});

export const EvidenceRecorded = z.object({
  evidence_id: zUuid,
  node_id: zUuid,
  source: z.enum(['learn', 'practice', 'diagnostic']),
  correct: z.boolean(),
  /** Independence at the moment of evidence; the keystone factor. */
  independence: zUnitInterval,
  factors: MasteryFactors.partial().optional(),
  gap_types: z.array(GapType).default([]),
});

export const MasteryBandChanged = z.object({
  node_id: zUuid,
  from_band: MasteryBand,
  to_band: MasteryBand,
  scope: z.enum(['node', 'chapter', 'subject']),
  triggered_by_event_id: zUuid.optional(),
  /** True when this crossing should fire the ignite moment in the UI. */
  ignite: z.boolean(),
});

// --- Wobo ------------------------------------------------------------------

export const WoboOpened = z.object({
  node_id: zUuid.optional(),
  trigger: z.enum(['tap', 'struggle_threshold', 'orchestrator']),
});

export const WoboTurnUser = z.object({
  node_id: zUuid.optional(),
  turn_id: zUuid,
  input_mode: z.enum(['text', 'voice']),
  text: z.string().optional(),
  has_audio: z.boolean(),
});

export const WoboTurnAssistant = z.object({
  node_id: zUuid.optional(),
  turn_id: zUuid,
  assistance_level: AssistanceLevel,
  hint_level: z.number().int().nonnegative(),
  first_token_ms: zLatencyMs.optional(),
  grounded: z.boolean(),
  verification_hash: z.string().optional(),
  track: Track,
  /** Hard contract guarantee: Wobo never hands over the answer. */
  handed_answer: z.literal(false),
});

export const WoboHintEscalated = z.object({
  node_id: zUuid,
  from_level: z.number().int().nonnegative(),
  to_level: z.number().int().nonnegative(),
  reason: z.enum(['repeated_miss', 'explicit_request', 'time']),
});

export const WoboPerceivedWork = z.object({
  node_id: zUuid,
  /** Perception is via the app event/state stream, never screen-share. Locked in the contract. */
  via: z.literal('event_stream'),
  source: z.enum(['canvas', 'spoken_hinglish']),
  signal_summary: z.string().optional(),
});

/** The learner's response to an action Wobo offered — every recommendation is accountable. */
export const WoboOfferOutcome = z.object({
  /** Correlates with the offer card shown in the thread. */
  offer_id: zUuid,
  /** Capability id from the app-side registry (e.g. open_course, prepare_parent_note). */
  capability: z.string().min(1).max(120),
  outcome: z.enum(['taken', 'ignored']),
  /** The confidence band shown on the card when offered. */
  confidence: z.enum(['high', 'medium', 'low']).optional(),
});

// --- Create-anything --------------------------------------------------------

export const CreateRequestSubmitted = z.object({
  request_id: zUuid,
  prompt_text: z.string().min(1).max(2000),
  input_mode: z.enum(['text', 'voice']),
  /** Child-safety moderation runs BEFORE the request acts. */
  moderation_passed: z.boolean(),
});

export const CreateCourseCompiled = z.object({
  request_id: zUuid,
  course_id: zUuid,
  node_count: z.number().int().nonnegative(),
  reused_node_count: z.number().int().nonnegative(),
  new_node_count: z.number().int().nonnegative(),
  /** Nothing serves unless every compiled node passed the verifier. */
  all_verified: z.boolean(),
});

export const CreateNodeMapped = z.object({
  course_id: zUuid,
  node_id: zUuid,
  ontology_parent_id: zUuid.optional(),
  is_new: z.boolean(),
  prerequisite_ids: z.array(zUuid).default([]),
});

// --- Meter / conversion -----------------------------------------------------

export const MeterSessionOpened = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Budget is in concepts mastered, never a clock. */
  budget_total: z.number().int().nonnegative(),
  budget_remaining: z.number().int().nonnegative(),
});

export const MeterBudgetConsumed = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  consumed_delta: z.number().int(),
  budget_remaining: z.number().int().nonnegative(),
  reason: z.enum(['node_mastered', 'concept_attempted']),
});

export const MeterPeakDetected = z.object({
  signal: z.enum(['liking_peak', 'flow_break', 'fatigue']),
  /** The meter NEVER cuts before a real win that day. */
  day_had_real_win: z.boolean(),
  /** Peak-cut is an elevated-only capability; recorded for auditability. */
  consent_tier_required: z.literal('elevated'),
});

export const ConversionMomentShown = z.object({
  trigger: z.enum(['concept_mastered', 'streak_milestone', 'constellation_unlock']),
  /** ~80% aspiration, ~20% honest concern. */
  framing: z.enum(['aspiration', 'concern']),
  plan: z.literal('superstar'),
  /** Near-silent weeks 1-2; sharpen week 3+. */
  week_index: z.number().int().nonnegative(),
});

export const ConversionCompleted = z.object({
  plan: z.literal('superstar'),
  cycle: z.enum(['monthly', 'annual']),
  amount_inr: z.number().int().positive(),
  currency: z.literal('INR'),
});

// --- Parent -----------------------------------------------------------------

export const ParentLinked = z.object({
  parent_ref: zUuid,
  relationship: z.enum(['parent', 'guardian']),
  channel: z.enum(['whatsapp', 'email']),
});

export const ParentDigestSent = z.object({
  parent_ref: zUuid,
  period_start: zIsoUtc,
  period_end: zIsoUtc,
  channel: z.enum(['whatsapp', 'email']),
  artifact_id: zUuid,
  /** Digests always lead with pride, never deficit-shame. */
  pride_first: z.literal(true),
});

export const ParentQueryAsked = z.object({
  parent_ref: zUuid,
  query_text: z.string().min(1).max(2000),
  channel: z.enum(['whatsapp', 'email']),
});

// --- Knowledge twin (additive extension; flows 07 & 09) ---------------------

export const TwinQueryAsked = z.object({
  asker: z.enum(['learner', 'parent']),
  query_text: z.string().min(1).max(2000),
  scope: z.enum(['subject', 'chapter', 'node', 'global']).optional(),
});

// --- Safety / integrity -----------------------------------------------------

export const SafetyFlagRaised = z.object({
  surface: z.string(),
  category: z.enum(['moderation', 'crisis', 'pii', 'abuse']),
  severity: z.enum(['low', 'medium', 'high']),
  /** Fail-closed: moderation blocks before UGC reaches another learner. */
  action: z.enum(['blocked', 'escalated', 'logged']),
  escalated_to: z.enum(['guardian', 'safety_team']).optional(),
});

export const IntegritySignalRecorded = z.object({
  node_id: zUuid.optional(),
  signal: z.enum(['answer_copying', 'automation', 'rapid_correct', 'meter_abuse', 'cost_abuse']),
  confidence: zUnitInterval,
});
