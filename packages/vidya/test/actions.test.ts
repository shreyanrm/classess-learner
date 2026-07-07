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

  it('normalizes a mark shorthand into a real annotate', () => {
    // The model sometimes emits {type:'circle'} instead of {type:'annotate',mark:'circle'}.
    const actions = parseActions([{ type: 'circle', targetId: 'eq', level: 'primary' }]);
    expect(actions).toEqual([
      { type: 'annotate', targetId: 'eq', mark: 'circle', level: 'primary' },
    ]);
  });

  it('keeps forget actions and drops ones with an unknown scope', () => {
    const raw = [
      { type: 'forget', scope: 'show' },
      { type: 'forget', scope: 'fact', target: 'exam on Friday' },
      { type: 'forget', scope: 'all' },
      { type: 'forget', scope: 'everything' }, // invalid scope -> dropped
      { type: 'forget' }, // missing scope -> dropped
    ];
    const actions = parseActions(raw);
    expect(actions.map((a) => (a.type === 'forget' ? a.scope : a.type))).toEqual([
      'show',
      'fact',
      'all',
    ]);
  });

  it('returns [] for non-arrays', () => {
    expect(parseActions(null)).toEqual([]);
    expect(parseActions({ type: 'say', text: 'x' })).toEqual([]);
  });

  it('accepts setState and speak, drops malformed ones', () => {
    const raw = [
      { type: 'setState', targetId: 'sim-1', patch: { slider: 0.4, running: true } },
      { type: 'speak', text: 'watch what happens when I slow it down' },
      { type: 'setState', targetId: 'sim-1', patch: 'not-an-object' }, // invalid
      { type: 'setState', patch: {} }, // missing targetId -> invalid
      { type: 'speak' }, // missing text -> invalid
    ];
    const actions = parseActions(raw);
    expect(actions.map((a) => a.type)).toEqual(['setState', 'speak']);
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

  it('folds forget actions into forgets, carrying scope and target — never an offer', () => {
    const actions: VidyaAction[] = [
      { type: 'forget', scope: 'show' },
      { type: 'forget', scope: 'fact', target: 'exam on Friday' },
      { type: 'forget', scope: 'all' },
    ];
    const e = reduceActions(actions);
    expect(e.forgets).toEqual([
      { scope: 'show' },
      { scope: 'fact', target: 'exam on Friday' },
      { scope: 'all' },
    ]);
    expect(e.offer).toBeNull();
    expect(isConsequential(actions[0] as VidyaAction)).toBe(false);
  });

  it('folds speak into speaks and setState into setStates — both immediate, never offered', () => {
    const actions: VidyaAction[] = [
      { type: 'speak', text: 'here, let me show you' },
      { type: 'setState', targetId: 'sim-1', patch: { mass: 2 } },
      { type: 'setState', targetId: 'sim-1', patch: { mass: 10 } },
    ];
    const e = reduceActions(actions);
    expect(e.speaks).toEqual(['here, let me show you']);
    expect(e.setStates).toEqual([
      { targetId: 'sim-1', patch: { mass: 2 } },
      { targetId: 'sim-1', patch: { mass: 10 } },
    ]);
    expect(e.offer).toBeNull();
    expect(e.says).toEqual([]); // speak is the voice-locked channel, not say
    expect(isConsequential(actions[1] as VidyaAction)).toBe(false);
  });

  it('parses redrawMarks and folds it into the redrawMarks flag (family M re-ink)', () => {
    const parsed = parseActions([
      { type: 'redrawMarks' },
      { type: 'say', text: 'it faded — here it is again' },
    ]);
    expect(parsed.map((a) => a.type)).toEqual(['redrawMarks', 'say']);
    const e = reduceActions(parsed);
    expect(e.redrawMarks).toBe(true);
    expect(e.says).toEqual(['it faded — here it is again']);
    // default is false when she draws normally
    expect(reduceActions([{ type: 'say', text: 'x' }]).redrawMarks).toBe(false);
  });
});
