import { describe, expect, it } from 'bun:test';
import {
  type Actor,
  AttemptResponse,
  type Context,
  EVENT_TYPES,
  EventPayloads,
  isEventType,
  makeEvent,
  safeValidateEvent,
  validateEvent,
} from '../src/index';

const actor: Actor = {
  subject_id: '00000000-0000-7000-8000-000000000001',
  surface: 'pwa',
  session_id: '00000000-0000-7000-8000-0000000000a1',
};

const context: Context = {
  app: 'learner',
  env: 'dev',
  ontology_node_id: '00000000-0000-7000-8000-0000000000b1',
  consent_tier: 'un_elevated',
};

describe('envelope + factory', () => {
  it('stamps a valid, fully typed event', () => {
    const evt = makeEvent({
      event_type: 'learn.attempt.submitted.v1',
      actor,
      context,
      payload: {
        node_id: context.ontology_node_id as string,
        response: { kind: 'expression', latex: '2x+3=7', normalized: 'x=2' },
        correct: true,
        aided: false,
        independence_signal: 1,
        latency_ms: 4200,
        attempt_index: 0,
      },
    });

    expect(evt.event_type).toBe('learn.attempt.submitted.v1');
    expect(evt.event_id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(Number.isNaN(Date.parse(evt.occurred_at))).toBe(false);
    expect(evt.trace.request_id).toMatch(/^[0-9a-f-]{36}$/i);
    // consent_tier travels on every event
    expect(evt.context.consent_tier).toBe('un_elevated');
  });

  it('round-trips through validateEvent', () => {
    const evt = makeEvent({
      event_type: 'mastery.band.changed.v1',
      actor,
      context,
      payload: {
        node_id: context.ontology_node_id as string,
        from_band: 'developing',
        to_band: 'independent',
        scope: 'node',
        ignite: true,
      },
    });
    const parsed = validateEvent(evt);
    expect(parsed.event_type).toBe('mastery.band.changed.v1');
  });

  it('rejects an unknown event_type', () => {
    expect(() => validateEvent({ event_type: 'not.a.real.event.v1', payload: {} })).toThrow();
  });

  it('enforces the Vidya never-hands-the-answer guarantee', () => {
    const bad = {
      event_id: '00000000-0000-7000-8000-0000000000c1',
      event_type: 'vidya.turn.assistant.v1',
      occurred_at: new Date().toISOString(),
      actor,
      context,
      trace: { request_id: '00000000-0000-7000-8000-0000000000d1' },
      payload: {
        turn_id: '00000000-0000-7000-8000-0000000000e1',
        assistance_level: 'hint',
        hint_level: 2,
        grounded: true,
        track: 'track_2',
        handed_answer: true, // contract violation
      },
    };
    const result = safeValidateEvent(bad);
    expect(result.ok).toBe(false);
  });
});

describe('taxonomy registry', () => {
  it('exposes every taxonomy event_type with a payload schema', () => {
    expect(EVENT_TYPES.length).toBeGreaterThanOrEqual(35);
    for (const t of EVENT_TYPES) {
      expect(isEventType(t)).toBe(true);
      expect(EventPayloads[t]).toBeDefined();
    }
  });

  it('includes the spine event types', () => {
    for (const t of [
      'session.started.v1',
      'learn.node.entered.v1',
      'learn.attempt.submitted.v1',
      'evidence.recorded.v1',
      'mastery.band.changed.v1',
      'vidya.perceived.work.v1',
      'meter.peak.detected.v1',
      'safety.flag.raised.v1',
    ] as const) {
      expect(isEventType(t)).toBe(true);
    }
  });
});

describe('AttemptResponse', () => {
  it('discriminates by kind', () => {
    expect(AttemptResponse.parse({ kind: 'numeric', value: 2 }).kind).toBe('numeric');
    expect(AttemptResponse.parse({ kind: 'steps', steps: [{ latex: '2x=4' }] }).kind).toBe('steps');
    expect(() => AttemptResponse.parse({ kind: 'choice', selected: [] })).toThrow();
  });
});
