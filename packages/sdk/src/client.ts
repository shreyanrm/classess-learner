import { InMemoryKgtopg, type KGtoPG } from '@classess/kgtopg-contract-seed';
import { resolveConfig, type SdkConfig } from './config';
import { type EventProvider, InMemoryEventProvider, SupabaseOutboxEventProvider } from './events';
import {
  type AccountProfile,
  DevMockIdentity,
  type IdentityProvider,
  SupabaseAuthIdentity,
} from './identity';
import {
  type ContentProvider,
  GatewayLLMProvider,
  type LLMProvider,
  type MessagingProvider,
  MockLLMProvider,
  MockMessagingProvider,
  MockPaymentProvider,
  type PaymentProvider,
  SeedContentProvider,
} from './providers';
import { LocalStateProvider, type StateProvider, SupabaseStateProvider } from './state';
import { SupabaseRest } from './supabase';

/**
 * The assembled SDK — the one surface the app consumes. It wires the identity boundary, the KGtoPG
 * governed-view binding, and the provider seams, each selected mock-vs-live by config. The app never
 * reaches Supabase, the platform, or a model directly; it goes through here.
 */
export interface Sdk {
  config: SdkConfig;
  identity: IdentityProvider;
  kgtopg: KGtoPG;
  events: EventProvider;
  llm: LLMProvider;
  content: ContentProvider;
  messaging: MessagingProvider;
  payment: PaymentProvider;
  /** Learner state + Vidya threads: localStorage in local mode; Supabase-reconciled in live mode. */
  state: StateProvider;
  /**
   * The optional account layer — Supabase Auth as an ADDITIVE identity+sync layer, present whenever
   * the Supabase env keys are configured (even in dev-mock/local mode). Signing in never becomes a
   * wall: the local subject keeps working; a Google session just adds a real identity and syncs the
   * profile row. Undefined when no Supabase keys are configured (pure local build).
   */
  account?: AccountLayer;
}

/** The additive account surface the app offers from onboarding and You. */
export interface AccountLayer {
  isAuthenticated(): boolean;
  /** The signed-in identity's claims (email/name/avatar), or null when signed out. */
  profile(): AccountProfile | null;
  /** Redirect to Google sign-in; the session completes on return via the URL fragment. */
  signInWithGoogle(redirectTo?: string): Promise<void>;
  /** End the account session (local caches stay — offline-first). */
  signOut(): Promise<void>;
  /** Upsert the learner profile row under auth.uid() (RLS-guarded, best-effort). */
  syncProfile(row: { display_name?: string; grade?: string; board?: string }): Promise<void>;
}

/** Never-uploaded placeholder for pre-sign-in live-mode events (RLS would reject them anyway). */
const NIL_SUBJECT = '00000000-0000-0000-0000-000000000000';

export function createSdk(overrides: Partial<SdkConfig> = {}): Sdk {
  const config = resolveConfig(overrides);

  if (!config.devAuth && (!config.supabaseUrl || !config.supabaseAnonKey)) {
    // Secrets/keys come from env only — live auth without them is a misconfiguration, not a mode.
    throw new Error('DEV_AUTH=false requires SUPABASE_URL and SUPABASE_ANON_KEY from the env.');
  }
  // Supabase Auth exists whenever the (client-safe) keys are configured — additively, even in
  // dev-mock mode. It adopts an OAuth session from the URL fragment on construction, so a Google
  // round-trip completes on the next boot regardless of which mode the app runs in.
  const supabaseAuth =
    config.supabaseUrl && config.supabaseAnonKey
      ? new SupabaseAuthIdentity({
          url: config.supabaseUrl,
          anonKey: config.supabaseAnonKey,
          surface: config.surface,
        })
      : null;
  // In live mode (DEV_AUTH=false) it IS the app's identity; in dev-mock it stays a side account.
  const liveAuth = !config.devAuth ? supabaseAuth : null;
  const identity: IdentityProvider = liveAuth ?? new DevMockIdentity(config);

  // Live mode: auth.uid() IS the canonical subject, and consent stays un_elevated until verifiable
  // parental consent exists (DPDP) — the dev knobs never leak into a real session's attribution.
  const subjectId = liveAuth ? (liveAuth.subjectId ?? NIL_SUBJECT) : config.mockSubjectId;
  const attribution: SdkConfig = liveAuth
    ? { ...config, mockSubjectId: subjectId, consentTierDefault: 'un_elevated' }
    : config;

  // Mock-first: the in-repo reference. The live Supabase-backed client binds at Phase 1.
  const kgtopg = new InMemoryKgtopg({ consentTier: attribution.consentTierDefault });

  // Live persistence needs the project URL + publishable key (env only); anything less stays local,
  // so mock mode keeps working fully keyless. Under live auth it additionally needs a signed-in
  // session — pre-sign-in the device stays on the local cache (the app re-creates the sdk after
  // the sign-in beat completes).
  const rest =
    config.persistMode === 'live' &&
    config.supabaseUrl &&
    config.supabaseAnonKey &&
    (!liveAuth || liveAuth.isAuthenticated())
      ? new SupabaseRest({
          url: config.supabaseUrl,
          anonKey: config.supabaseAnonKey,
          // Live auth reads the token per request so refreshes propagate; dev uses the env JWT.
          accessToken: liveAuth ? () => liveAuth.currentAccessToken() : config.supabaseAccessToken,
        })
      : null;

  // Events go through the real contract; evidence-bearing events update mastery via the consumer
  // (the same reference instance), so attempts flow all the way to bands and ignite on seed data.
  // In live mode they are additionally batch-appended to learner.outbox for the relay.
  const events: EventProvider = rest
    ? new SupabaseOutboxEventProvider(attribution, kgtopg, rest)
    : new InMemoryEventProvider(attribution, kgtopg);

  const state: StateProvider = rest
    ? new SupabaseStateProvider(rest, subjectId)
    : new LocalStateProvider();

  const llm: LLMProvider =
    config.llmMode === 'live' && config.gatewayUrl
      ? new GatewayLLMProvider(config.gatewayUrl)
      : new MockLLMProvider();

  const content: ContentProvider = new SeedContentProvider();
  const messaging: MessagingProvider = new MockMessagingProvider();
  const payment: PaymentProvider = new MockPaymentProvider();

  // The additive account layer: profile sync rides its own REST client keyed to the account token
  // (auth.uid()), independent of persistMode — so a Google session upserts profiles_cache even when
  // the device is otherwise in local mode.
  const accountRest =
    supabaseAuth && config.supabaseUrl && config.supabaseAnonKey
      ? new SupabaseRest({
          url: config.supabaseUrl,
          anonKey: config.supabaseAnonKey,
          accessToken: () => supabaseAuth.currentAccessToken(),
        })
      : null;
  const account: AccountLayer | undefined = supabaseAuth
    ? {
        isAuthenticated: () => supabaseAuth.isAuthenticated(),
        profile: () => supabaseAuth.accountProfile(),
        signInWithGoogle: (redirectTo) => supabaseAuth.auth.signInWithGoogle(redirectTo),
        signOut: () => supabaseAuth.auth.signOut(),
        syncProfile: async (row) => {
          const sub = supabaseAuth.subjectId;
          if (!sub || !accountRest) return;
          try {
            await accountRest.upsert('profiles_cache', { subject_id: sub, ...row }, 'subject_id');
          } catch {
            // best-effort — offline or the row is not yet writable; the local profile still holds
          }
        },
      }
    : undefined;

  return { config, identity, kgtopg, events, llm, content, messaging, payment, state, account };
}
