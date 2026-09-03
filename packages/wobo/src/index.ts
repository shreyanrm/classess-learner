/**
 * @wobo/wobo — the signature tutor (docs/02-DESIGN/02-wobo.md) and Wobo's connected presence.
 *
 * Wobo's identity is LOCKED and encoded in `identity.ts` (asserted by tests). Wobo's choreography is free
 * (the Wobo-cute license). The context bus + action layer make every page a canvas Wobo is plugged
 * into: Wobo perceives the app's own state (never a screen-share) and can draw on it and act in it.
 */

export * from './actions';
// The board — Wobo's hand and its three presentations (docs/BOARD.md).
export * from './board';
export * from './body/WoboBody';
export * from './context-bus';
export * from './focus';
export * from './gesture';
export * from './highlight-overlay';
export * from './identity';
export * from './packet';
export * from './registry';
