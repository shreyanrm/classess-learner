import { describe, expect, it } from 'bun:test';
import { constellationOrder } from '../src/internal/constellation';

const depthById = (ranks: { id: string; depth: number }[]) =>
  new Map(ranks.map((r) => [r.id, r.depth]));

describe('constellationOrder', () => {
  it('ranks nodes by BFS depth along prerequisite edges', () => {
    const ranks = constellationOrder(
      ['a', 'b', 'c', 'd'],
      [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
        { from: 'a', to: 'd' },
      ],
      ['a'],
    );
    const depth = depthById(ranks);
    expect(depth.get('a')).toBe(0);
    expect(depth.get('b')).toBe(1);
    expect(depth.get('d')).toBe(1);
    expect(depth.get('c')).toBe(2);
  });

  it('emits a strictly non-decreasing depth sequence', () => {
    const ranks = constellationOrder(
      ['a', 'b', 'c', 'd'],
      [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
        { from: 'a', to: 'd' },
      ],
      ['a'],
    );
    expect(ranks.map((r) => r.id)).toEqual(['a', 'b', 'd', 'c']);
    for (let i = 1; i < ranks.length; i++) {
      expect((ranks[i]?.depth ?? 0) >= (ranks[i - 1]?.depth ?? 0)).toBe(true);
    }
  });

  it('marks unreachable nodes as Infinity and sorts them last', () => {
    const ranks = constellationOrder(['a', 'b', 'orphan'], [{ from: 'a', to: 'b' }], ['a']);
    const depth = depthById(ranks);
    expect(depth.get('orphan')).toBe(Number.POSITIVE_INFINITY);
    expect(ranks[ranks.length - 1]?.id).toBe('orphan');
  });

  it('terminates on cycles', () => {
    const ranks = constellationOrder(
      ['a', 'b'],
      [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'a' },
      ],
      ['a'],
    );
    const depth = depthById(ranks);
    expect(depth.get('a')).toBe(0);
    expect(depth.get('b')).toBe(1);
  });

  it('treats multiple sources as depth 0', () => {
    const ranks = constellationOrder(
      ['a', 'b', 'c'],
      [
        { from: 'a', to: 'c' },
        { from: 'b', to: 'c' },
      ],
      ['a', 'b'],
    );
    const depth = depthById(ranks);
    expect(depth.get('a')).toBe(0);
    expect(depth.get('b')).toBe(0);
    expect(depth.get('c')).toBe(1);
  });
});
