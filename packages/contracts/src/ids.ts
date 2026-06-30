import { uuidv7 } from 'uuidv7';

/**
 * Event IDs are uuid v7 (time-ordered): they sort by creation time, which keeps the
 * append-only event log naturally ordered and makes per-aggregate ordering cheap.
 * `event_id` is also the end-to-end idempotency key.
 */
export function newEventId(): string {
  return uuidv7();
}

/** Generic time-ordered id for sessions, requests, correlation, etc. */
export function newId(): string {
  return uuidv7();
}
