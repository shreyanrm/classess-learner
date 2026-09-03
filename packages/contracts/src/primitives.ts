import { z } from 'zod';

/**
 * Version-proof primitive schemas.
 *
 * We deliberately build on `z.string().regex(...)` / `.refine(...)` rather than format
 * helpers whose surface shifts between Zod majors. The contract is the highest-stakes
 * seam in the system; its validators must not break on a dependency bump.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Any RFC-4122 UUID (we mint v7 for time-ordering; the contract accepts any version). */
export const zUuid = z.string().regex(UUID_RE, 'must be a UUID');

/**
 * ISO-8601 UTC timestamp. Client-truthful, server-stamped on ingest.
 *
 * A `regex`, not a `refine`: `z.toJSONSchema` can only emit what it can see. A refinement is
 * opaque JavaScript, so it crossed into the JSON Schema bundle as a bare `{"type":"string"}` and
 * the Python mirror — which validates against that bundle — accepted `"not a date"` for a field
 * TypeScript rejected. The pattern travels; the closure did not.
 *
 * Shape: `YYYY-MM-DDTHH:MM:SS(.sss)?` with `Z` or a `±HH:MM` offset. Stricter than `Date.parse`
 * (which accepts "2026" and a great deal else), which is the point — this is a timestamp field.
 */
export const ISO_8601_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;

export const zIsoUtc = z.string().regex(ISO_8601_RE, 'must be an ISO-8601 timestamp');

/** A bounded confidence / probability in [0, 1]. */
export const zUnitInterval = z.number().min(0).max(1);

/** Non-negative integer milliseconds. */
export const zLatencyMs = z.number().int().nonnegative();

/** A short, non-empty human label (display names, goals). No PII contracts depend on this. */
export const zLabel = z.string().min(1).max(280);

export type Uuid = z.infer<typeof zUuid>;
export type IsoUtc = z.infer<typeof zIsoUtc>;
