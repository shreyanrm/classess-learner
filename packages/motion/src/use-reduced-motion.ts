'use client';

import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';
/**
 * The app's own switch — "Reduce motion" in Settings stamps `data-motion="reduce"` on the document
 * root. It counts exactly like the OS setting, so a learner without a system-wide preference still
 * gets still frames everywhere the library draws.
 */
const ATTR = 'data-motion';

function appReduced(): boolean {
  return (
    typeof document !== 'undefined' && document.documentElement.getAttribute(ATTR) === 'reduce'
  );
}

function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const offs: (() => void)[] = [];
  if (typeof window.matchMedia === 'function') {
    const list = window.matchMedia(QUERY);
    list.addEventListener('change', callback);
    offs.push(() => list.removeEventListener('change', callback));
  }
  if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
    const observer = new MutationObserver(callback);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: [ATTR] });
    offs.push(() => observer.disconnect());
  }
  return () => {
    for (const off of offs) off();
  };
}

function getSnapshot(): boolean {
  if (appReduced()) return true;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * `true` when motion should be reduced: the OS-level `prefers-reduced-motion: reduce` setting, or
 * the app's own "Reduce motion" switch. Built on the native media query and an attribute observer
 * via `useSyncExternalStore`, so it is SSR-safe and re-renders on live changes. Every primitive
 * reads this and swaps to its calm equivalent.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
