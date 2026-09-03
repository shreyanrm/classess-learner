import { beforeEach, describe, expect, it } from 'bun:test';
import { createFocus, resetFocusIds, SurfaceRegistry } from '@wobo/wobo';
import { buildTurnPacket, setTurnFocus, turnFocus, woboTurnPayload } from './capabilities';

const registry = () => {
  const r = new SurfaceRegistry();
  r.registerSurface({
    id: 'course',
    title: 'The atom',
    description: 'the course player',
    targets: [
      {
        id: 'card-3',
        kind: 'card',
        label: 'the step where 3 was moved across',
        rect: () => ({ x: 0, y: 0, width: 200, height: 40 }),
        text: () => '2x + 3 = 11',
      },
    ],
  });
  return r;
};

const context = () => ({
  page: { route: 'course', state: { topicId: 'm2-1' } },
  curriculum: { nodeName: 'Linear equations', band: 'developing' },
  session: { sessionId: 's1', recentEvents: ['practice.attempt (correct=false)', 'card.viewed'] },
  turn: { recentTurns: [{ role: 'user' as const, text: 'why is this wrong' }] },
  lifetime: {},
  targets: [],
});

beforeEach(() => {
  resetFocusIds();
  setTurnFocus(null);
});

describe('the turn packet', () => {
  it('carries the route, the screen, the mind digest and the recent turns', () => {
    const packet = buildTurnPacket(context(), { registry: registry() });
    expect(packet.v).toBe(1);
    expect(packet.route).toBe('course');
    expect(packet.screen?.surfaces[0]?.targets[0]?.id).toBe('card-3');
    expect(packet.mind).toEqual({
      band: 'developing',
      topic: 'Linear equations',
      mistakes: ['practice.attempt (correct=false)'],
    });
    expect(packet.turns).toEqual([{ role: 'learner', text: 'why is this wrong' }]);
  });

  it('picks up the focus the gesture layer last made', () => {
    const focus = createFocus({
      kind: 'lasso',
      rect: { x: 0, y: 0, width: 10, height: 10 },
      targetIds: ['card-3'],
      text: '2x + 3 = 11',
    });
    setTurnFocus(focus);
    expect(turnFocus()).toBe(focus);
    const packet = buildTurnPacket(context(), { registry: registry() });
    expect(packet.focus?.targetIds).toEqual(['card-3']);
    expect(packet.focus?.numbers).toEqual([2, 3, 11]);
  });

  it('sends no focus when the learner has pointed at nothing', () => {
    expect(buildTurnPacket(context(), { registry: registry() }).focus).toBeUndefined();
  });

  it('stays inside the token budget', () => {
    const packet = buildTurnPacket(context(), { registry: registry(), budget: { maxTokens: 120 } });
    expect(packet.tokens).toBeLessThanOrEqual(120);
  });
});

describe('the wobo.turn payload', () => {
  it('adds the packet without disturbing a single existing context field', () => {
    const assembled = context();
    const payload = woboTurnPayload(assembled, { registry: registry() });
    for (const key of Object.keys(assembled)) {
      expect(payload.context[key as keyof typeof assembled]).toEqual(
        assembled[key as keyof typeof assembled],
      );
    }
    expect(payload.context.packet.v).toBe(1);
  });

  it('does not mutate the context it was given', () => {
    const assembled = context();
    woboTurnPayload(assembled, { registry: registry() });
    expect('packet' in assembled).toBe(false);
  });

  it('survives an empty context — the first turn on a bare screen', () => {
    const payload = woboTurnPayload({}, { registry: new SurfaceRegistry() });
    expect(payload.context.packet.v).toBe(1);
    expect(payload.context.packet.route).toBeUndefined();
  });
});
