/**
 * Codegen: the board grammar → the brain's Python mirror.
 *
 * `packages/wobo/src/board/schema.ts` is the single source of truth for what may be drawn. The
 * gateway has to validate the same grammar before it streams a plan, so this emits a JSON Schema
 * mirror plus a small dependency-free validator into
 * `services/gateway/src/wobo_gateway/board_schema.py`.
 *
 *   bun run --cwd packages/wobo board:codegen        # write the mirror
 *   bun run --cwd packages/wobo board:codegen --check # fail if it is stale (CI, and a bun test)
 *
 * No other gateway file is touched: the brain imports this module, it does not absorb it.
 */

import { z } from 'zod';
import {
  BOARD_UNITS,
  BoardEventSchema,
  BoardObjectSchema,
  BoardPatchSchema,
  CONTROL_KINDS,
  INK_ROLES,
  MARK_KINDS,
  PATCH_KINDS,
  PRESENTATIONS,
  SHAPE_KINDS,
} from '../src/board/schema';

// `reused: 'ref'` is load bearing: the anchor union appears in every one of the twenty-eight object
// kinds, and inlining it turns a readable mirror into a megabyte of duplicated JSON.
const json = (schema: z.ZodType): unknown =>
  z.toJSONSchema(schema, {
    target: 'draft-2020-12',
    io: 'input',
    unrepresentable: 'any',
    reused: 'ref',
  });

/**
 * A JSON value as a Python string literal holding its JSON text. The JSON is single-quoted, which
 * is exactly what `ruff format` produces for a string full of double quotes — so the generated file
 * is already formatted and CI never has a diff to complain about.
 */
function literal(value: unknown): string {
  const text = JSON.stringify(value);
  if (text.includes("'") || text.includes('\\')) {
    throw new Error('the grammar grew a quote or an escape — teach `literal` to escape it');
  }
  return `'${text}'`;
}

/** One `json.loads` binding, laid out the way `ruff format` lays it out, so the file is stable. */
function loads(name: string, value: unknown): string {
  return `${name}: dict[str, Any] = json.loads(\n    ${literal(value)}\n)`;
}

/** Python literal for a JSON value — dicts, lists, strings, numbers, booleans and null. */
function py(value: unknown, indent = 0): string {
  const pad = ' '.repeat(indent);
  const inner = ' '.repeat(indent + 4);
  if (value === null || value === undefined) return 'None';
  if (typeof value === 'boolean') return value ? 'True' : 'False';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return value > 0 ? "float('inf')" : "float('-inf')";
    return String(value);
  }
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return `[\n${value.map((v) => `${inner}${py(v, indent + 4)}`).join(',\n')},\n${pad}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) return '{}';
  return `{\n${entries
    .map(([k, v]) => `${inner}${JSON.stringify(k)}: ${py(v, indent + 4)}`)
    .join(',\n')},\n${pad}}`;
}

const VALIDATOR = `

# --- A dependency-free validator over the subset of JSON Schema zod emits -------------------------


def _type_ok(value: Any, expected: str) -> bool:
    if expected == "object":
        return isinstance(value, dict)
    if expected == "array":
        return isinstance(value, list)
    if expected == "string":
        return isinstance(value, str)
    if expected == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if expected == "number":
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    if expected == "boolean":
        return isinstance(value, bool)
    if expected == "null":
        return value is None
    return True


def validate(value: Any, schema: dict[str, Any], path: str = "") -> list[str]:
    """Every way \`value\` fails \`schema\`, as readable paths. Empty list means it is valid."""
    errors: list[str] = []
    here = path or "$"

    if "$ref" in schema:
        ref = schema["$ref"]
        target = _DEFS.get(ref.rsplit("/", 1)[-1])
        if target is not None:
            return validate(value, target, path)

    if "const" in schema and value != schema["const"]:
        errors.append(f"{here}: expected {schema['const']!r}")
    if "enum" in schema and value not in schema["enum"]:
        errors.append(f"{here}: not one of {schema['enum']!r}")

    expected = schema.get("type")
    if isinstance(expected, str) and not _type_ok(value, expected):
        errors.append(f"{here}: expected {expected}")
        return errors
    if isinstance(expected, list) and not any(_type_ok(value, t) for t in expected):
        errors.append(f"{here}: expected one of {expected}")
        return errors

    for key in ("anyOf", "oneOf"):
        if key in schema:
            branches = [validate(value, branch, path) for branch in schema[key]]
            if all(branch for branch in branches):
                shortest = min(branches, key=len)
                errors.append(f"{here}: matched no variant ({'; '.join(shortest)})")

    if "allOf" in schema:
        for branch in schema["allOf"]:
            errors.extend(validate(value, branch, path))

    if isinstance(value, dict):
        properties = schema.get("properties", {})
        for name in schema.get("required", []):
            if name not in value:
                errors.append(f"{here}.{name}: required")
        for name, child in value.items():
            if name in properties:
                errors.extend(validate(child, properties[name], f"{here}.{name}"))
            elif schema.get("additionalProperties") is False:
                errors.append(f"{here}.{name}: not allowed")

    if isinstance(value, list):
        prefix = schema.get("prefixItems")
        if prefix is not None:
            if len(value) != len(prefix):
                errors.append(f"{here}: expected {len(prefix)} items")
            for i, (child, child_schema) in enumerate(zip(value, prefix)):
                errors.extend(validate(child, child_schema, f"{here}[{i}]"))
        elif isinstance(schema.get("items"), dict):
            for i, child in enumerate(value):
                errors.extend(validate(child, schema["items"], f"{here}[{i}]"))
        if "minItems" in schema and len(value) < schema["minItems"]:
            errors.append(f"{here}: needs at least {schema['minItems']} items")
        if "maxItems" in schema and len(value) > schema["maxItems"]:
            errors.append(f"{here}: at most {schema['maxItems']} items")

    if isinstance(value, str):
        if "minLength" in schema and len(value) < schema["minLength"]:
            errors.append(f"{here}: too short")
        if "maxLength" in schema and len(value) > schema["maxLength"]:
            errors.append(f"{here}: too long")

    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if "minimum" in schema and value < schema["minimum"]:
            errors.append(f"{here}: below {schema['minimum']}")
        if "maximum" in schema and value > schema["maximum"]:
            errors.append(f"{here}: above {schema['maximum']}")
        if "exclusiveMinimum" in schema and value <= schema["exclusiveMinimum"]:
            errors.append(f"{here}: must exceed {schema['exclusiveMinimum']}")

    return errors


def is_valid_object(value: Any) -> bool:
    """True when this is a drawable board object."""
    return not validate(value, BOARD_OBJECT_SCHEMA)


def is_valid_event(value: Any) -> bool:
    """True when this is a well-formed streamed event."""
    return not validate(value, BOARD_EVENT_SCHEMA)


def is_drawable(obj: Any) -> bool:
    """Law: every number on a board is computed by code and verified before it is drawn."""
    if not isinstance(obj, dict):
        return False
    if obj.get("kind") != "number":
        return True
    return obj.get("verified") is True


def parse_board_event(raw: Any) -> dict[str, Any] | None:
    """One streamed frame, or None. A malformed frame is dropped, never fatal."""
    return raw if isinstance(raw, dict) and is_valid_event(raw) else None


def parse_board_plan(raw: Any) -> list[dict[str, Any]]:
    """A whole plan, keeping only the frames that validate."""
    if not isinstance(raw, list):
        return []
    return [event for event in (parse_board_event(item) for item in raw) if event is not None]


def refuse_unverified(plan: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Drop every ink frame carrying a quantity the verifier never passed."""
    kept: list[dict[str, Any]] = []
    for event in plan:
        if event.get("type") == "ink" and not is_drawable(event.get("object")):
            continue
        kept.append(event)
    return kept
`;

/** Build the whole Python module. Deterministic: the same grammar always emits the same bytes. */
export function renderPythonMirror(): string {
  const object = json(BoardObjectSchema) as Record<string, unknown>;
  const patch = json(BoardPatchSchema) as Record<string, unknown>;
  const event = json(BoardEventSchema) as Record<string, unknown>;
  const defs = {
    ...((object.$defs as Record<string, unknown>) ?? {}),
    ...((patch.$defs as Record<string, unknown>) ?? {}),
    ...((event.$defs as Record<string, unknown>) ?? {}),
  };
  const header = [
    '"""The board grammar, mirrored from the hand.',
    '',
    'GENERATED FILE — do not edit. The source of truth is',
    '`packages/wobo/src/board/schema.ts`; regenerate with:',
    '',
    '    bun run --cwd packages/wobo board:codegen',
    '',
    'The brain validates every plan it composes against this mirror, so the grammar can never',
    'drift between the two halves of Wobo (docs/BOARD.md §2-§4).',
    '"""',
    '',
    'from __future__ import annotations',
    '',
    'import json',
    'from typing import Any',
    '',
    `BOARD_UNITS = ${BOARD_UNITS}`,
    `MARK_KINDS = ${py([...MARK_KINDS])}`,
    `SHAPE_KINDS = ${py([...SHAPE_KINDS])}`,
    `CONTROL_KINDS = ${py([...CONTROL_KINDS])}`,
    `PATCH_KINDS = ${py([...PATCH_KINDS])}`,
    `INK_ROLES = ${py([...INK_ROLES])}`,
    `PRESENTATIONS = ${py([...PRESENTATIONS])}`,
    'OBJECT_KINDS = MARK_KINDS + SHAPE_KINDS + CONTROL_KINDS',
    '',
    '# The schemas travel as JSON so the mirror stays small and byte-stable. Read the grammar in',
    '# `packages/wobo/src/board/schema.ts`, never here.',
    loads('_DEFS', defs),
    '',
    loads('BOARD_OBJECT_SCHEMA', object),
    '',
    loads('BOARD_PATCH_SCHEMA', patch),
    '',
    loads('BOARD_EVENT_SCHEMA', event),
    '',
    'BOARD_PLAN_SCHEMA: dict[str, Any] = {',
    '    "type": "array",',
    '    "items": BOARD_EVENT_SCHEMA,',
    '    "maxItems": 600,',
    '}',
  ].join('\n');
  return `${header}${VALIDATOR}`;
}

export const MIRROR_PATH = 'services/gateway/src/wobo_gateway/board_schema.py';

if (import.meta.main) {
  const root = new URL('../../../', import.meta.url).pathname;
  const target = `${root}${MIRROR_PATH}`;
  const next = renderPythonMirror();
  const check = process.argv.includes('--check');
  const current = await Bun.file(target)
    .text()
    .catch(() => null);
  if (check) {
    if (current !== next) {
      console.error(`board_schema.py is stale — run: bun run --cwd packages/wobo board:codegen`);
      process.exit(1);
    }
    console.log('board_schema.py is current');
  } else {
    await Bun.write(target, next);
    console.log(`wrote ${MIRROR_PATH} (${next.length} bytes)`);
  }
}
