/**
 * @classess/wobo — the signature tutor (docs/02-DESIGN/02-wobo.md) and her connected presence.
 *
 * Her identity is LOCKED and encoded in `identity.ts` (asserted by tests). Her choreography is free
 * (the Wobo-cute license). The context bus + action layer make every page a canvas she is plugged
 * into: she perceives the app's own state (never a screen-share) and can draw on it and act in it.
 */

export * from './actions';
// The board — her hand and its three presentations (docs/BOARD.md).
export * from './board';
export * from './body/WoboBody';
export * from './context-bus';
export * from './focus';
export * from './gesture';
export * from './highlight-overlay';
export * from './identity';
export * from './packet';
export * from './registry';
export * from './WoboPanel';
export * from './WoboPresence';
export * from './wobo-layer';
