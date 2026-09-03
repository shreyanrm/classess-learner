import { beforeEach, describe, expect, it } from 'bun:test';
import {
  buildSnapshot,
  byteLength,
  clampText,
  clampValue,
  fitSnapshot,
  inspectorEnabled,
  pointInRect,
  type Rect,
  type ResolvedSurface,
  rectsIntersect,
  SNAPSHOT_BYTE_BUDGET,
  SurfaceRegistry,
  type SurfaceTarget,
  snapshotBytes,
} from '../src/registry';

const rect = (x: number, y: number, w = 10, h = 10): Rect => ({ x, y, width: w, height: h });

const target = (id: string, over: Partial<SurfaceTarget> = {}): SurfaceTarget => ({
  id,
  kind: 'control',
  label: `the ${id}`,
  rect: () => rect(0, 0),
  ...over,
});

describe('clamping', () => {
  it('collapses whitespace and is idempotent', () => {
    expect(clampText('  a   b \n c ', 40)).toBe('a b c');
    expect(clampText(clampText('  a   b ', 40), 40)).toBe('a b');
  });

  it('cuts deterministically with an ellipsis, never past the budget', () => {
    const out = clampText('abcdefghij', 5);
    expect(out).toBe('abcd…');
    expect(out.length).toBe(5);
    expect(clampText('abcdefghij', 5)).toBe(out);
  });

  it('keeps numbers and booleans whole and clamps everything else', () => {
    expect(clampValue(42)).toBe(42);
    expect(clampValue(false)).toBe(false);
    expect(clampValue(undefined)).toBeUndefined();
    expect(clampValue({ a: 1 })).toBe('{"a":1}');
    expect(String(clampValue('x'.repeat(200))).length).toBe(80);
  });
});

describe('the snapshot serialiser', () => {
  const surfaces: ResolvedSurface[] = [
    {
      id: 'course',
      title: 'The atom',
      description: 'a course card stack',
      priority: 0,
      targets: [
        target('card-1', { text: () => 'protons weigh 1 amu', value: () => 3 }),
        target('card-2', { description: 'the second card' }),
      ],
    },
  ];

  it('reads label, value, text and action names off each target', () => {
    const snap = buildSnapshot(surfaces, 'course');
    expect(snap.route).toBe('course');
    expect(snap.surfaces[0]?.targets[0]).toEqual({
      id: 'card-1',
      kind: 'control',
      label: 'the card-1',
      value: 3,
      text: 'protons weigh 1 amu',
    });
  });

  it('is byte-identical for the same input — the packet never churns', () => {
    expect(JSON.stringify(buildSnapshot(surfaces))).toBe(JSON.stringify(buildSnapshot(surfaces)));
  });

  it('stays quiet when a target throws while being read', () => {
    const snap = buildSnapshot([
      {
        ...(surfaces[0] as ResolvedSurface),
        targets: [
          target('boom', {
            value: () => {
              throw new Error('mid-render');
            },
            text: () => {
              throw new Error('mid-render');
            },
          }),
        ],
      },
    ]);
    expect(snap.surfaces[0]?.targets[0]).toEqual({
      id: 'boom',
      kind: 'control',
      label: 'the boom',
    });
  });

  it('names the action vocabulary without shipping the schemas', () => {
    const snap = buildSnapshot([
      {
        ...(surfaces[0] as ResolvedSurface),
        targets: [
          target('slider', {
            actions: [
              {
                name: 'setValue',
                description: 'move it',
                inputSchema: { type: 'object' },
                run: () => 1,
              },
            ],
          }),
        ],
      },
    ]);
    expect(snap.surfaces[0]?.targets[0]?.actions).toEqual(['setValue']);
  });
});

describe('the truncation ladder', () => {
  const big = (surfaceCount: number, targetCount: number): ResolvedSurface[] =>
    Array.from({ length: surfaceCount }, (_, s) => ({
      id: `surface-${s}`,
      title: `Surface number ${s}`,
      description: 'a long description that exists only to eat the budget'.repeat(2),
      priority: 0,
      targets: Array.from({ length: targetCount }, (_, t) =>
        target(`s${s}-t${t}`, {
          description: 'a target description that also eats the budget',
          text: () => 'some text content on the screen with 42 in it'.repeat(2),
        }),
      ),
    }));

  it('fits the 2 KB screen budget for a genuinely crowded screen', () => {
    const snap = fitSnapshot(buildSnapshot(big(8, 12)));
    expect(snapshotBytes(snap)).toBeLessThanOrEqual(SNAPSHOT_BYTE_BUDGET);
    expect(snap.truncated).toBe(true);
  });

  it('leaves a snapshot that already fits completely untouched', () => {
    const full = buildSnapshot(big(1, 1));
    const fitted = fitSnapshot(full, 10_000);
    expect(fitted).toEqual(full);
    expect(fitted.truncated).toBeUndefined();
  });

  it('drops descriptions before it drops targets', () => {
    const full = buildSnapshot(big(2, 2));
    const budget = snapshotBytes(full) - 40;
    const fitted = fitSnapshot(full, budget);
    expect(fitted.surfaces).toHaveLength(2);
    expect(fitted.surfaces.every((s) => s.description === undefined)).toBe(true);
    expect(fitted.surfaces.flatMap((s) => s.targets)).toHaveLength(4);
  });

  it('keeps ids and labels last — ink anchors to them', () => {
    const fitted = fitSnapshot(buildSnapshot(big(4, 6)), 400);
    for (const surface of fitted.surfaces) {
      for (const t of surface.targets) {
        expect(t.id).toBeTruthy();
        expect(t.label).toBeTruthy();
      }
    }
  });

  it('counts what it dropped, per surface and overall', () => {
    const fitted = fitSnapshot(buildSnapshot(big(6, 6)), 500);
    const dropped = (fitted.more ?? 0) + fitted.surfaces.reduce((n, s) => n + (s.more ?? 0), 0);
    expect(dropped).toBeGreaterThan(0);
  });

  it('terminates on an impossible budget instead of spinning', () => {
    const fitted = fitSnapshot(buildSnapshot(big(3, 3)), 1);
    expect(fitted.surfaces).toHaveLength(1);
    expect(snapshotBytes(fitted)).toBeGreaterThan(0);
  });

  it('is deterministic — the same screen twice is the same bytes', () => {
    const a = fitSnapshot(buildSnapshot(big(5, 5)), 900);
    const b = fitSnapshot(buildSnapshot(big(5, 5)), 900);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('registration', () => {
  let registry: SurfaceRegistry;
  beforeEach(() => {
    registry = new SurfaceRegistry();
  });

  it('registers and unregisters a surface', () => {
    const off = registry.registerSurface({ id: 'home', title: 'Home', targets: [target('a')] });
    expect(registry.getTargets().map((t) => t.id)).toEqual(['a']);
    off();
    expect(registry.getTargets()).toHaveLength(0);
  });

  it('bumps the version on every change, so anchors re-measure', () => {
    const before = registry.getVersion();
    const off = registry.registerSurface({ id: 'home', title: 'Home', targets: [] });
    expect(registry.getVersion()).toBeGreaterThan(before);
    const mid = registry.getVersion();
    off();
    expect(registry.getVersion()).toBeGreaterThan(mid);
  });

  it('notifies subscribers', () => {
    let hits = 0;
    const stop = registry.subscribe(() => {
      hits += 1;
    });
    registry.registerSurface({ id: 'home', title: 'Home', targets: [] });
    expect(hits).toBe(1);
    stop();
    registry.registerSurface({ id: 'other', title: 'Other', targets: [] });
    expect(hits).toBe(1);
  });

  it('a stale unregister never deletes the surface that replaced it', () => {
    const off = registry.registerSurface({ id: 'home', title: 'Home v1', targets: [target('a')] });
    registry.registerSurface({ id: 'home', title: 'Home v2', targets: [target('b')] });
    off();
    expect(registry.getSurfaces()[0]?.title).toBe('Home v2');
    expect(registry.getTargets().map((t) => t.id)).toEqual(['b']);
  });

  it('keeps its place in the ordering across a re-registration', () => {
    registry.registerSurface({ id: 'first', title: 'First', targets: [] });
    registry.registerSurface({ id: 'second', title: 'Second', targets: [] });
    registry.registerSurface({ id: 'first', title: 'First again', targets: [] });
    expect(registry.getSurfaces().map((s) => s.id)).toEqual(['first', 'second']);
  });

  it('sorts by priority, then by registration', () => {
    registry.registerSurface({ id: 'a', title: 'A', targets: [] });
    registry.registerSurface({ id: 'b', title: 'B', targets: [], priority: 5 });
    registry.registerSurface({ id: 'c', title: 'C', targets: [] });
    expect(registry.getSurfaces().map((s) => s.id)).toEqual(['b', 'a', 'c']);
  });

  it('attaches a target to a surface that has not registered yet', () => {
    const off = registry.addTarget('late', target('early'));
    expect(registry.getTarget('early')).toBeDefined();
    registry.registerSurface({ id: 'late', title: 'Late', targets: [target('declared')] });
    expect(registry.getTargets().map((t) => t.id)).toEqual(['declared', 'early']);
    off();
    expect(registry.getTargets().map((t) => t.id)).toEqual(['declared']);
  });

  it('a declared target wins over an attached one with the same id', () => {
    registry.addTarget('home', target('x', { label: 'attached' }));
    registry.registerSurface({
      id: 'home',
      title: 'Home',
      targets: [target('x', { label: 'declared' })],
    });
    expect(registry.getTargets()).toHaveLength(1);
    expect(registry.getTarget('x')?.label).toBe('declared');
  });
});

describe('hit testing', () => {
  it('finds element-less targets by rect containment', () => {
    const registry = new SurfaceRegistry();
    registry.registerSurface({
      id: 'board',
      title: 'Board',
      targets: [
        target('near', { rect: () => rect(0, 0, 100, 100) }),
        target('far', { rect: () => rect(500, 500, 10, 10) }),
      ],
    });
    expect(registry.targetIdsAt(50, 50)).toEqual(['near']);
    expect(registry.targetIdsAt(505, 505)).toEqual(['far']);
    expect(registry.targetIdsAt(300, 300)).toEqual([]);
  });

  it('finds every target intersecting a region — the lasso hit test', () => {
    const registry = new SurfaceRegistry();
    registry.registerSurface({
      id: 'board',
      title: 'Board',
      targets: [
        target('a', { rect: () => rect(0, 0, 50, 50) }),
        target('b', { rect: () => rect(40, 40, 50, 50) }),
        target('c', { rect: () => rect(400, 400, 10, 10) }),
      ],
    });
    expect(registry.targetIdsIn(rect(10, 10, 60, 60))).toEqual(['a', 'b']);
  });

  it('has honest rect predicates', () => {
    expect(pointInRect(5, 5, rect(0, 0, 10, 10))).toBe(true);
    expect(pointInRect(15, 5, rect(0, 0, 10, 10))).toBe(false);
    expect(rectsIntersect(rect(0, 0, 10, 10), rect(5, 5, 10, 10))).toBe(true);
    expect(rectsIntersect(rect(0, 0, 10, 10), rect(20, 20, 10, 10))).toBe(false);
  });
});

describe('actions', () => {
  it('runs a named action on a target', async () => {
    const registry = new SurfaceRegistry();
    let moved = 0;
    registry.registerSurface({
      id: 'sim',
      title: 'Sim',
      targets: [
        target('slider', {
          actions: [
            {
              name: 'setValue',
              description: 'move the slider',
              inputSchema: { type: 'object', properties: { value: { type: 'number' } } },
              run: (input) => {
                moved = Number(input.value);
                return moved;
              },
            },
          ],
        }),
      ],
    });
    await expect(registry.callAction('slider', 'setValue', { value: 7 })).resolves.toBe(7);
    expect(moved).toBe(7);
    await expect(registry.callAction('slider', 'nope')).rejects.toThrow('no action nope');
  });

  it('emits WebMCP-shaped tools, namespaced by target', async () => {
    const registry = new SurfaceRegistry();
    registry.registerSurface({
      id: 'sim',
      title: 'The pendulum',
      targets: [
        target('slider', {
          actions: [
            {
              name: 'setValue',
              description: 'move the slider',
              inputSchema: { type: 'object' },
              run: () => 'done',
            },
          ],
        }),
      ],
    });
    const [tool] = registry.toModelContextTools();
    expect(tool?.name).toBe('slider.setValue');
    expect(tool?.description).toContain('The pendulum');
    expect(tool?.inputSchema).toEqual({ type: 'object' });
    await expect(tool?.execute({})).resolves.toBe('done');
  });
});

describe('the byte ruler', () => {
  it('measures UTF-8, not code units', () => {
    expect(byteLength('abc')).toBe(3);
    expect(byteLength('é')).toBe(2);
  });
});

describe('the live registry snapshot', () => {
  it('carries the route it was told about and honours a budget', () => {
    const registry = new SurfaceRegistry();
    registry.setRoute('course');
    registry.registerSurface({
      id: 'course',
      title: 'The atom',
      description: 'a course player',
      targets: [target('card-1', { text: () => 'protons weigh 1 amu' })],
    });
    expect(registry.snapshot().route).toBe('course');
    expect(registry.snapshot({ route: 'practice' }).route).toBe('practice');
    expect(snapshotBytes(registry.snapshot({ budget: 120 }))).toBeLessThanOrEqual(120);
  });

  it('forgets everything on reset', () => {
    const registry = new SurfaceRegistry();
    registry.setRoute('home');
    registry.registerSurface({ id: 'home', title: 'Home', targets: [target('a')] });
    registry.reset();
    expect(registry.getTargets()).toHaveLength(0);
    expect(registry.getRoute()).toBeUndefined();
  });
});

describe('the dev inspector', () => {
  it('is off unless a developer turns it on', () => {
    const flags = globalThis as { __WOBO_INSPECT__?: boolean };
    const before = flags.__WOBO_INSPECT__;
    flags.__WOBO_INSPECT__ = undefined;
    expect(inspectorEnabled()).toBe(false);
    flags.__WOBO_INSPECT__ = true;
    expect(inspectorEnabled()).toBe(true);
    flags.__WOBO_INSPECT__ = before;
  });
});
