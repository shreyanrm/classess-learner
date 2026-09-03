/**
 * Reduce motion — the app's own switch, beside the OS one.
 *
 * "Reduce motion · Still frames instead of animation" on the You screen. Mirrors the theme module:
 * one stored preference, an attribute on the document root (`data-motion="reduce"`) that every
 * stylesheet and both motion libraries read, and a reactive hook for the switch itself. Off means
 * "follow the device", which is what everybody had before the switch existed.
 */
import { useSyncExternalStore } from 'react';

const KEY = 'wobo-motion-v1';
const ATTR = 'data-motion';

export function getMotionPref(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(KEY) === 'reduce';
  } catch {
    return false;
  }
}

function paint(reduce: boolean): void {
  if (typeof document === 'undefined') return;
  if (reduce) document.documentElement.setAttribute(ATTR, 'reduce');
  else document.documentElement.removeAttribute(ATTR);
}

const listeners = new Set<() => void>();

export function setMotionPref(reduce: boolean): void {
  try {
    if (reduce) localStorage.setItem(KEY, 'reduce');
    else localStorage.removeItem(KEY);
  } catch {
    // storage unavailable — the choice still holds for this session
  }
  paint(reduce);
  for (const l of listeners) l();
}

/** Call once at boot: stamp the stored preference before the first screen paints. */
export function initMotion(): void {
  paint(getMotionPref());
}

/** Reactive read of the switch, for the settings row. */
export function useMotionPref(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getMotionPref,
    () => false,
  );
}
