/**
 * The parent link, as the You screen and onboarding reach it — the gateway's own routes
 * (`services/gateway/src/wobo_gateway/parents.py`), with identity riding `gatewayFetch`.
 *
 * Three doors: read the status (with a line in Wobo's voice the server wrote), send one invite to
 * an email address, end the link. No gateway is a real state and every call says so by answering
 * `null` rather than pretending. A phone number is not something the gateway can invite yet; the
 * screen keeps the older device-only link for it (`PARENT_KEY`), as it always did.
 */

import { gatewayFetch } from '@wobo/sdk';

export type ParentLinkState = 'none' | 'invited' | 'linked' | 'revoked';

export interface ParentLinkStatus {
  status: ParentLinkState;
  /** The address, masked by the server. */
  parent_email?: string | null;
  revoked_by?: string | null;
  /** One line in Wobo's voice, written by the server for exactly this state. */
  line: string;
}

export type InviteOutcome =
  | { ok: true; status: ParentLinkStatus; sent: boolean }
  | { ok: false; message: string };

const STATES = new Set<ParentLinkState>(['none', 'invited', 'linked', 'revoked']);
const SENT_ELSEWHERE = 'I could not send that just now. Try again in a moment.';

/** The status the server answered with, or null when the body is not one. */
export function parseStatus(body: unknown): ParentLinkStatus | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const status = typeof b.status === 'string' ? (b.status as ParentLinkState) : null;
  if (!status || !STATES.has(status) || typeof b.line !== 'string') return null;
  return {
    status,
    parent_email: typeof b.parent_email === 'string' ? b.parent_email : null,
    revoked_by: typeof b.revoked_by === 'string' ? b.revoked_by : null,
    line: b.line,
  };
}

/** The message a refusal carries, in Wobo's voice, or the one line for a refusal with none. */
export function refusalMessage(body: unknown): string {
  if (body && typeof body === 'object') {
    const detail = (body as { detail?: unknown }).detail;
    if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
      const m = (detail as { message?: unknown }).message;
      if (typeof m === 'string' && m.trim()) return m;
    }
  }
  return SENT_ELSEWHERE;
}

export function looksLikeEmail(text: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(text.trim());
}

type Fetch = typeof gatewayFetch;

export async function readParentLink(
  gatewayUrl: string | undefined = import.meta.env.VITE_GATEWAY_URL,
  fetcher: Fetch = gatewayFetch,
): Promise<ParentLinkStatus | null> {
  if (!gatewayUrl) return null;
  try {
    const res = await fetcher(`${gatewayUrl}/v1/me/parent-link`);
    if (!res.ok) return null;
    return parseStatus(await res.json());
  } catch {
    return null;
  }
}

export async function inviteParent(
  input: { email: string; learnerName?: string; timezone?: string },
  gatewayUrl: string | undefined = import.meta.env.VITE_GATEWAY_URL,
  fetcher: Fetch = gatewayFetch,
): Promise<InviteOutcome> {
  if (!gatewayUrl) return { ok: false, message: SENT_ELSEWHERE };
  try {
    const res = await fetcher(`${gatewayUrl}/v1/me/parent-invite`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: input.email.trim(),
        ...(input.learnerName ? { learner_name: input.learnerName } : {}),
        ...(input.timezone ? { timezone: input.timezone } : {}),
      }),
    });
    const body: unknown = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, message: refusalMessage(body) };
    const status = parseStatus(body);
    if (!status) return { ok: false, message: SENT_ELSEWHERE };
    const sent = (body as { sent?: unknown }).sent === true;
    return { ok: true, status, sent };
  } catch {
    return { ok: false, message: SENT_ELSEWHERE };
  }
}

export async function endParentLink(
  gatewayUrl: string | undefined = import.meta.env.VITE_GATEWAY_URL,
  fetcher: Fetch = gatewayFetch,
): Promise<ParentLinkStatus | null> {
  if (!gatewayUrl) return null;
  try {
    const res = await fetcher(`${gatewayUrl}/v1/me/parent-link`, { method: 'DELETE' });
    if (!res.ok) return null;
    return parseStatus(await res.json());
  } catch {
    return null;
  }
}

/** The learner's own timezone, by its IANA name, for the Sunday note's clock. */
export function ownTimezone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}
