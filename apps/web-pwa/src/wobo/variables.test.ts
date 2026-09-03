import { describe, expect, it } from 'bun:test';
import { type BoardEvent, BoardStore, parseBoardPlan } from '@wobo/wobo';
import { goldenBoard } from './goldens';
import { tangentParabolaBrain } from './goldens/brains';
import { changeVariable, controlFor, dependantsOf } from './variables';

/** The golden as the bench plays it: every object landed, nothing refused. */
function tangentBoard(): BoardStore {
  const store = new BoardStore({ presentation: 'full' });
  const board = goldenBoard('tangent-parabola');
  if (!board) throw new Error('the tangent golden is missing');
  store.beginUtterance();
  for (const event of board.plan) {
    // Land it all at once: this file is about what a control DOES, not about the pen's pace.
    store.applyEvent(
      event.type === 'ink'
        ? ({
            ...event,
            object: { ...(event.object as object), t: { start: 0, dur: 1 } },
          } as BoardEvent)
        : event,
    );
  }
  return store;
}

const objectById = (store: BoardStore, id: string) =>
  store.snapshot().find((s) => s.object.id === id)?.object as Record<string, unknown> | undefined;

describe('the board that answers back', () => {
  it('the tangent golden offers a control, and names what hangs off it', () => {
    const store = tangentBoard();
    const control = controlFor(store, 'a');
    expect(control?.kind).toBe('slider');
    expect(control?.id).toBe('x-handle');
    // `depends` is the question: these are the objects a move of the handle asks about.
    expect(dependantsOf(store, 'a').map((o) => o.id)).toEqual([
      'touch-point',
      'slope-value',
      'point-value',
      'tangent-line',
      'tangent-label',
      'point-arrow',
    ]);
  });

  it('moving the handle moves the tangent and changes the numbers under it', async () => {
    const store = tangentBoard();
    const before = {
      slope: objectById(store, 'slope-value')?.value,
      height: objectById(store, 'point-value')?.value,
      line: JSON.stringify(objectById(store, 'tangent-line')?.points),
      point: JSON.stringify(objectById(store, 'touch-point')?.anchor),
    };
    expect(before.slope).toBe(3); // f'(1.5)
    expect(before.height).toBe(2.25); // f(1.5)

    const redrawn = await changeVariable(
      store,
      { variable: 'a', value: 2.5 },
      tangentParabolaBrain,
    );

    // Everything that declared it depends on `a` came back, and nothing else did.
    expect(redrawn).toEqual([
      'touch-point',
      'slope-value',
      'point-value',
      'tangent-line',
      'tangent-label',
      'point-arrow',
    ]);
    // The numbers are the derivative and the function at the new point, not an interpolation.
    expect(objectById(store, 'slope-value')?.value).toBe(5);
    expect(objectById(store, 'point-value')?.value).toBe(6.25);
    // …and the line itself moved. This is the half that used to be dead: `depends` was written by
    // the gateway and read by nothing, so the numbers and the tangent stayed where they were drawn.
    expect(JSON.stringify(objectById(store, 'tangent-line')?.points)).not.toBe(before.line);
    expect(JSON.stringify(objectById(store, 'touch-point')?.anchor)).not.toBe(before.point);
    // Nothing was refused: every number the brain sent named its check and came in verified.
    expect(store.refused).toEqual([]);
  });

  it('the handle follows the finger even before the brain answers', async () => {
    const store = tangentBoard();
    let asked = false;
    await changeVariable(store, { variable: 'a', value: 2.1 }, () => {
      // The control's own value is the learner's, not the verifier's — it is already written by the
      // time the brain is asked, because a slider that waits for a round trip feels broken.
      asked = true;
      expect(objectById(store, 'x-handle')?.value).toBe(2.1);
      return [];
    });
    expect(asked).toBe(true);
    expect(objectById(store, 'x-handle')?.value).toBe(2.1);
  });

  it('a brain that cannot be reached leaves the board honest, not invented', async () => {
    const store = tangentBoard();
    const redrawn = await changeVariable(store, { variable: 'a', value: 2.5 }, () => {
      throw new Error('the gateway is not there');
    });
    expect(redrawn).toEqual([]);
    expect(objectById(store, 'slope-value')?.value).toBe(3); // stale, and visibly so
    expect(objectById(store, 'x-handle')?.value).toBe(2.5); // the handle is still the learner's
  });

  it('an unverified number the brain sends never reaches the board', async () => {
    const number = (extra: Record<string, unknown>) => ({
      type: 'ink',
      t: 0,
      object: {
        id: 'slope-value',
        kind: 'number',
        anchor: { board: [790, 180] },
        value: 999,
        label: 'slope =',
        t: { start: 0, dur: 1 },
        ...extra,
      },
    });

    // Said outright to be unverified: the grammar accepts the frame, and the hand refuses to draw it.
    const refusing = tangentBoard();
    await changeVariable(refusing, { variable: 'a', value: 2 }, () => [
      number({ verified: false }) as unknown as BoardEvent,
    ]);
    expect(objectById(refusing, 'slope-value')?.value).toBe(3);
    expect(refusing.refused.map((o) => o.id)).toEqual(['slope-value']);

    // Silent about it: the grammar itself is the gate, and the frame never becomes an object.
    const dropping = tangentBoard();
    await changeVariable(dropping, { variable: 'a', value: 2 }, () =>
      parseBoardPlan([number({})] as BoardEvent[]),
    );
    expect(objectById(dropping, 'slope-value')?.value).toBe(3);
    expect(dropping.refused).toEqual([]);
  });

  it('a variable nothing is bound to changes nothing at all', async () => {
    const store = tangentBoard();
    expect(controlFor(store, 'theta')).toBeUndefined();
    expect(dependantsOf(store, 'theta')).toEqual([]);
    const redrawn = await changeVariable(store, { variable: 'theta', value: 1 }, () => []);
    expect(redrawn).toEqual([]);
  });
});
