import { describe, expect, it } from 'bun:test';
import type { AnnotatableTarget } from '@classess/wobo';
import { SurfaceRegistry } from '@classess/wobo';
import {
  actionsOf,
  surfaceFromBus,
  surfaceIdForRoute,
  surfaceTitleForRoute,
  targetFromBus,
} from './bus-bridge';

const rect = (x = 0, y = 0): DOMRect =>
  ({ x, y, width: 100, height: 40, top: y, left: x, right: x + 100, bottom: y + 40 }) as DOMRect;

const plain = (over: Partial<AnnotatableTarget> = {}): AnnotatableTarget => ({
  id: 'card-3',
  kind: 'card',
  label: 'the step where 3 was moved across',
  getRect: () => rect(),
  ...over,
});

describe('the bridge from the scene bus to the registry', () => {
  it('gives each route its own surface, named for a person', () => {
    expect(surfaceIdForRoute('course')).toBe('screen:course');
    expect(surfaceIdForRoute('')).toBe('screen:app');
    expect(surfaceTitleForRoute('progress')).toBe('the knowledge twin');
    expect(surfaceTitleForRoute('brand-new')).toBe('the brand-new screen');
  });

  it('keeps the rect live rather than copying a box', () => {
    let moved = false;
    const target = targetFromBus(plain({ getRect: () => (moved ? rect(500) : rect(0)) }));
    expect(target.rect()?.x).toBe(0);
    moved = true;
    expect(target.rect()?.x).toBe(500);
  });

  it('never lets a component mid-unmount break the packet', () => {
    const target = targetFromBus(
      plain({
        getRect: () => {
          throw new Error('gone');
        },
        getSceneState: () => {
          throw new Error('gone');
        },
      }),
    );
    expect(target.rect()).toBeNull();
    expect(target.value?.()).toBeUndefined();
  });

  it('publishes scene state as the target value', () => {
    const target = targetFromBus(plain({ getSceneState: () => ({ equation: '2x + 3 = 11' }) }));
    expect(target.value?.()).toEqual({ equation: '2x + 3 = 11' });
  });

  it('offers no action for a target that cannot be driven — she never claims a hand she lacks', () => {
    expect(actionsOf(plain())).toBeUndefined();
    expect(targetFromBus(plain()).actions).toBeUndefined();
  });

  it('offers set_state only where the component accepts a tutor action, and runs it', () => {
    // Held in an object, not a bare `let`: TypeScript narrows a captured `let` to its initializer
    // and the assertion below then compares against `null`, which is not a test of anything.
    const seen: { patch: Record<string, unknown> | null } = { patch: null };
    const target = plain({
      getValidActions: () => ['flip the card'],
      applyTutorAction: (patch) => {
        seen.patch = patch;
      },
    });
    const actions = actionsOf(target);
    expect(actions).toHaveLength(1);
    expect(actions?.[0]?.name).toBe('set_state');
    expect(actions?.[0]?.description).toContain('flip the card');
    actions?.[0]?.run({ flip: true });
    expect(seen.patch).toEqual({ flip: true });
  });

  it('registers the whole screen, and the registry can call through it', async () => {
    let flipped = false;
    const registry = new SurfaceRegistry();
    registry.registerSurface(
      surfaceFromBus('course', [
        plain({
          applyTutorAction: () => {
            flipped = true;
          },
        }),
      ]),
    );
    expect(registry.getTargets().map((t) => t.id)).toEqual(['card-3']);
    await registry.callAction('card-3', 'set_state', { flip: true });
    expect(flipped).toBe(true);
  });

  it('puts every bus target into the snapshot the brain reads', () => {
    const registry = new SurfaceRegistry();
    registry.registerSurface(
      surfaceFromBus('home', [
        plain({ id: 'today-thread', kind: 'journey', label: "today's walk" }),
        plain({ id: 'home-composer', kind: 'composer', label: 'the box where you talk to Wobo' }),
      ]),
    );
    const snapshot = registry.snapshot({ route: 'home' });
    expect(snapshot.route).toBe('home');
    expect(snapshot.surfaces[0]?.targets.map((t) => t.id)).toEqual([
      'today-thread',
      'home-composer',
    ]);
  });
});
