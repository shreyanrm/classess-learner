/**
 * The landing page's motion engine.
 *
 * Import from here. Underneath: `choreography` is the score (every number the page is cut on and
 * the pure arithmetic over it), `motion` mounts each piece, `scroll` is the substrate the scrubbed
 * pieces share a clock on, `env` answers the three questions everything is gated on, and `hooks` is
 * the one React entry point.
 */

export * from './choreography';
export * from './env';
export * from './hooks';
export * from './motion';
export * from './scroll';
