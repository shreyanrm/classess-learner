/**
 * CI drift gate for the event-contract bundle.
 *
 * `emit-schemas.ts` says "CI re-runs this and fails if the committed bundles drift" — this is the
 * thing that makes that sentence true. Both committed copies must be byte-identical to a fresh
 * build from the Zod source of truth: the language-neutral artifact AND the Python mirror, which
 * `wobo_contracts` validates every event against at import time. A schema edited without a
 * regeneration leaves TypeScript enforcing one contract and Python enforcing another.
 *
 * Regenerate: `bun run --filter @wobo/contracts codegen`.
 */

import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { z } from 'zod';
import { BUNDLE_TARGETS, buildBundleJson } from '../codegen/emit-schemas';
import { EVENT_TYPES } from '../src/events';
import { ISO_8601_RE, zIsoUtc } from '../src/primitives';

describe('event-contract bundle codegen', () => {
  const fresh = buildBundleJson();

  for (const target of BUNDLE_TARGETS) {
    test(`${basename(target)} is committed and current`, () => {
      expect(readFileSync(target, 'utf-8')).toBe(fresh);
    });
  }

  test('both committed copies are the same bytes', () => {
    const [a, b] = BUNDLE_TARGETS.map((t) => readFileSync(t, 'utf-8'));
    expect(a).toBe(b);
  });

  test('declares the dialect Zod emits and the Python mirror validates with', () => {
    const bundle = JSON.parse(fresh);
    expect(bundle.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
  });

  test('carries every event type, with a payload and an event schema each', () => {
    const bundle = JSON.parse(fresh);
    expect(bundle.event_types).toEqual([...EVENT_TYPES]);
    for (const t of EVENT_TYPES) {
      expect(bundle.payloads[t]).toBeDefined();
      expect(bundle.events[t]).toBeDefined();
    }
  });
});

/**
 * A `.refine()` is opaque JavaScript: `z.toJSONSchema` cannot see inside it, so it crossed the
 * language boundary as a bare `{"type":"string"}` and the Python mirror accepted timestamps that
 * TypeScript rejected. A `regex` travels.
 */
describe('ISO-timestamp validation survives the TS → JSON Schema crossing', () => {
  const valid = [
    '2026-09-03T10:15:00Z',
    '2026-09-03T10:15:00.123Z',
    '2026-09-03T10:15:00+05:30',
    '2026-09-03T10:15:00.123456789-08:00',
  ];
  const invalid = ['not a date', '2026', '2026-09-03', '2026-09-03 10:15:00Z', ''];

  test('the Zod schema accepts real timestamps and rejects the rest', () => {
    for (const v of valid) expect(zIsoUtc.safeParse(v).success).toBe(true);
    for (const v of invalid) expect(zIsoUtc.safeParse(v).success).toBe(false);
  });

  test('the emitted JSON Schema carries the pattern, not a bare string', () => {
    const emitted = z.toJSONSchema(zIsoUtc) as { type?: string; pattern?: string };
    expect(emitted.type).toBe('string');
    expect(emitted.pattern).toBe(ISO_8601_RE.source);
  });

  test('the committed bundle enforces the same rule on the envelope timestamp', () => {
    const bundle = JSON.parse(readFileSync(BUNDLE_TARGETS[0] as string, 'utf-8'));
    const ts = bundle.envelope.properties.occurred_at as { pattern?: string };
    expect(ts.pattern).toBe(ISO_8601_RE.source);
    // and the pattern the OTHER language will compile agrees with this one
    for (const v of valid) expect(new RegExp(ts.pattern as string).test(v)).toBe(true);
    for (const v of invalid) expect(new RegExp(ts.pattern as string).test(v)).toBe(false);
  });
});
