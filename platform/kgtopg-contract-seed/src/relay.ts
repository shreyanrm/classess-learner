import type { WoboEvent } from '@wobo/contracts';
import type { EventConsumer } from './interface';

/**
 * The outbox relay — the publisher that carries events UP from the Learner's outbox to the KGtoPG
 * event store. Guarantees: at-least-once, ordered per aggregate, idempotent (the consumer dedupes on
 * event_id). A row is marked published only after the consumer accepts it; a crash in between simply
 * replays on the next run, and the dedupe makes the replay a no-op.
 *
 * The source is an interface so the pure relay is testable with an in-memory outbox; the SDK provides
 * the Supabase-backed source that reads learner.outbox.
 *
 * ponytail — DEFERRED to the KGtoPG platform wave (docs/WOBO-PLAN.md): nothing schedules
 * `runRelayOnce` in production. `learner.outbox` accumulates rows (the client's writes are safe and
 * deduped) but nothing drains them UP into the KGtoPG event store, so platform-side mastery is fed
 * only by the in-process consumer. The missing piece is a supabase-backed OutboxSource plus a runner
 * (an edge function on a schedule, or a worker) — built with the platform, not patched in here.
 */
export interface OutboxRow {
  eventId: string;
  occurredAt: string;
  subjectId: string;
  event: WoboEvent;
}

export interface OutboxSource {
  /** Unpublished rows, ordered per aggregate (by subject, then occurred_at). */
  fetchUnpublished(limit: number): Promise<OutboxRow[]>;
  markPublished(eventId: string): Promise<void>;
  markFailed(eventId: string, error: string): Promise<void>;
}

export interface RelayResult {
  published: number;
  deduped: number;
  failed: number;
}

export async function runRelayOnce(
  source: OutboxSource,
  consumer: EventConsumer,
  limit = 100,
): Promise<RelayResult> {
  const rows = await source.fetchUnpublished(limit);
  let published = 0;
  let deduped = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const result = await consumer.consume(row.event);
      await source.markPublished(row.eventId);
      published += 1;
      if (result.deduped) deduped += 1;
    } catch (err) {
      await source.markFailed(row.eventId, err instanceof Error ? err.message : String(err));
      failed += 1;
    }
  }

  return { published, deduped, failed };
}

/** An in-memory outbox source, for tests and the mock-first walkable path. */
export class InMemoryOutboxSource implements OutboxSource {
  private readonly rows: OutboxRow[] = [];
  private readonly published = new Set<string>();
  readonly failures: { eventId: string; error: string }[] = [];

  append(row: OutboxRow): void {
    this.rows.push(row);
  }

  async fetchUnpublished(limit: number): Promise<OutboxRow[]> {
    return this.rows
      .filter((r) => !this.published.has(r.eventId))
      .sort((a, b) =>
        a.subjectId === b.subjectId
          ? a.occurredAt.localeCompare(b.occurredAt)
          : a.subjectId.localeCompare(b.subjectId),
      )
      .slice(0, limit);
  }

  async markPublished(eventId: string): Promise<void> {
    this.published.add(eventId);
  }

  async markFailed(eventId: string, error: string): Promise<void> {
    this.failures.push({ eventId, error });
  }

  isPublished(eventId: string): boolean {
    return this.published.has(eventId);
  }
}
