/**
 * Carrying an already-installed device across the code-name rename (WOBO-PLAN §17).
 *
 * Every local key this app has ever written was prefixed `clss-`; they are all `wobo-` now. A
 * learner who opened the app yesterday has their whole world under the old prefix — the archive of
 * everything Wobo said, the mind dossier, progress, streaks, the boards they drew, their face, the
 * theme they picked. A rename that ignored that would present as a wipe.
 *
 * So the first thing that runs on boot, before a single store reads anything, walks local storage
 * once and moves every old key to its new name. It runs once per device and then never touches
 * storage again.
 *
 * This file, and its test, are the one place in the repo where the old prefix is load-bearing
 * rather than a leftover: rewriting it here would turn the migration into a no-op.
 *
 * Renaming rather than copying is deliberate: the old keys leave, so a device is never carrying two
 * divergent copies of the same transcript, and quota is not paid twice.
 */

/** The subset of the Storage API this needs — so a test can hand it a plain fake. */
export interface KeyStore {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const OLD_PREFIX = 'clss-';
const NEW_PREFIX = 'wobo-';

/** Set once the walk has completed, so boot #2 is a single `getItem` and nothing more. */
export const MIGRATION_DONE_KEY = 'wobo-key-rename-v1';

/**
 * The new name of a pre-rename key, or `null` if it was never one of ours.
 *
 * Keys already in Wobo's own namespace collapse rather than stutter — `wobo-archive-v1`, never
 * `wobo-wobo-archive-v1`. Per-learner scoping (`…::<subject>`) and the dynamic tails some stores
 * append (`…-v1:<id>`) ride along untouched, because only the prefix is rewritten.
 */
export function renamedKey(old: string): string | null {
  if (!old.startsWith(OLD_PREFIX)) return null;
  const rest = old.slice(OLD_PREFIX.length);
  return rest.startsWith(NEW_PREFIX) ? rest : NEW_PREFIX + rest;
}

/**
 * Move every pre-rename key forward. Returns how many were moved (0 on a fresh install, and on
 * every boot after the first).
 *
 * A key whose new name is already taken is dropped, not merged: the new name means a post-rename
 * write, which is by definition the more recent truth.
 */
export function migrateLegacyKeys(store: KeyStore | undefined = safeStorage()): number {
  if (!store) return 0;
  try {
    if (store.getItem(MIGRATION_DONE_KEY)) return 0;

    // Snapshot the names first: writing into the store while walking its live index skips entries.
    const pairs: [string, string][] = [];
    for (let i = 0; i < store.length; i += 1) {
      const old = store.key(i);
      const next = old === null ? null : renamedKey(old);
      if (old !== null && next !== null) pairs.push([old, next]);
    }

    let moved = 0;
    for (const [old, next] of pairs) {
      const value = store.getItem(old);
      if (value !== null && store.getItem(next) === null) {
        store.setItem(next, value);
        moved += 1;
      }
      store.removeItem(old);
    }

    store.setItem(MIGRATION_DONE_KEY, new Date().toISOString());
    return moved;
  } catch {
    // Private mode, denied storage, or quota. The learner starts clean rather than crashing on the
    // first frame; nothing downstream depends on this having run.
    return 0;
  }
}

function safeStorage(): KeyStore | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}
