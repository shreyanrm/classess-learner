import { describe, expect, it } from 'bun:test';
import type { ActiveHighlight } from '../src/actions';
import { addMarks, emptyMarks, resolveCanvasSlot } from '../src/context-bus';

const mark = (id: string) => ({ targetId: id, level: 'primary' }) as unknown as ActiveHighlight;

describe('the redrawable mark set is scoped to one turn', () => {
  it('accumulates across the beats of a turn', () => {
    let marks = emptyMarks();
    marks = addMarks(marks, { ...emptyMarks(), highlights: [mark('step-1')] });
    marks = addMarks(marks, { ...emptyMarks(), highlights: [mark('step-2')] });
    expect(marks.highlights.map((h) => h.targetId)).toEqual(['step-1', 'step-2']);
  });

  it('starts empty again at a turn boundary, so "draw it again" is this turn, not the session', () => {
    const previous = addMarks(emptyMarks(), { ...emptyMarks(), highlights: [mark('old')] });
    expect(previous.highlights.length).toBe(1);
    const fresh = emptyMarks(); // what beginTurn() installs
    expect(fresh).toEqual({ highlights: [], annotations: [], notes: [] });
    expect(addMarks(fresh, { ...emptyMarks(), highlights: [mark('new')] }).highlights).toHaveLength(
      1,
    );
  });
});

describe('the canvas slot is owned by the surface that published it', () => {
  const canvas = (nodeId: string) => ({ nodeId, steps: [] });

  it('publishing takes ownership', () => {
    const slot = resolveCanvasSlot({}, canvas('a'), 'MathScene');
    expect(slot).toEqual({ canvas: canvas('a'), owner: 'MathScene' });
  });

  it('a leaving screen cannot clear the canvas the arriving one already published', () => {
    const arrived = resolveCanvasSlot({ canvas: canvas('a'), owner: 'BalanceScale' }, undefined);
    expect(arrived).toEqual({}); // ownerless clear still clears (unmigrated caller)

    const after = resolveCanvasSlot({ canvas: canvas('b'), owner: 'MathScene' }, undefined, 'Boss');
    expect(after).toEqual({ canvas: canvas('b'), owner: 'MathScene' }); // not Boss's to clear
  });

  it('the owner can clear its own canvas', () => {
    const slot = resolveCanvasSlot(
      { canvas: canvas('b'), owner: 'MathScene' },
      undefined,
      'MathScene',
    );
    expect(slot).toEqual({});
  });
});
