import {
  type ClassessEvent,
  type EventType,
  makeEvent,
  newId,
  type PayloadOf,
} from '@classess/contracts';
import type { EventConsumer } from '@classess/kgtopg-contract-seed';
import type { SdkConfig } from './config';

/**
 * The event backbone. Every meaningful action records one ClassessEvent through the real contract.
 * Mock-first on the TRANSPORT: today events go to an in-memory log and are handed to the KGtoPG
 * consumer (so evidence-bearing events update mastery); the Supabase outbox writer binds later with
 * zero change to callers. `record` stamps the envelope from the session so surfaces just name the
 * event type and payload.
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
