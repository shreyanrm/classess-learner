/**
 * Emit the JSON Schema bundle from the Zod source of truth.
 *
 * Run: `bun run codegen` (from packages/contracts).
 * Writes the same bundle to two places so neither language reads across package dirs:
 *   - packages/contracts/schemas/contracts.bundle.json   (language-neutral artifact)
 *   - services/contracts/src/classess_contracts/_bundle.json  (Python mirror, validated at import)
 *
 * CI re-runs this and fails if the committed bundles drift from the schemas.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { z } from 'zod';
import { EnvelopeBase } from '../src/envelope';
import { EVENT_TYPES, EventPayloads, eventSchema } from '../src/events';

const here = dirname(new URL(import.meta.url).pathname);
const repoRoot = join(here, '..', '..', '..');

const bundle = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  generated_by: '@classess/contracts codegen (do not edit by hand)',
  version: 'v1',
  envelope: z.toJSONSchema(EnvelopeBase),
  event_types: EVENT_TYPES,
  payloads: Object.fromEntries(EVENT_TYPES.map((t) => [t, z.toJSONSchema(EventPayloads[t])])),
  events: Object.fromEntries(EVENT_TYPES.map((t) => [t, z.toJSONSchema(eventSchema(t))])),
};

const json = `${JSON.stringify(bundle, null, 2)}\n`;

const targets = [
  join(here, '..', 'schemas', 'contracts.bundle.json'),
  join(repoRoot, 'services', 'contracts', 'src', 'classess_contracts', '_bundle.json'),
];

for (const target of targets) {
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, json);
  console.log(`wrote ${target}`);
}

console.log(`emitted ${EVENT_TYPES.length} event types`);
