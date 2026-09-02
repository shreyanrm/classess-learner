import { describe, expect, it } from 'bun:test';
import { type Actor, type Context, makeEvent } from '@classess/contracts';
import {
  mapEventToPlatform,
  purposeForEventType,
  schemaVersionForType,
} from '../src/event-mapping';

const actor: Actor = {
  subject_id: '00000000-0000-7000-8000-000000000001',
  surface: 'pwa',
  session_id: '00000000-0000-7000-8000-0000000000a1',
};
const context: Context = { app: 'learner', env: 'dev', consent_tier: 'un_elevated' };

describe('purpose taxonomy', () => {
  it('maps teaching namespaces to the learning purpose', () => {
    for (const t of [
      'learn.node.entered.v1',
      'practice.item.served.v1',
      'wobo.opened.v1',
      'onboarding.goal.set.v1',
    ]) {
      expect(purposeForEventType(t)).toBe('learning');
    }
  });
  it('maps money to commercial, parent/twin to reporting, safety to safety', () => {
    expect(purposeForEventType('meter.peak.detected.v1')).toBe('commercial');
    expect(purposeForEventType('conversion.completed.v1')).toBe('commercial');
    expect(purposeForEventType('parent.digest.sent.v1')).toBe('guardian_reporting');
    expect(purposeForEventType('twin.query.asked.v1')).toBe('guardian_reporting');
    expect(purposeForEventType('safety.flag.raised.v1')).toBe('safety');
  });
});

describe('schema version', () => {
  it('parses the trailing version tag', () => {
    expect(schemaVersionForType('learn.attempt.submitted.v1')).toBe(1);
    expect(schemaVersionForType('learn.attempt.submitted.v2')).toBe(2);
  });
});

describe('mapEventToPlatform', () => {
  it('maps the envelope onto the platform.events columns, losslessly', () => {
    const event = makeEvent({
      event_type: 'meter.peak.detected.v1',
      actor,
      context,
      payload: { signal: 'liking_peak', day_had_real_win: true, consent_tier_required: 'elevated' },
    });
    const row = mapEventToPlatform(event, 'consent-123');
    expect(row.canonical_uuid).toBe(actor.subject_id);
    expect(row.app).toBe('learner');
    expect(row.type).toBe('meter.peak.detected.v1');
    expect(row.purpose).toBe('commercial');
    expect(row.consent_ref).toBe('consent-123');
    expect(row.schema_version).toBe(1);
    expect(row.payload).toBe(event); // full event preserved
  });
});
