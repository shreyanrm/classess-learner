/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_LLM_MODE?: 'mock' | 'live';
  readonly VITE_GATEWAY_URL?: string;
  /** Where this app is served from, for links a learner shares. Brand-neutral by env (plan §8). */
  readonly VITE_PUBLIC_ORIGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
