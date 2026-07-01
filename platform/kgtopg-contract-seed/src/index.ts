/**
 * @classess/kgtopg-contract-seed — the platform interface this repo holds.
 *
 * KGtoPG is a separate plane (in this project, the platform/pii_vault/operational schemas). This
 * package carries the typed governed-view interface, the DTOs, the event->platform mapping, the atom
 * ontology seed, the outbox relay, and an in-repo reference implementation good enough to build and
 * prove the atom. The app calls these through the SDK; it never reads platform tables directly.
 */

export * from './dto';
export * from './interface';
export * from './event-mapping';
export * from './atom-seed';
export * from './relay';
export { InMemoryKgtopg, type InMemoryKgtopgOptions } from './reference/in-memory';
