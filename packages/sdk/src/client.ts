import { InMemoryKgtopg, type KGtoPG } from '@classess/kgtopg-contract-seed';
import { resolveConfig, type SdkConfig } from './config';
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

/**
 * The assembled SDK — the one surface the app consumes. It wires the identity boundary, the KGtoPG
 * governed-view binding, and the provider seams, each selected mock-vs-live by config. The app never
 * reaches Supabase, the platform, or a model directly; it goes through here.
 */
export interface Sdk {
  config: SdkConfig;
  identity: IdentityProvider;
  kgtopg: KGtoPG;
  llm: LLMProvider;
  content: ContentProvider;
  messaging: MessagingProvider;
  payment: PaymentProvider;
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

  const llm: LLMProvider =
    config.llmMode === 'live' && config.gatewayUrl
      ? new GatewayLLMProvider(config.gatewayUrl)
      : new MockLLMProvider();

  const content: ContentProvider = new SeedContentProvider();
  const messaging: MessagingProvider = new MockMessagingProvider();
  const payment: PaymentProvider = new MockPaymentProvider();

  return { config, identity, kgtopg, llm, content, messaging, payment };
}
