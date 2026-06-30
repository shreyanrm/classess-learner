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

/** ISO-8601 UTC timestamp. Client-truthful, server-stamped on ingest. */
export const zIsoUtc = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), 'must be an ISO-8601 timestamp');

/** A bounded confidence / probability in [0, 1]. */
export const zUnitInterval = z.number().min(0).max(1);

/** Non-negative integer milliseconds. */
export const zLatencyMs = z.number().int().nonnegative();

/** A short, non-empty human label (display names, goals). No PII contracts depend on this. */
export const zLabel = z.string().min(1).max(280);

export type Uuid = z.infer<typeof zUuid>;
export type IsoUtc = z.infer<typeof zIsoUtc>;
