import type { ConsentTier } from '@classess/contracts';

/**
 * SDK configuration. The app reads its environment and passes values in (dependency injection), so
 * the shared SDK never reads process.env / import.meta.env directly and works in both browser and node.
 * Each seam has a mock-vs-live switch; Phase 0 runs entirely on the mock/seed side.
 */
export interface SdkConfig {
  /** DEV_AUTH: true => the dev-mock user, no login. Flips false at Phase 4. */
  devAuth: boolean;
  /** The dev mock subject's opaque UUID. */
  mockSubjectId: string;
  consentTierDefault: ConsentTier;
  surface: 'expo' | 'pwa';
  displayName?: string;
  /** LLM_MODE: mock => deterministic in-process; live => calls the gateway. */
  llmMode: 'mock' | 'live';
  /** CONTENT_MODE: seed => the verified atom cache; live => generate->verify->cache. */
  contentMode: 'seed' | 'live';
  gatewayUrl?: string;
}

export const DEV_DEFAULTS: SdkConfig = {
  devAuth: true,
  mockSubjectId: '00000000-0000-7000-8000-000000000001',
  consentTierDefault: 'un_elevated',
  surface: 'pwa',
  displayName: 'Aanya',
  llmMode: 'mock',
  contentMode: 'seed',
};

/** Merge partial overrides onto the dev defaults. */
export function resolveConfig(overrides: Partial<SdkConfig> = {}): SdkConfig {
  return { ...DEV_DEFAULTS, ...overrides };
}
