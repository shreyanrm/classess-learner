/**
 * The one door to the brain.
 *
 * Every call the client makes to the gateway — capability posts, the voice-session mint, TTS, the
 * budget read — goes through here so identity is attached in exactly one place and the brain's
 * refusals come back as typed, Wobo-voiced errors instead of raw status codes.
 *
 * Identity is a Supabase JWT in `Authorization: Bearer <jwt>`. When no Supabase keys are
 * configured (mock/dev builds) the request instead carries `X-Wobo-Dev-Subject: <id>`, which the
 * gateway honours only outside production. The client never holds a provider key, a model name,
 * a consent tier, or a limit — it asks, and the brain decides.
 *
 * ponytail: plain fetch, no client — one auth header and two error shapes do not need a library.
 */

/** How the current access token is read. Async so a near-expiry token can refresh first. */
export type BearerSource = () => string | null | Promise<string | null>;

export interface GatewayAuthConfig {
  /** The signed-in (or anonymous) learner's Supabase access token. */
  accessToken?: BearerSource;
  /** Dev/mock seam: no Supabase keys, so the gateway is told which local subject is calling. */
  devSubject?: string;
}

/** Wobo's own words for the two refusals a learner can actually meet. Never a provider, never a price. */
export const GATEWAY_COPY = {
  signIn: 'I need to know it is you before we carry on. Sign in and we pick up exactly here.',
  budget: 'That is everything I can carry today. Come back in a bit and we keep going.',
  /** Same line, with the real moment she is free again. */
  budgetAt: (when: string) =>
    `That is everything I can carry today. I am free again at ${when} — come back then and we keep going.`,
  trouble: 'Give me a moment, then ask me again.',
} as const;

let current: GatewayAuthConfig = {};

/** Bind the identity every gateway call carries. Called once, when the SDK is assembled. */
export function configureGatewayAuth(config: GatewayAuthConfig): void {
  current = config;
}

/** The headers that prove who is asking. Empty when nobody is established yet (the gateway 401s). */
export async function gatewayAuthHeaders(): Promise<Record<string, string>> {
  const source = current.accessToken;
  const token = typeof source === 'function' ? await source() : null;
  if (token) return { authorization: `Bearer ${token}` };
  if (current.devSubject) return { 'x-wobo-dev-subject': current.devSubject };
  return {};
}

/** Sign-in is required (or the session expired). The app routes to her sign-in beat. */
export class SignInRequiredError extends Error {
  readonly code = 'sign_in_required';
  constructor(message: string = GATEWAY_COPY.signIn) {
    super(message);
    this.name = 'SignInRequiredError';
  }
}

/** The free daily meter is spent. Carries when it refills so she can say it out loud. */
export class BudgetExhaustedError extends Error {
  readonly code = 'budget_exhausted';
  /** ISO instant the window resets, when the brain told us. */
  readonly resetAt: string | null;
  readonly remaining: number | null;
  constructor(message: string, resetAt: string | null, remaining: number | null) {
    super(message);
    this.name = 'BudgetExhaustedError';
    this.resetAt = resetAt;
    this.remaining = remaining;
  }
}

/** Anything else the brain refused. The message is already in her voice — never a provider's. */
export class GatewayError extends Error {
  readonly status: number;
  constructor(status: number, message: string = GATEWAY_COPY.trouble) {
    super(message);
    this.name = 'GatewayError';
    this.status = status;
  }
}

/** A body the gateway sends with a refusal: `{ code, message }`, both optional to us. */
async function refusal(res: Response): Promise<{ code?: string; message?: string }> {
  try {
    const body = (await res.json()) as { code?: string; message?: string; detail?: unknown };
    if (body && typeof body === 'object') {
      const detail = body.detail;
      // FastAPI wraps handler-raised bodies in `detail`; unwrap when it carries our shape.
      if (detail && typeof detail === 'object')
        return detail as { code?: string; message?: string };
      return body;
    }
  } catch {
    // no body, or not JSON — the defaults below carry the turn
  }
  return {};
}

/**
 * Turn a refusal into a typed error. Safe to call on any response; it returns for 2xx.
 * The learner never sees a status code, only her line.
 */
export async function throwForGatewayStatus(res: Response): Promise<void> {
  if (res.ok) return;
  const body = await refusal(res);
  if (res.status === 401 || body.code === 'sign_in_required') {
    throw new SignInRequiredError(body.message || GATEWAY_COPY.signIn);
  }
  if (res.status === 429 || body.code === 'budget_exhausted') {
    const resetAt = res.headers.get('x-wobo-budget-reset');
    const remainingRaw = res.headers.get('x-wobo-budget-remaining');
    const remaining = remainingRaw !== null && remainingRaw !== '' ? Number(remainingRaw) : null;
    throw new BudgetExhaustedError(
      body.message || GATEWAY_COPY.budget,
      resetAt,
      remaining !== null && Number.isFinite(remaining) ? remaining : null,
    );
  }
  throw new GatewayError(res.status, body.message || GATEWAY_COPY.trouble);
}

/**
 * fetch, with identity attached. Returns the raw response so silent-degrade callers (voice, TTS)
 * can simply give up; callers that speak to the learner pass it through `throwForGatewayStatus`.
 */
export async function gatewayFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  for (const [k, v] of Object.entries(await gatewayAuthHeaders())) headers.set(k, v);
  return fetch(url, { ...init, headers });
}

/** fetch + identity + typed refusals + JSON. The path most callers want. */
export async function gatewayJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await gatewayFetch(url, init);
  await throwForGatewayStatus(res);
  return (await res.json()) as T;
}

// --- The voice seam ------------------------------------------------------------------------------

export interface VoiceSessionToken {
  mode: string;
  /** Short-lived, single-use, bound to the subject. Both voice sockets consume one. */
  token: string;
}

/**
 * Mint the single-use token both voice websockets require. WebSockets carry no headers we control,
 * so identity is proved here, over authenticated HTTP, and handed to the socket as `?token=`.
 * Returns null whenever voice is simply not available (no gateway, not signed in, no key upstream)
 * — voice degrades silently; it is grace, never the help.
 */
export async function mintVoiceToken(gatewayUrl: string): Promise<VoiceSessionToken | null> {
  try {
    const res = await gatewayFetch(`${gatewayUrl}/v1/voice/session`);
    if (!res.ok) return null;
    const body = (await res.json()) as { mode?: string; token?: string };
    if (!body.token || !body.mode) return null;
    return { mode: body.mode, token: body.token };
  } catch {
    return null;
  }
}

/** Build a voice websocket URL from the gateway's http(s) origin plus a minted token. */
export function voiceSocketUrl(gatewayUrl: string, path: string, token: string): string {
  return `${gatewayUrl.replace(/^http/, 'ws')}${path}?token=${encodeURIComponent(token)}`;
}

// --- Who am I, and what is left today ------------------------------------------------------------

export interface BudgetMeter {
  used: number | null;
  limit: number | null;
  remaining: number | null;
}

/** What `GET /v1/me` tells the client about itself. Never a model, never a price. */
export interface Me {
  subject: string | null;
  /** An anonymous learner (signed in without an account) — a smaller day, no elevated doors. */
  anonymous: boolean;
  plan: string;
  /** Server-derived; the client never declares it. */
  consentTier: string | null;
  budget: {
    turns: BudgetMeter;
    generations: BudgetMeter;
    /** ISO instant the daily window rolls over. */
    resetAt: string | null;
  };
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

function meter(raw: unknown): BudgetMeter {
  const r = (raw ?? {}) as Record<string, unknown>;
  return { used: num(r.used), limit: num(r.limit), remaining: num(r.remaining) };
}

/**
 * Read the learner's own budget. Parsed leniently: the brain owns this shape and may grow it, and
 * a UI counter is never worth a crash.
 */
export function parseMe(raw: unknown): Me {
  const r = (raw ?? {}) as Record<string, unknown>;
  const budget = (r.budget ?? {}) as Record<string, unknown>;
  return {
    subject: text(r.subject) ?? text(r.sub),
    anonymous: r.anonymous === true || r.is_anonymous === true,
    plan: text(r.plan) ?? 'free',
    consentTier: text(r.consent_tier) ?? text(r.consentTier),
    budget: {
      turns: meter(budget.turns),
      generations: meter(budget.generations),
      resetAt: text(budget.reset_at) ?? text(budget.resetAt) ?? text(r.reset_at),
    },
  };
}

/** GET /v1/me — identity, plan, and what is left of today. Throws the same typed refusals. */
export async function fetchMe(gatewayUrl: string): Promise<Me> {
  return parseMe(await gatewayJson<unknown>(`${gatewayUrl}/v1/me`));
}
