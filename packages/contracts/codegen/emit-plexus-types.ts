/**
 * Emit `src/generated/plexus.ts` from the card-spec JSON Schema.
 *
 * The schema itself is produced by the Pydantic source of truth in the gateway
 * (`uv run python -m classess_gateway.plexus.codegen`, → `schemas/plexus.schema.json`).
 * This script is the second half of the wiring: JSON Schema → TypeScript types.
 *
 * Run: `bun run --filter @classess/contracts codegen:plexus`
 *
 * The output is checked in. `plexus.codegen.test.ts` regenerates from the committed schema and
 * fails on any drift, so the TypeScript can never silently diverge from the Pydantic models.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

type JsonSchema = {
  $ref?: string;
  const?: unknown;
  enum?: unknown[];
  anyOf?: JsonSchema[];
  type?: string | string[];
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  description?: string;
  additionalProperties?: unknown;
};

const refName = (ref: string): string => ref.replace('#/$defs/', '');

/** One property/leaf schema → a TypeScript type expression. */
function tsType(schema: JsonSchema): string {
  if (schema.$ref) return refName(schema.$ref);
  if ('const' in schema && schema.const !== undefined) return JSON.stringify(schema.const);
  if (schema.enum) return schema.enum.map((v) => JSON.stringify(v)).join(' | ');
  if (schema.anyOf) {
    const parts = schema.anyOf.map(tsType);
    return [...new Set(parts)].join(' | ');
  }
  const type = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
  if (type.length > 1) return type.map((t) => tsType({ type: t })).join(' | ');
  const t = type[0];
  if (t === 'array') return `${wrap(tsType(schema.items ?? {}))}[]`;
  if (t === 'object') return '{ [key: string]: unknown }'; // pass-through (dict[str, Any])
  if (t === 'string') return 'string';
  if (t === 'number' || t === 'integer') return 'number';
  if (t === 'boolean') return 'boolean';
  if (t === 'null') return 'null';
  return 'unknown'; // the empty `{}` schema (Any)
}

/** Parenthesise a union before appending `[]` so `(a | b)[]` binds correctly. */
const wrap = (expr: string): string => (expr.includes(' | ') ? `(${expr})` : expr);

function emitInterface(name: string, def: JsonSchema): string {
  const required = new Set(def.required ?? []);
  const lines: string[] = [];
  if (def.description) lines.push(`/** ${def.description} */`);
  lines.push(`export interface ${name} {`);
  for (const [prop, sub] of Object.entries(def.properties ?? {})) {
    const optional = required.has(prop) ? '' : '?';
    const key = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(prop) ? prop : JSON.stringify(prop);
    lines.push(`  ${key}${optional}: ${tsType(sub)};`);
  }
  lines.push('}');
  return lines.join('\n');
}

/** Pure: JSON Schema bundle → the full `plexus.ts` source text. Deterministic. */
export function emitPlexusTypes(schema: { $defs: Record<string, JsonSchema> }): string {
  const header = [
    '/**',
    ' * @classess/contracts — the Plexus card-spec contract (SUBJECTS.md §7).',
    ' *',
    ' * GENERATED — do not edit by hand. Source of truth: the Pydantic models in',
    ' * services/gateway/src/classess_gateway/plexus/specs.py.',
    ' * Regenerate: `uv run python -m classess_gateway.plexus.codegen` then',
    ' * `bun run --filter @classess/contracts codegen:plexus`.',
    ' */',
    '',
  ].join('\n');

  const blocks: string[] = [];
  for (const [name, def] of Object.entries(schema.$defs)) {
    if (def.enum && !def.properties) {
      // a bare enum def (none today, but keep the emitter total)
      blocks.push(`export type ${name} = ${def.enum.map((v) => JSON.stringify(v)).join(' | ')};`);
      continue;
    }
    blocks.push(emitInterface(name, def));
  }

  // Hand-authored tail — shapes the JSON Schema cannot carry: engine.diagram is a bare SVG
  // string (no wrapper object), and the served artifact is one of the four engine outputs.
  const tail = [
    '/** engine.diagram output — a sanitized inline SVG string (no wrapper object). */',
    'export type DiagramSpec = string;',
    '',
    '/** The served artifact of any of the four Plexus engines. */',
    'export type PlexusArtifact = CourseSpec | SimSpec | VideoSpec | DiagramSpec;',
  ].join('\n');

  return `${header}${blocks.join('\n\n')}\n\n${tail}\n`;
}

function main(): void {
  const here = dirname(new URL(import.meta.url).pathname);
  const schemaPath = join(here, '..', 'schemas', 'plexus.schema.json');
  const outPath = join(here, '..', 'src', 'generated', 'plexus.ts');
  const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
  const text = emitPlexusTypes(schema);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, text);
  const count = Object.keys(schema.$defs).length;
  console.log(`wrote ${outPath} (${count} interfaces + 2 aliases)`);
}

if (import.meta.main) main();
