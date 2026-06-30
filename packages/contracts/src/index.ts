/**
 * @classess/contracts — the event contract (highest-stakes seam).
 *
 * TS is the source of truth. The Python services consume the mirrored JSON Schema bundle
 * emitted by `bun run codegen`. Immutable from commit 1: additive changes only.
 */

export * from './enums';
export * from './envelope';
export * from './events';
export * from './factory';
export * from './ids';
export * from './payloads';
export * from './primitives';
