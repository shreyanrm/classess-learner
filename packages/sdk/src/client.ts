import { InMemoryKgtopg, type KGtoPG } from '@classess/kgtopg-contract-seed';
import { resolveConfig, type SdkConfig } from './config';
import { type EventProvider, InMemoryEventProvider, SupabaseOutboxEventProvider } from './events';
import { DevMockIdentity, type IdentityProvider } from './identity';
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
}

export function createSdk(overrides: Partial<SdkConfig> = {}): Sdk {
  const config = resolveConfig(overrides);

  if (!config.devAuth) {
    // The real Supabase identity is built at Phase 4; until then DEV_AUTH must be true.
    throw new Error(
      'DEV_AUTH=false requires the Phase 4 Supabase identity, which is not built yet.',
    );
  }
  const identity = new DevMockIdentity(config);

  // Mock-first: the in-repo reference. The live Supabase-backed client binds at Phase 1.
  const kgtopg = new InMemoryKgtopg({ consentTier: config.consentTierDefault });

  // Live persistence needs the project URL + publishable key (env only); anything less stays local,
  // so mock mode keeps working fully keyless.
  const rest =
    config.persistMode === 'live' && config.supabaseUrl && config.supabaseAnonKey
      ? new SupabaseRest({
          url: config.supabaseUrl,
          anonKey: config.supabaseAnonKey,
          accessToken: config.supabaseAccessToken,
        })
      : null;

  // Events go through the real contract; evidence-bearing events update mastery via the consumer
  // (the same reference instance), so attempts flow all the way to bands and ignite on seed data.
  // In live mode they are additionally batch-appended to learner.outbox for the relay.
  const events: EventProvider = rest
    ? new SupabaseOutboxEventProvider(config, kgtopg, rest)
    : new InMemoryEventProvider(config, kgtopg);

  const state: StateProvider = rest
    ? new SupabaseStateProvider(rest, config.mockSubjectId)
    : new LocalStateProvider();

  const llm: LLMProvider =
    config.llmMode === 'live' && config.gatewayUrl
      ? new GatewayLLMProvider(config.gatewayUrl)
      : new MockLLMProvider();

  const content: ContentProvider = new SeedContentProvider();
  const messaging: MessagingProvider = new MockMessagingProvider();
  const payment: PaymentProvider = new MockPaymentProvider();

  return { config, identity, kgtopg, events, llm, content, messaging, payment, state };
}
