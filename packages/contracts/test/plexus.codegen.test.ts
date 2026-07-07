/**
 * CI drift gate for the card-spec TypeScript (SUBJECTS.md §7).
 *
 * The committed `src/generated/plexus.ts` must be byte-identical to a fresh regeneration from
 * the committed `schemas/plexus.schema.json`. If the schema changes without regenerating the
 * types, this fails. Regenerate: `bun run --filter @classess/contracts codegen:plexus`.
 */
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { emitPlexusTypes } from '../codegen/emit-plexus-types';

const here = dirname(new URL(import.meta.url).pathname);
const schemaPath = join(here, '..', 'schemas', 'plexus.schema.json');
const generatedPath = join(here, '..', 'src', 'generated', 'plexus.ts');

describe('plexus card-spec codegen', () => {
  test('generated plexus.ts is committed and current', () => {
    const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
    const committed = readFileSync(generatedPath, 'utf-8');
    expect(emitPlexusTypes(schema)).toBe(committed);
  });

  test('every schema def becomes an exported type', () => {
    const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
    const out = emitPlexusTypes(schema);
    for (const name of Object.keys(schema.$defs)) {
      expect(out).toContain(`export interface ${name} {`);
    }
    // the two hand-authored tail aliases the schema cannot carry
    expect(out).toContain('export type DiagramSpec = string;');
    expect(out).toContain('export type PlexusArtifact =');
  });
});
