# 01 · Data & The Event Contract (the highest-stakes seam)

> Build this first. Everything else depends on it. The contract is immutable from commit 1 (additive changes only).

## The event envelope (canonical)
Every meaningful action emits one event with this envelope. Define it once in `/packages/contracts` (TS) and mirror in the
python services. Persisted to the outbox in the same transaction as the state change.

```ts
type WoboEvent<TPayload = unknown> = {
  event_id: string;            // uuid v7 (time-ordered)
  event_type: string;          // dot.namespaced, versioned: "learn.attempt.submitted.v1"
  occurred_at: string;         // ISO-8601 UTC, client-truthful, server-stamped on ingest
  actor: {
    subject_id: string;        // opaque canonical learner UUID (KGtoPG identity); dev-mock in dev
    surface: "expo" | "pwa";
    session_id: string;
  };
  context: {
    app: "learner";
    env: "dev" | "stg" | "prod";
    ontology_node_id?: string; // when the action is about a concept
    course_id?: string;
    consent_tier: "un_elevated" | "elevated";  // gates downstream intelligence (DPDP)
  };
  payload: TPayload;           // event-type-specific, typed
  trace: { request_id: string; causation_id?: string; correlation_id?: string };
};
```

## Rules
- **Append-only.** Events are facts that happened. Never update/delete; correct with a new compensating event.
- **Idempotent.** `event_id` is the idempotency key end to end.
- **Typed payloads.** Each `event_type` has a payload schema in `/packages/contracts`. No untyped blobs.
- **Consent tier travels on every event.** Downstream intelligence honours it (un-elevated → no profiling).
- **Versioned types.** `*.v1`; introduce `*.v2` additively, never repurpose `v1`.

## The event taxonomy (initial — extend, never rename)
Identity/session: `identity.subject.created.v1`, `session.started.v1`, `session.ended.v1`
Onboarding: `onboarding.step.completed.v1`, `onboarding.diagnostic.answered.v1`, `onboarding.goal.set.v1`
Learn loop: `learn.node.entered.v1`, `learn.opener.posed.v1`, `learn.attempt.submitted.v1`, `learn.reveal.shown.v1`,
  `learn.modality.switched.v1`, `learn.node.completed.v1`
Practice/evidence: `practice.item.served.v1`, `practice.item.answered.v1`, `practice.retrieval.scheduled.v1` (FSRS),
  `evidence.recorded.v1`, `mastery.band.changed.v1`
Wobo: `wobo.opened.v1`, `wobo.turn.user.v1`, `wobo.turn.assistant.v1`, `wobo.hint.escalated.v1`, `wobo.perceived.work.v1`
Create-anything: `create.request.submitted.v1`, `create.course.compiled.v1`, `create.node.mapped.v1`
Meter/conversion: `meter.session.opened.v1`, `meter.budget.consumed.v1`, `meter.peak.detected.v1`, `conversion.moment.shown.v1`, `conversion.completed.v1`
Parent: `parent.linked.v1`, `parent.digest.sent.v1`, `parent.query.asked.v1`
Integrity/safety: `safety.flag.raised.v1`, `integrity.signal.recorded.v1`

## Outbox + publisher
- Table `outbox(event_id pk, event_type, payload jsonb, occurred_at, published_at null, attempts int)`.
- Domain writes append to `outbox` inside the business transaction.
- A relay worker publishes unpublished rows to KGtoPG (at-least-once, ordered per aggregate), marks `published_at`.
- Consumers dedupe on `event_id`. **Never** publish from app code directly — only through the outbox.

## Operational data model (Supabase, this repo)
Operational tables hold *working state*, not canonical truth. Canonical truth (identity, mastery, evidence) lives in KGtoPG;
the app keeps a **read cache** of governed views for snappy UI, refreshed on event echoes. Minimum operational tables:
`profiles_cache`, `sessions`, `attempts`, `canvas_state`, `content_cache`, `meter_state`, `notifications`,
`mastery_cache`, `outbox`. (Schema detail in `03-supabase.md`.)
