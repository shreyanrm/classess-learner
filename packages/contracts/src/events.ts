import { z } from 'zod';
import { EnvelopeBase } from './envelope';
import * as P from './payloads';

/**
 * The event registry: the single mapping from event_type -> typed payload schema.
 * This object IS the taxonomy. Extend it (add rows); never rename or repurpose a row.
 * Introduce a *.v2 type alongside *.v1 when a payload's meaning must change.
 */
export const EventPayloads = {
  // Identity / session
  'identity.subject.created.v1': P.IdentitySubjectCreated,
  'session.started.v1': P.SessionStarted,
  'session.ended.v1': P.SessionEnded,

  // Onboarding
  'onboarding.step.completed.v1': P.OnboardingStepCompleted,
  'onboarding.goal.set.v1': P.OnboardingGoalSet,
  'onboarding.diagnostic.answered.v1': P.OnboardingDiagnosticAnswered,

  // Learn loop
  'learn.node.entered.v1': P.LearnNodeEntered,
  'learn.opener.posed.v1': P.LearnOpenerPosed,
  'learn.attempt.submitted.v1': P.LearnAttemptSubmitted,
  'learn.reveal.shown.v1': P.LearnRevealShown,
  'learn.modality.switched.v1': P.LearnModalitySwitched,
  'learn.node.completed.v1': P.LearnNodeCompleted,

  // Practice / evidence / mastery
  'practice.item.served.v1': P.PracticeItemServed,
  'practice.item.answered.v1': P.PracticeItemAnswered,
  'practice.retrieval.scheduled.v1': P.PracticeRetrievalScheduled,
  'evidence.recorded.v1': P.EvidenceRecorded,
  'mastery.band.changed.v1': P.MasteryBandChanged,

  // Wobo
  'wobo.opened.v1': P.WoboOpened,
  'wobo.turn.user.v1': P.WoboTurnUser,
  'wobo.turn.assistant.v1': P.WoboTurnAssistant,
  'wobo.hint.escalated.v1': P.WoboHintEscalated,
  'wobo.perceived.work.v1': P.WoboPerceivedWork,
  'wobo.offer.outcome.v1': P.WoboOfferOutcome,

  // Create-anything
  'create.request.submitted.v1': P.CreateRequestSubmitted,
  'create.course.compiled.v1': P.CreateCourseCompiled,
  'create.node.mapped.v1': P.CreateNodeMapped,

  // Meter / conversion
  'meter.session.opened.v1': P.MeterSessionOpened,
  'meter.budget.consumed.v1': P.MeterBudgetConsumed,
  'meter.peak.detected.v1': P.MeterPeakDetected,
  'conversion.moment.shown.v1': P.ConversionMomentShown,
  'conversion.completed.v1': P.ConversionCompleted,

  // Parent
  'parent.linked.v1': P.ParentLinked,
  'parent.digest.sent.v1': P.ParentDigestSent,
  'parent.query.asked.v1': P.ParentQueryAsked,

  // Knowledge twin (additive extension)
  'twin.query.asked.v1': P.TwinQueryAsked,

  // Safety / integrity
  'safety.flag.raised.v1': P.SafetyFlagRaised,
  'integrity.signal.recorded.v1': P.IntegritySignalRecorded,
} as const;

/** Every valid event_type, as a string-literal union. */
export type EventType = keyof typeof EventPayloads;

/** Runtime list of all event types (stable order = declaration order). */
export const EVENT_TYPES = Object.keys(EventPayloads) as EventType[];

/** The inferred payload type for a given event_type. */
export type PayloadOf<T extends EventType> = z.infer<(typeof EventPayloads)[T]>;

type EnvelopeCommon = Omit<z.infer<typeof EnvelopeBase>, 'event_type'>;

/** A fully typed event: envelope + the right payload for its event_type (discriminated). */
export type WoboEvent<T extends EventType = EventType> = {
  [K in T]: EnvelopeCommon & { event_type: K; payload: PayloadOf<K> };
}[T];

/** Build the runtime Zod schema for one concrete event_type (envelope + literal + payload). */
export function eventSchema<T extends EventType>(type: T) {
  return EnvelopeBase.extend({
    event_type: z.literal(type),
    payload: EventPayloads[type],
  });
}

const members = EVENT_TYPES.map((t) => eventSchema(t));

/** Validates any event by discriminating on event_type. */
export const AnyEventSchema = z.discriminatedUnion(
  'event_type',
  members as [(typeof members)[number], ...(typeof members)[number][]],
);

/** Type guard: is this string a known event_type? */
export function isEventType(value: string): value is EventType {
  return value in EventPayloads;
}
