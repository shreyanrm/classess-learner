'use client';

/**
 * Resilience (VIDYA-CAPABILITIES.md family N — the struggler on a 2G connection and a cheap phone).
 * India-reality law: help still lands on bad network and a laggy device. This module is the one
 * place that decides HOW MUCH grace the moment can afford and whether we're reachable at all —
 * grace degrades, help never does.
 *
 * The decision is a pure function of environment signals so it is testable without a browser
 * (test/resilience.test.ts). Everything below it just reads the browser and subscribes.
 */

import { useEffect, useState } from 'react';

export type Fidelity = 'full' | 'low';

/** The three signals that force low-fidelity. Read from the browser by `readSignals()`. */
export interface EnvSignals {
  /** The learner asked the OS for less motion — honor it as a hard preference. */
  reducedMotion: boolean;
  /** Data Saver is on — treat every byte and animation frame as expensive. */
  saveData: boolean;
  /** Network Information effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | undefined. */
  effectiveType?: string;
}

/**
 * The one decision: does this moment get full choreography or the light version?
 * Pure — same inputs, same answer. Low-fi on ANY of: reduced-motion, Data Saver, a 2G-class link.
 */
export function decideFidelity(s: EnvSignals): Fidelity {
  if (s.reducedMotion) return 'low';
  if (s.saveData) return 'low';
  if (s.effectiveType === '2g' || s.effectiveType === 'slow-2g') return 'low';
  return 'full';
}

interface NetworkInformation {
  saveData?: boolean;
  effectiveType?: string;
  addEventListener?: (type: 'change', fn: () => void) => void;
  removeEventListener?: (type: 'change', fn: () => void) => void;
}
function connection(): NetworkInformation | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return (navigator as unknown as { connection?: NetworkInformation }).connection;
}

/** Snapshot the live browser signals. SSR-safe: no window → full fidelity, online. */
export function readSignals(): EnvSignals {
  const reducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const c = connection();
  return { reducedMotion, saveData: c?.saveData === true, effectiveType: c?.effectiveType };
}

/** The current fidelity, read once. For a live-updating value in a component, use `useFidelity`. */
export function currentFidelity(): Fidelity {
  return decideFidelity(readSignals());
}

/** True when the browser knows it is offline. Conservative: unknown → treated as online. */
export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

// --- her plain lines (dead-end rule: she says what still works, never just "error") --------------

/** Mid-turn network stall/failure — one plain line, then we fall back to the lightest thing. */
export const WOBBLY_LINE =
  "network's being a bit wobbly — here's the nimble version, help still lands.";
/** Offline: tell them plainly what still works without a connection. */
export const OFFLINE_LINE =
  "you're offline — your saved lessons, practice, and our whole conversation still work. I'll catch up the moment you're back.";

// --- live hooks ---------------------------------------------------------------------------------

/** Subscribes to online/offline. Returns whether we're currently offline. */
export function useConnectivity(): { offline: boolean } {
  const [offline, setOffline] = useState(isOffline);
  useEffect(() => {
    const sync = () => setOffline(isOffline());
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);
  return { offline };
}

/** Live fidelity — re-decides when reduced-motion or the network link changes. */
export function useFidelity(): Fidelity {
  const [fidelity, setFidelity] = useState(currentFidelity);
  useEffect(() => {
    const sync = () => setFidelity(currentFidelity());
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    mq.addEventListener('change', sync);
    const c = connection();
    c?.addEventListener?.('change', sync);
    return () => {
      mq.removeEventListener('change', sync);
      c?.removeEventListener?.('change', sync);
    };
  }, []);
  return fidelity;
}
