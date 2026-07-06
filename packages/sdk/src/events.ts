import {
  type ClassessEvent,
  type EventType,
  makeEvent,
  newId,
  type PayloadOf,
} from '@classess/contracts';
import type { EventConsumer } from '@classess/kgtopg-contract-seed';
import type { SdkConfig } from './config';
import type { SupabaseRest } from './supabase';

/**
 * The event backbone. Every meaningful action records one ClassessEvent through the real contract.
 * Mock-first on the TRANSPORT: in local mode events go to an in-memory log and are handed to the
 * KGtoPG consumer (so evidence-bearing events update mastery). In live mode the Supabase outbox
 * writer (below) additionally batches every event into `learner.outbox`, where the relay publishes
 * them UP to platform.events — zero change to callers. `record` stamps the envelope from the
 * session so surfaces just name the event type and payload.
 */
export interface EventProvider {
  record<T extends EventType>(
    eventType: T,
    payload: PayloadOf<T>,
    context?: { ontologyNodeId?: string; courseId?: string },
  ): ClassessEvent<T>;
  getLog(): ClassessEvent[];
  countByType(): Record<string, number>;
}

export class InMemoryEventProvider implements EventProvider {
  private readonly log: ClassessEvent[] = [];
  private readonly sessionId = newId();

  constructor(
    private readonly config: SdkConfig,
    private readonly consumer: EventConsumer,
  ) {}

  record<T extends EventType>(
    eventType: T,
    payload: PayloadOf<T>,
    context?: { ontologyNodeId?: string; courseId?: string },
  ): ClassessEvent<T> {
    const event = makeEvent({
      event_type: eventType,
      payload,
      actor: {
        subject_id: this.config.mockSubjectId,
        surface: this.config.surface,
        session_id: this.sessionId,
      },
      context: {
        app: 'learner',
        env: 'dev',
        consent_tier: this.config.consentTierDefault,
        ...(context?.ontologyNodeId ? { ontology_node_id: context.ontologyNodeId } : {}),
        ...(context?.courseId ? { course_id: context.courseId } : {}),
      },
    });
    // A concrete ClassessEvent<T> is a member of the ClassessEvent union; TS needs the widening cast.
    const stored = event as ClassessEvent;
    this.log.push(stored);
    // The consumer is idempotent; evidence-bearing events update the learner's mastery bands.
    void this.consumer.consume(stored);
    return event;
  }

  getLog(): ClassessEvent[] {
    return this.log;
  }

  countByType(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const event of this.log) {
      counts[event.event_type] = (counts[event.event_type] ?? 0) + 1;
    }
    return counts;
  }
}

/**
 * The live transport: everything InMemoryEventProvider does (log + immediate local mastery), plus
 * batched inserts into `learner.outbox` via `outbox_append_batch` — the transactional-outbox side
 * of the existing relay pattern (relay.ts publishes rows UP; outbox_append dedupes on event_id, so
 * at-least-once retries are no-ops). A failed flush re-queues the batch and retries on the next
 * record/flush; the local log and mastery loop are never blocked by the network.
 * ponytail: the pending queue is in-memory — events recorded fully offline that never see another
 * flush are lost with the tab; move the queue to localStorage if offline sessions must survive.
 */
export class SupabaseOutboxEventProvider extends InMemoryEventProvider {
  private pending: ClassessEvent[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    config: SdkConfig,
    consumer: EventConsumer,
    private readonly rest: Pick<SupabaseRest, 'rpc'>,
    private readonly flushAfterMs = 800,
    private readonly maxBatch = 20,
  ) {
    super(config, consumer);
  }

  override record<T extends EventType>(
    eventType: T,
    payload: PayloadOf<T>,
    context?: { ontologyNodeId?: string; courseId?: string },
  ): ClassessEvent<T> {
    const event = super.record(eventType, payload, context);
    this.pending.push(event as ClassessEvent);
    if (this.pending.length >= this.maxBatch) {
      void this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => void this.flush(), this.flushAfterMs);
    }
    return event;
  }

  /** Push the pending batch to the outbox. Resolves to the number of events accepted. */
  async flush(): Promise<number> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.pending.length === 0) return 0;
    const batch = this.pending;
    this.pending = [];
    try {
      await this.rest.rpc('outbox_append_batch', { p_events: batch });
      return batch.length;
    } catch {
      this.pending = [...batch, ...this.pending]; // keep order; retry on the next record/flush
      return 0;
    }
  }

  /** Events recorded but not yet accepted by the outbox (visible for tests/diagnostics). */
  get pendingCount(): number {
    return this.pending.length;
  }
}
