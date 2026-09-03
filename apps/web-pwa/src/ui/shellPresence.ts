/**
 * Whether a screen with the app shell (the rail, the bottom tab bar) is on the page right now.
 *
 * The shell carries the wordmark and the four doors itself, so the older fixed header has nothing
 * left to draw over it. Rather than each header and each screen knowing about the other, the shell
 * announces itself here while mounted and the header reads the answer. A count, not a flag: during
 * a route crossfade two screens overlap for a moment, and the header must stay away until the last
 * shell has gone.
 */

import { useEffect, useSyncExternalStore } from 'react';

let mounted = 0;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Called by the shell: counts itself in while on the page, out when it leaves. */
export function useAnnounceShell(): void {
  useEffect(() => {
    mounted += 1;
    emit();
    return () => {
      mounted -= 1;
      emit();
    };
  }, []);
}

/** True while at least one shell is on the page. */
export function useShellMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => mounted > 0,
    () => false,
  );
}
