import { afterEach, describe, expect, it } from 'bun:test';
import {
  BudgetExhaustedError,
  configureGatewayAuth,
  fetchMe,
  GatewayLLMProvider,
  gatewayFetch,
  type LLMProvider,
  mintVoiceToken,
  SignInRequiredError,
  voiceSocketUrl,
} from '../src/index';

const realFetch = globalThis.fetch;

interface Seen {
  url: string;
  init?: RequestInit;
}

/** Record every request and answer it with `reply`. */
function capture(reply: (url: string) => Response): Seen[] {
  const seen: Seen[] = [];
  globalThis.fetch = ((url: string | URL | Request, init?: RequestInit) => {
    seen.push({ url: String(url), init });
    return Promise.resolve(reply(String(url)));
  }) as typeof fetch;
  return seen;
}

const headerOf = (seen: Seen, name: string): string | null =>
  new Headers(seen.init?.headers).get(name);

afterEach(() => {
  globalThis.fetch = realFetch;
  configureGatewayAuth({});
});

describe('every gateway call carries an identity', () => {
  it('attaches the learner’s bearer token', async () => {
    configureGatewayAuth({ accessToken: () => 'jwt-abc' });
    const seen = capture(() => Response.json({ ok: true }));
    await gatewayFetch('https://brain.test/v1/capability/wobo.turn', { method: 'POST' });
    expect(headerOf(seen[0] as Seen, 'authorization')).toBe('Bearer jwt-abc');
    expect(headerOf(seen[0] as Seen, 'x-wobo-dev-subject')).toBeNull();
  });

  it('awaits an async token source, so a near-expiry session refreshes first', async () => {
    configureGatewayAuth({ accessToken: async () => 'jwt-refreshed' });
    const seen = capture(() => Response.json({ ok: true }));
    await gatewayFetch('https://brain.test/v1/me');
    expect(headerOf(seen[0] as Seen, 'authorization')).toBe('Bearer jwt-refreshed');
  });

  it('falls back to the dev subject header when the build is keyless', async () => {
    configureGatewayAuth({ devSubject: 'local-subject-1' });
    const seen = capture(() => Response.json({ ok: true }));
    await gatewayFetch('https://brain.test/v1/me');
    expect(headerOf(seen[0] as Seen, 'x-wobo-dev-subject')).toBe('local-subject-1');
    expect(headerOf(seen[0] as Seen, 'authorization')).toBeNull();
  });

  it('never sends the dev header once a real token exists', async () => {
    configureGatewayAuth({ accessToken: () => 'jwt-abc', devSubject: 'local-subject-1' });
    const seen = capture(() => Response.json({ ok: true }));
    await gatewayFetch('https://brain.test/v1/me');
    expect(headerOf(seen[0] as Seen, 'x-wobo-dev-subject')).toBeNull();
  });

  it('keeps the caller’s own headers', async () => {
    configureGatewayAuth({ accessToken: () => 'jwt-abc' });
    const seen = capture(() => Response.json({ ok: true }));
    await gatewayFetch('https://brain.test/v1/voice/tts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });
    expect(headerOf(seen[0] as Seen, 'content-type')).toBe('application/json');
    expect(headerOf(seen[0] as Seen, 'authorization')).toBe('Bearer jwt-abc');
  });
});

describe("the brain’s refusals arrive in Wobo's voice", () => {
  it('401 becomes a sign-in prompt, never a status code', async () => {
    capture(() => Response.json({ code: 'sign_in_required' }, { status: 401 }));
    // Typed as the seam the app holds: it still passes a tier, and it still never ships.
    const llm: LLMProvider = new GatewayLLMProvider('https://brain.test');
    const err = await llm
      .invoke('wobo.turn', { context: {} }, { consentTier: 'un_elevated' })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(SignInRequiredError);
    expect((err as SignInRequiredError).code).toBe('sign_in_required');
    expect((err as Error).message).toMatch(/sign in/i);
    expect((err as Error).message).not.toMatch(/401|gemini|openai|claude|litellm/i);
  });

  it('429 carries what is left and when it refills', async () => {
    capture(
      () =>
        new Response(
          JSON.stringify({ code: 'budget_exhausted', message: 'That is today’s lot.' }),
          {
            status: 429,
            headers: {
              'content-type': 'application/json',
              'x-wobo-budget-remaining': '0',
              'x-wobo-budget-reset': '2026-09-03T00:00:00Z',
            },
          },
        ),
    );
    // Typed as the seam the app holds: it still passes a tier, and it still never ships.
    const llm: LLMProvider = new GatewayLLMProvider('https://brain.test');
    const err = (await llm
      .invoke('wobo.turn', { context: {} }, { consentTier: 'un_elevated' })
      .catch((e: unknown) => e)) as BudgetExhaustedError;
    expect(err).toBeInstanceOf(BudgetExhaustedError);
    expect(err.code).toBe('budget_exhausted');
    expect(err.resetAt).toBe('2026-09-03T00:00:00Z');
    expect(err.remaining).toBe(0);
    expect(err.message).toBe('That is today’s lot.');
  });

  it('unwraps a refusal FastAPI wrapped in `detail`', async () => {
    capture(() =>
      Response.json(
        { detail: { code: 'budget_exhausted', message: 'Enough for today.' } },
        {
          status: 429,
        },
      ),
    );
    const err = await fetchMe('https://brain.test').catch((e: unknown) => e);
    expect((err as Error).message).toBe('Enough for today.');
  });
});

describe('the client declares nothing the brain decides', () => {
  it('posts only the payload — no consent tier, no model, no limit', async () => {
    configureGatewayAuth({ accessToken: () => 'jwt-abc' });
    const seen = capture(() =>
      Response.json({ capability: 'wobo.turn', output: {}, track: 'track_2', cache_hit: false }),
    );
    const llm: LLMProvider = new GatewayLLMProvider('https://brain.test');
    await llm.invoke('wobo.turn', { context: { route: 'home' } }, { consentTier: 'elevated' });
    const body = JSON.parse(String(seen[0]?.init?.body)) as Record<string, unknown>;
    expect(body).toEqual({ payload: { context: { route: 'home' } } });
    expect(body.consent_tier).toBeUndefined();
  });
});

describe('the voice seam', () => {
  it('mints a token over authenticated HTTP and hands it to the socket', async () => {
    configureGatewayAuth({ accessToken: () => 'jwt-abc' });
    const seen = capture(() => Response.json({ mode: 'relay', token: 'tok 1' }));
    const minted = await mintVoiceToken('https://brain.test');
    expect(seen[0]?.url).toBe('https://brain.test/v1/voice/session');
    expect(headerOf(seen[0] as Seen, 'authorization')).toBe('Bearer jwt-abc');
    expect(minted?.token).toBe('tok 1');
    expect(voiceSocketUrl('https://brain.test', '/v1/voice/tts/stream', 'tok 1')).toBe(
      'wss://brain.test/v1/voice/tts/stream?token=tok%201',
    );
  });

  it('degrades silently when the mint is refused — voice is grace, never the help', async () => {
    capture(() => Response.json({ code: 'sign_in_required' }, { status: 401 }));
    expect(await mintVoiceToken('https://brain.test')).toBeNull();
  });
});

describe('what is left of today', () => {
  it('reads the budget the brain reports', async () => {
    configureGatewayAuth({ accessToken: () => 'jwt-abc' });
    capture(() =>
      Response.json({
        subject: 'sub-1',
        anonymous: true,
        plan: 'free',
        consent_tier: 'basic',
        budget: {
          turns: { used: 4, limit: 6, remaining: 2 },
          generations: { used: 1, limit: 1, remaining: 0 },
          reset_at: '2026-09-03T00:00:00Z',
        },
      }),
    );
    const me = await fetchMe('https://brain.test');
    expect(me.anonymous).toBe(true);
    expect(me.plan).toBe('free');
    expect(me.consentTier).toBe('basic');
    expect(me.budget.turns.remaining).toBe(2);
    expect(me.budget.generations.remaining).toBe(0);
    expect(me.budget.resetAt).toBe('2026-09-03T00:00:00Z');
  });

  it('survives a shape it has not seen — a counter is never worth a crash', async () => {
    capture(() => Response.json({ subject: 'sub-1' }));
    const me = await fetchMe('https://brain.test');
    expect(me.plan).toBe('free');
    expect(me.anonymous).toBe(false);
    expect(me.budget.turns.remaining).toBeNull();
  });
});
