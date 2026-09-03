/**
 * Emit the JSON Schema bundle from the Zod source of truth.
 *
 * Run: `bun run codegen` (from packages/contracts).
 * Writes the same bundle to two places so neither language reads across package dirs:
 *   - packages/contracts/schemas/contracts.bundle.json   (language-neutral artifact)
 *   - services/contracts/src/classess_contracts/_bundle.json  (Python mirror, validated at import)
 *
 * The drift gate is `test/contracts.codegen.test.ts`: it rebuilds the bundle here and asserts both
 * committed files are byte-identical to it. Change a schema without regenerating and it fails.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { z } from 'zod';
import { EnvelopeBase } from '../src/envelope';
import { EVENT_TYPES, EventPayloads, eventSchema } from '../src/events';

const here = dirname(new URL(import.meta.url).pathname);
const repoRoot = join(here, '..', '..', '..');

/**
 * The bundle, exactly as it is written to disk (trailing newline included). Exported so the drift
 * test builds it the same way the emitter does — one definition, no second copy to fall behind.
 */
export function buildBundleJson(): string {
  const bundle = {
    // The dialect Zod actually emits — and the one the Python mirror validates with
    // (`Draft202012Validator`). The old draft-07 header described neither side.
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    generated_by: '@classess/contracts codegen (do not edit by hand)',
    version: 'v1',
    envelope: z.toJSONSchema(EnvelopeBase),
    event_types: EVENT_TYPES,
    payloads: Object.fromEntries(EVENT_TYPES.map((t) => [t, z.toJSONSchema(EventPayloads[t])])),
    events: Object.fromEntries(EVENT_TYPES.map((t) => [t, z.toJSONSchema(eventSchema(t))])),
  };
  return `${JSON.stringify(bundle, null, 2)}\n`;
}

/** Both committed copies of the bundle. The test asserts each one matches `buildBundleJson()`. */
export const BUNDLE_TARGETS = [
  join(here, '..', 'schemas', 'contracts.bundle.json'),
  join(repoRoot, 'services', 'contracts', 'src', 'classess_contracts', '_bundle.json'),
];

/** Written only when this file is run as a script, never on import (the test imports it). */
function main(): void {
  const json = buildBundleJson();
  for (const target of BUNDLE_TARGETS) {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, json);
    console.log(`wrote ${target}`);
  }
  console.log(`emitted ${EVENT_TYPES.length} event types`);
}

if (import.meta.main) main();
