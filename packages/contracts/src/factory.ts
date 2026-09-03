import type { Actor, Context, Trace } from './envelope';
import { type EventType, eventSchema, isEventType, type PayloadOf, type WoboEvent } from './events';
import { newEventId, newId } from './ids';

export interface MakeEventInput<T extends EventType> {
  event_type: T;
  payload: PayloadOf<T>;
  actor: Actor;
  context: Context;
  /** request_id is auto-filled if omitted; causation/correlation are optional. */
  trace?: Partial<Trace>;
  /** Defaults to now (UTC). Pass a client-truthful timestamp when replaying. */
  occurred_at?: string;
  /** Defaults to a fresh uuid v7. Provide only when reconstructing a known event. */
  event_id?: string;
}

/**
 * Stamp and validate a fully typed event. This is the ONLY sanctioned way to mint an event:
 * it fills the time-ordered id, the timestamp, and a request_id, then parses the result
 * through the per-type schema so a malformed payload fails loudly at the source.
 */
export function makeEvent<T extends EventType>(input: MakeEventInput<T>): WoboEvent<T> {
  const candidate = {
    event_id: input.event_id ?? newEventId(),
    event_type: input.event_type,
    occurred_at: input.occurred_at ?? new Date().toISOString(),
    actor: input.actor,
    context: input.context,
    trace: {
      request_id: input.trace?.request_id ?? newId(),
      ...(input.trace?.causation_id ? { causation_id: input.trace.causation_id } : {}),
      ...(input.trace?.correlation_id ? { correlation_id: input.trace.correlation_id } : {}),
    },
    payload: input.payload,
  };
  return eventSchema(input.event_type).parse(candidate) as WoboEvent<T>;
}

/**
 * Parse an untrusted value into a typed event, discriminating on event_type.
 * Throws (Zod error) if the envelope or payload is invalid.
 */
export function validateEvent(value: unknown): WoboEvent {
  // We validate against the concrete per-type schema for precise errors, after a cheap
  // discriminator check, rather than a 36-arm union (clearer messages, same guarantees).
  if (typeof value !== 'object' || value === null || !('event_type' in value)) {
    throw new TypeError('event must be an object with an event_type');
  }
  const type = (value as { event_type: unknown }).event_type;
  if (typeof type !== 'string') throw new TypeError('event_type must be a string');
  if (!isEventType(type)) throw new TypeError(`unknown event_type: ${type}`);
  return eventSchema(type).parse(value) as WoboEvent;
}

/** Non-throwing variant. */
export function safeValidateEvent(
  value: unknown,
): { ok: true; event: WoboEvent } | { ok: false; error: unknown } {
  try {
    return { ok: true, event: validateEvent(value) };
  } catch (error) {
    return { ok: false, error };
  }
}
