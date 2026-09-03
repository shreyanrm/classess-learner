'use client';

/**
 * Her body, driven by what is actually happening (docs/WOBO-PLAN.md §3, WOBO-TASKS §5.7).
 *
 * The rig can wear twenty expressions; the point is that it wears the true one. Listening comes from
 * the microphone actually being open, drawing from the pen actually being down, thinking from a plan
 * actually streaming, aha from a verified correct answer — never from a timer and never from a
 * canned loop. Idleness is measured from real learner input anywhere in the app, including input she
 * cannot see (typing in a composer, scrolling a lesson), which each surface reports here.
 */

import type { WoboExpression } from '@classess/wobo';
import { useEffect, useSyncExternalStore } from 'react';

// --- Real idleness ----------------------------------------------------------------------------------

class Life {
  private at = Date.now();
  private readonly listeners = new Set<() => void>();

  subscribe = (l: () => void): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  get = (): number => this.at;

  /** The learner did something. Anywhere. */
  note(at: number = Date.now()): void {
    // A burst of pointermoves must not re-render the app forty times a second.
    if (at - this.at < 250) {
      this.at = at;
      return;
    }
    this.at = at;
    for (const l of this.listeners) l();
  }
}

export const life = new Life();

/** When the learner last did anything — pass straight to `WoboBody`'s `idleSince`. */
export function useIdleSince(): number {
  return useSyncExternalStore(life.subscribe, life.get, life.get);
}

/**
 * Mount once at the root: every real interaction with the app counts as life. Passive and capturing,
 * so nothing in the app can swallow it, and nothing here can interfere with what the app does next.
 */
export function useLifeSignals(): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const wake = () => life.note();
    const opts: AddEventListenerOptions = { capture: true, passive: true };
    for (const type of ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const) {
      window.addEventListener(type, wake, opts);
    }
    return () => {
      for (const type of ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const) {
        window.removeEventListener(type, wake, opts);
      }
    };
  }, []);
}

// --- The expression the moment actually calls for -------------------------------------------------

export interface PresenceSignals {
  /** The microphone is open on a hold. */
  listening: boolean;
  /** A plan is streaming, or a turn is in flight. */
  thinking: boolean;
  /** The pen is down: objects are being drawn right now. */
  drawing: boolean;
  /** A verified correct answer just landed — the scarce one. */
  aha: boolean;
  /** She is speaking her line. */
  speaking: boolean;
  /** The learner is in her drawer or on the board with her. */
  engaged: boolean;
  /** A verifier is running: numbers being checked before they are drawn. */
  computing?: boolean;
}

/**
 * One expression, chosen by precedence rather than by whoever set state last. The order is the order
 * a person would read the room in: the rare and the loud first, the ambient last.
 */
export function moodFor(signals: PresenceSignals): WoboExpression {
  if (signals.aha) return 'celebrating';
  if (signals.listening) return 'listening';
  if (signals.drawing) return 'drawing';
  if (signals.computing) return 'computing';
  if (signals.thinking) return 'thinking';
  if (signals.speaking) return 'explaining';
  if (signals.engaged) return 'focused';
  return 'idle';
}

/**
 * Where her eyes go: the thing in focus, if there is one. A rect, so the rig tracks the real region
 * the learner circled rather than a guess at where it might be.
 */
export interface TrackRectLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function gazeTarget(
  focusRect: TrackRectLike | null,
  inkAt: { x: number; y: number } | null,
): TrackRectLike | null {
  if (focusRect && (focusRect.width > 0 || focusRect.height > 0)) return focusRect;
  if (inkAt) return { x: inkAt.x - 8, y: inkAt.y - 8, width: 16, height: 16 };
  return null;
}
