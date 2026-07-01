/**
 * @classess/sdk — the typed client the app consumes. Wires the identity boundary (dev-mock user in
 * dev, real auth at Phase 4), the KGtoPG governed-view binding, and the provider seams (LLM, content,
 * messaging, payment), each mock-vs-live by config. The app never touches Supabase, the platform, or a
 * model directly.
 */

export * from './config';
export * from './identity';
export * from './providers';
export * from './client';

// Convenience re-exports so the app has a single import surface for the governed-view types.
export type {
  ConsentTierView,
  KGtoPG,
  MasteryBandView,
  OntologyNode,
  TwinAnswer,
} from '@classess/kgtopg-contract-seed';
