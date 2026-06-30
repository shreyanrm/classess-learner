import { z } from 'zod';

/** Where the action happened. */
export const Surface = z.enum(['expo', 'pwa']);
export type Surface = z.infer<typeof Surface>;

/** Deployment environment. */
export const Env = z.enum(['dev', 'stg', 'prod']);
export type Env = z.infer<typeof Env>;

/**
 * Consent tier (DPDP). Travels on EVERY event and gates downstream intelligence.
 * un_elevated => no profiling, no archetype, no behavioural peak-cut. Teaching still works.
 */
export const ConsentTier = z.enum(['un_elevated', 'elevated']);
export type ConsentTier = z.infer<typeof ConsentTier>;

/** The only app that emits on this contract today. */
export const App = z.enum(['learner']);
export type App = z.infer<typeof App>;

/** Plain-language mastery bands. Never expose the raw formula. */
export const MasteryBand = z.enum([
  'not_started',
  'emerging',
  'developing',
  'secure',
  'independent',
]);
export type MasteryBand = z.infer<typeof MasteryBand>;

/** The ten gap types the evidence engine classifies. */
export const GapType = z.enum([
  'prerequisite',
  'conceptual',
  'procedural',
  'application',
  'retention',
  'language',
  'accuracy',
  'speed',
  'confidence',
  'support_dependency',
]);
export type GapType = z.infer<typeof GapType>;

/** Representations the orchestrator can switch between (adaptive multi-representation, not VAK). */
export const Modality = z.enum([
  'opener',
  'canvas',
  'reading',
  'video',
  'podcast',
  'simulator',
  'flashcard',
  'worksheet',
  'minigame',
  'interactive',
]);
export type Modality = z.infer<typeof Modality>;

/** The assistance ladder; support fades as competence grows. */
export const AssistanceLevel = z.enum([
  'learn',
  'coach',
  'hint',
  'work_with_me',
  'check_my_work',
  'challenge',
  'assessment',
]);
export type AssistanceLevel = z.infer<typeof AssistanceLevel>;

/**
 * The six silent archetypes. Drives copy/reward/paywall framing + timing — NEVER price,
 * and only ever computed under the elevated consent tier.
 */
export const Archetype = z.enum([
  'competitor',
  'mastery_seeker',
  'exam_anxious',
  'ritualist',
  'belonger',
  'dabbler',
]);
export type Archetype = z.infer<typeof Archetype>;

/** The two model tracks. Never conflated at the gateway. */
export const Track = z.enum(['track_1', 'track_2']);
export type Track = z.infer<typeof Track>;
