/**
 * @classess/vidya — the signature tutor (docs/02-DESIGN/02-vidya.md) and her connected presence.
 *
 * Her identity is LOCKED and encoded in `identity.ts` (asserted by tests). Her choreography is free
 * (the Vidya-cute license). The context bus + action layer make every page a canvas she is plugged
 * into: she perceives the app's own state (never a screen-share) and can draw on it and act in it.
 */

export * from './actions';
export * from './context-bus';
export * from './highlight-overlay';
export * from './identity';
export * from './VidyaPanel';
export * from './VidyaPresence';
export * from './vidya-layer';
