import { describe, expect, it } from 'bun:test';
import { isConsequential, parseActions, reduceActions, type VidyaAction } from '../src/actions';

describe('parseActions', () => {
  it('keeps valid actions and drops malformed ones', () => {
    const raw = [
      { type: 'say', text: 'try taking 3 from both sides' },
      { type: 'highlight', targetId: 'step-1', level: 'secondary' },
      { type: 'nope' }, // invalid
      { type: 'annotate', targetId: 'step-1' }, // missing mark -> invalid
    ];
    const actions = parseActions(raw);
    expect(actions.map((a) => a.type)).toEqual(['say', 'highlight']);
  });

  it('returns [] for non-arrays', () => {
    expect(parseActions(null)).toEqual([]);
    expect(parseActions({ type: 'say', text: 'x' })).toEqual([]);
  });
});

describe('isConsequential', () => {
  it('flags navigate / startPractice / switchModality only', () => {
    expect(isConsequential({ type: 'navigate', route: '/practice' })).toBe(true);
    expect(isConsequential({ type: 'startPractice', nodeId: 'n' })).toBe(true);
    expect(isConsequential({ type: 'say', text: 'hello' })).toBe(false);
    expect(isConsequential({ type: 'highlight', targetId: 't' })).toBe(false);
  });
});

describe('reduceActions', () => {
  it('folds a turn into marks, mood, says, and a single offer', () => {
    const actions: VidyaAction[] = [
      { type: 'setMood', mood: 'thinking' },
      { type: 'say', text: 'look at this step' },
      { type: 'highlight', targetId: 'step-1', level: 'primary' },
      { type: 'annotate', targetId: 'step-1', mark: 'circle', level: 'secondary' },
      { type: 'point', targetId: 'step-2' },
      { type: 'startPractice', nodeId: 'atom', reason: 'ready for a check?' },
    ];
    const e = reduceActions(actions);
    expect(e.mood).toBe('thinking');
    expect(e.says).toEqual(['look at this step']);
    // point adds a primary highlight + a lookHere annotation on step-2, plus the explicit ones
    expect(e.highlights).toContainEqual({ targetId: 'step-1', level: 'primary' });
    expect(e.highlights).toContainEqual({ targetId: 'step-2', level: 'primary' });
    expect(e.annotations).toContainEqual({
      targetId: 'step-1',
      mark: 'circle',
      level: 'secondary',
    });
    expect(e.annotations).toContainEqual({
      targetId: 'step-2',
      mark: 'lookHere',
      level: 'primary',
    });
    expect(e.offer?.type).toBe('startPractice');
  });

  it('defaults highlight level to primary (Molten leads)', () => {
    const e = reduceActions([{ type: 'highlight', targetId: 't' }]);
    expect(e.highlights[0]?.level).toBe('primary');
  });
});
