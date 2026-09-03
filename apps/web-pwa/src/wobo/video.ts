'use client';

/**
 * Ink over a paused video, and the handoff back (docs/BOARD.md §5, WOBO-TASKS §5.5).
 *
 * For the films we make ourselves there is no vision call and no screenshot: the frame at the paused
 * timestamp IS a scene spec, and every drawable part of it carries an id. Paused, those parts are
 * registered as surface targets, so Wobo annotates the exact arrow in the exact frame — the same
 * anchoring law as everywhere else, applied to a moving picture that has stopped moving.
 *
 * The handoff: the learner pauses and asks; Wobo either draws on the frame or opens the plane beside
 * it; when the exchange is over the player returns to the position it was paused at, to the
 * millisecond, so the film is never lost.
 */

import {
  type SurfaceDefinition,
  type SurfaceRegistry,
  type SurfaceTarget,
  surfaceRegistry,
  useSurface,
} from '@wobo/wobo';
import { useMemo } from 'react';

/** The surface a paused film's frame registers under. */
export function frameSurfaceId(sceneId: string): string {
  return `frame:${sceneId}`;
}

/**
 * A part of the frame, named for a person. Ids in a generated scene are machine-ish ("arrow-2"), so
 * the label carries the meaning the brain reasons with — the caption is the frame's own sentence.
 */
export function describeFramePart(
  partId: string,
  caption: string | undefined,
  index: number,
): string {
  const words = partId
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
    .toLowerCase();
  const named = words && !/^\d+$/.test(words) ? words : `part ${index + 1}`;
  return caption ? `${named}, in the frame: ${caption}` : named;
}

/** Only ids we could have authored — never a random generated hash, never a defs entry. */
export function isFramePartId(id: string): boolean {
  if (!id) return false;
  if (/^(clip|mask|grad|filter|def)/i.test(id)) return false;
  return /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(id);
}

export interface FrameSnapshot {
  sceneId: string;
  stepId: string;
  /** The paused position in the whole film. */
  atMs: number;
  caption?: string;
  title?: string;
}

/**
 * The targets a paused frame offers. `parts` are live elements in the rendered scene, read at call
 * time so a rect is never stale.
 */
export function frameTargets(snapshot: FrameSnapshot, parts: readonly Element[]): SurfaceTarget[] {
  const targets: SurfaceTarget[] = parts
    .map((element, index) => {
      const id = element.getAttribute('id') ?? '';
      if (!isFramePartId(id)) return null;
      const target: SurfaceTarget = {
        id: `${snapshot.sceneId}:${snapshot.stepId}:${id}`,
        kind: 'frame-part',
        label: describeFramePart(id, snapshot.caption, index),
        rect: () => element.getBoundingClientRect(),
        element: () => element,
      };
      return target;
    })
    .filter((t): t is SurfaceTarget => t !== null);
  return targets;
}

export function frameSurface(
  snapshot: FrameSnapshot,
  parts: readonly Element[],
  stage: () => Element | null,
): SurfaceDefinition {
  const title = snapshot.title ?? 'a paused film';
  return {
    id: frameSurfaceId(snapshot.sceneId),
    title: `${title}, paused`,
    description: snapshot.caption
      ? `the frame on screen says: ${snapshot.caption}`
      : 'the frame the learner paused on',
    priority: 30,
    targets: [
      {
        id: `${snapshot.sceneId}:frame`,
        kind: 'frame',
        label: snapshot.caption
          ? `the paused frame: ${snapshot.caption}`
          : 'the frame the film is paused on',
        rect: () => stage()?.getBoundingClientRect() ?? null,
        value: () => ({ atMs: Math.round(snapshot.atMs), step: snapshot.stepId }),
      },
      ...frameTargets(snapshot, parts),
    ],
  };
}

/**
 * Register the paused frame for as long as it is paused. Playing again unregisters it: Wobo must not
 * annotate a frame that has moved on.
 */
export function usePausedFrame(
  snapshot: FrameSnapshot | null,
  stageRef: { current: HTMLElement | null },
  registry: SurfaceRegistry = surfaceRegistry,
): void {
  const key = snapshot ? `${snapshot.sceneId}:${snapshot.stepId}:${Math.round(snapshot.atMs)}` : '';
  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` is the whole identity of a frame
  const definition = useMemo<SurfaceDefinition>(() => {
    if (!snapshot) return { id: 'frame:none', title: 'no frame', targets: [] };
    const parts = stageRef.current
      ? Array.from(stageRef.current.querySelectorAll('svg [id]'))
      : ([] as Element[]);
    return frameSurface(snapshot, parts, () => stageRef.current);
  }, [key]);
  useSurface(definition, registry);
}

// --- The handoff -----------------------------------------------------------------------------------

export interface HandoffState {
  /** The film Wobo was asked about, or null when no film is waiting. */
  playerId: string | null;
  atMs: number;
  title?: string;
}

const RESTING: HandoffState = { playerId: null, atMs: 0 };

class VideoHandoff {
  private state: HandoffState = RESTING;
  private resumeFn: ((atMs: number) => void) | null = null;
  private readonly listeners = new Set<() => void>();

  subscribe = (l: () => void): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  get = (): HandoffState => this.state;

  private emit(next: HandoffState): void {
    this.state = next;
    for (const l of this.listeners) l();
  }

  /** A player says: I am paused here, and this is how you put me back. */
  hold(playerId: string, atMs: number, resume: (atMs: number) => void, title?: string): void {
    this.resumeFn = resume;
    this.emit({ playerId, atMs, ...(title ? { title } : {}) });
  }

  /** The player is playing again, or gone. */
  release(playerId: string): void {
    if (this.state.playerId !== playerId) return;
    this.resumeFn = null;
    this.emit(RESTING);
  }

  /** The exchange is over: put the learner back exactly where they were. */
  returnToFrame(): boolean {
    const { playerId, atMs } = this.state;
    if (!playerId || !this.resumeFn) return false;
    this.resumeFn(atMs);
    return true;
  }

  /** True when there is a paused film waiting to be returned to. */
  waiting(): boolean {
    return this.state.playerId !== null;
  }
}

export const videoHandoff = new VideoHandoff();
