'use client';

import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }
  const list = window.matchMedia(QUERY);
  list.addEventListener('change', callback);
  return () => list.removeEventListener('change', callback);
}

function getSnapshot(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * `true` when the OS-level `prefers-reduced-motion: reduce` setting is on. Built on the native media
 * query via `useSyncExternalStore`, so it is SSR-safe and re-renders on live setting changes. Every
 * primitive reads this and swaps to its calm equivalent.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
