/**
 * The public Ask Wobo door — `POST /v1/ask` on the gateway (services/gateway: ask_public.py).
 *
 * Every pitch page ends with an Ask Wobo block, and a visitor at that box has no account. The
 * gateway keeps an open, grounded, tightly metered route for exactly them: the answer comes from
 * the help centre and the public copy or it is the one honest line, a client gets a handful of
 * questions an hour, and nothing personal reaches a model. This module is the browser's side of
 * that door: one request, no identity attached, and every refusal read for the line Wobo wrote
 * (`message`), which is the only thing the visitor is shown. A status code is never surfaced.
 *
 * `page` is the prototype's page key (`meet`, `how`, `parents`, `students`, `subjects`,
 * `security`); the gateway logs it with the outcome and never the question.
 */

import { GATEWAY_COPY } from '@wobo/sdk';

export type AskPage = 'meet' | 'how' | 'parents' | 'students' | 'subjects' | 'security';

export interface AskReply {
  /** Wobo's line: the grounded answer, the honest line, or the refusal's own words. */
  answer: string;
  /** The help articles the answer was grounded in (slugs). Empty for the honest line. */
  sources: string[];
}

/** The gateway's own words for a reply body, or the sdk's fallback line when there are none. */
export function replyFromBody(body: unknown, ok: boolean): AskReply {
  const data = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const sources = Array.isArray(data.sources)
    ? data.sources.filter((s): s is string => typeof s === 'string')
    : [];
  const line = ok ? data.answer : data.message;
  const answer = typeof line === 'string' && line.trim() ? line : GATEWAY_COPY.trouble;
  return { answer, sources: ok ? sources : [] };
}

/** The whitespace-folded question, or '' when there is nothing to ask. */
export function cleanQuestion(text: string): string {
  return text.split(/\s+/).filter(Boolean).join(' ');
}

/**
 * Ask, from the public site. Never throws: a network that is down gets the same calm line the
 * rest of the app uses when the gateway cannot be reached.
 */
export async function askPublic(
  gatewayUrl: string,
  question: string,
  page: AskPage,
  fetchImpl: typeof fetch = fetch,
): Promise<AskReply> {
  const clean = cleanQuestion(question);
  if (!clean) return { answer: GATEWAY_COPY.trouble, sources: [] };
  try {
    const res = await fetchImpl(`${gatewayUrl.replace(/\/$/, '')}/v1/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question: clean, page }),
    });
    const body: unknown = await res.json().catch(() => null);
    return replyFromBody(body, res.ok);
  } catch {
    return { answer: GATEWAY_COPY.trouble, sources: [] };
  }
}

/** The typewriter's pace — two characters a tick, as the landing page types Wobo's replies. */
export const TYPE_STEP = 2;
export const TYPE_TICK_MS = 14;
