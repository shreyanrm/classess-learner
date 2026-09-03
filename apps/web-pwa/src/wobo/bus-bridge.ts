'use client';

/**
 * The bridge from the scene bus to the surface registry (docs/WOBO-PLAN.md §1, §5.1).
 *
 * Every screen and every engine already publishes what is on it to the scene bus — id, kind, label,
 * a live rect, and (for interactives) the scene seams. The registry is the newer, WebMCP-shaped
 * sense the brain reads. Rather than asking thirty files to register twice, this mirrors the bus
 * into the registry as one surface per route: one implementation, one place to be wrong, and every
 * component that already obeys the contract in DESIGN.md §12 is registered the moment it mounts.
 *
 * Screens add their remaining semantic parts (the composer, the chips, the doors, the pickers) with
 * ordinary `useRegisterTarget` calls, and those arrive here too.
 */

import {
  type AnnotatableTarget,
  type SurfaceDefinition,
  type SurfaceRegistry,
  type SurfaceTarget,
  surfaceRegistry,
  type TargetAction,
  useSurface,
  useWoboBus,
} from '@classess/wobo';
import { useEffect, useMemo } from 'react';

/** The registry surface a route's live targets live under. One surface per screen. */
export const ROUTE_SURFACE_PREFIX = 'screen:';

export function surfaceIdForRoute(route: string): string {
  return `${ROUTE_SURFACE_PREFIX}${route || 'app'}`;
}

const ROUTE_TITLES: Record<string, string> = {
  home: 'the home thread',
  chat: 'the conversation',
  learn: 'the subjects',
  practice: 'practice',
  progress: 'the knowledge twin',
  you: 'you',
  subject: 'a subject and its chapters',
  course: 'the course player',
  sandbox: 'the sandbox',
  onboarding: 'setting up',
  building: 'building your frame',
  concept: 'a design concept',
};

export function surfaceTitleForRoute(route: string): string {
  return ROUTE_TITLES[route] ?? (route ? `the ${route} screen` : 'the app');
}

/**
 * The value a target reports into the packet. Scene state is the honest answer when a component
 * publishes it; otherwise there is no value and the label carries the meaning.
 */
function sceneValueOf(target: AnnotatableTarget): (() => unknown) | undefined {
  if (!target.getSceneState) return undefined;
  return () => {
    try {
      return target.getSceneState?.();
    } catch {
      return undefined; // a component mid-unmount must never break the packet
    }
  };
}

/**
 * The actions a bus target offers the brain. `set_state` exists only where the component accepts a
 * tutor action — the demonstrate-by-doing seam. Nothing else is invented here: an action she cannot
 * actually run must never appear in the snapshot she reasons over.
 */
export function actionsOf(target: AnnotatableTarget): TargetAction[] | undefined {
  if (!target.applyTutorAction) return undefined;
  const valid = target.getValidActions?.() ?? [];
  const run: TargetAction = {
    name: 'set_state',
    description:
      valid.length > 0
        ? `drive this: ${valid.join('; ')}`
        : 'drive this component by patching its state',
    inputSchema: { type: 'object' },
    run: (input) => {
      target.applyTutorAction?.(input);
      return { applied: true };
    },
  };
  return [run];
}

/** One bus target, expressed in the registry's grammar. Rects stay live — nothing is copied. */
export function targetFromBus(target: AnnotatableTarget): SurfaceTarget {
  const value = sceneValueOf(target);
  const actions = actionsOf(target);
  return {
    id: target.id,
    kind: target.kind,
    label: target.label,
    ...(target.meaning ? { description: target.meaning } : {}),
    rect: () => {
      try {
        return target.getRect();
      } catch {
        return null;
      }
    },
    ...(value ? { value } : {}),
    ...(actions ? { actions } : {}),
  };
}

/** The whole screen, as the registry sees it. Pure: a list in, a definition out. */
export function surfaceFromBus(
  route: string,
  targets: readonly AnnotatableTarget[],
): SurfaceDefinition {
  return {
    id: surfaceIdForRoute(route),
    title: surfaceTitleForRoute(route),
    description: 'what is on the screen right now',
    priority: 10,
    targets: targets.map(targetFromBus),
  };
}

/**
 * Mount once, inside the bus provider. Every target any screen or engine publishes is registered,
 * and the registry's route is kept in step so the packet says where the learner is.
 */
export function useBusRegistryBridge(route: string, registry: SurfaceRegistry = surfaceRegistry) {
  const bus = useWoboBus();
  const version = bus.targetsVersion;
  // biome-ignore lint/correctness/useExhaustiveDependencies: targetsVersion IS the change signal
  const definition = useMemo(() => surfaceFromBus(route, bus.getTargets()), [route, version]);
  useSurface(definition, registry);
  // The route is set in an effect, never during render: `setRoute` fans a change to every registry
  // subscriber, and a store notified mid-render updates a component while another is rendering.
  useEffect(() => {
    registry.setRoute(route);
  }, [route, registry]);
}
