import type { ClassessEvent } from '@classess/contracts';

/**
 * The mapping from a Classess event to a platform.events row. The publisher (relay) uses this to write
 * UP to the KGtoPG event store. The full ClassessEvent is preserved in `payload` (lossless); the
 * indexed columns mirror the platform's schema (canonical_uuid, app, type, purpose, consent_ref).
 */
export interface PlatformEventRow {
  event_id: string;
  canonical_uuid: string;
  app: string;
  type: string;
  purpose: string;
  consent_ref: string | null;
  payload: unknown;
  occurred_at: string;
  schema_version: number;
}

/**
 * Map an event's namespace to a platform consent purpose. Teaching purposes work under both consent
 * tiers; commercial and reporting purposes are gated at the platform by an active consent grant.
 */
export function purposeForEventType(eventType: string): string {
  const namespace = eventType.split('.')[0];
  switch (namespace) {
    case 'identity':
    case 'session':
    case 'onboarding':
    case 'learn':
    case 'practice':
    case 'evidence':
    case 'mastery':
    case 'wobo':
    case 'create':
      return 'learning';
    case 'meter':
    case 'conversion':
      return 'commercial';
    case 'parent':
    case 'twin':
      return 'guardian_reporting';
    case 'safety':
    case 'integrity':
      return 'safety';
    default:
      return 'learning';
  }
}

/** Parse the trailing version tag (`*.v2` -> 2). Defaults to 1. */
export function schemaVersionForType(eventType: string): number {
  const match = eventType.match(/\.v(\d+)$/);
  return match?.[1] ? Number(match[1]) : 1;
}

export function mapEventToPlatform(
  event: ClassessEvent,
  consentRef: string | null = null,
): PlatformEventRow {
  return {
    event_id: event.event_id,
    canonical_uuid: event.actor.subject_id,
    app: event.context.app,
    type: event.event_type,
    purpose: purposeForEventType(event.event_type),
    consent_ref: consentRef,
    payload: event,
    occurred_at: event.occurred_at,
    schema_version: schemaVersionForType(event.event_type),
  };
}
