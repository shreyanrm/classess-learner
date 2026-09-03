'use client';

/**
 * The bidirectional loop — moving Wobo's tangent updates the numbers (docs/BOARD.md §2, §8).
 *
 * A control is "a shape bound to a variable; moving it re-evaluates every object that depends on
 * that variable", and §2 is explicit about who does the re-evaluating: "when a bound control
 * changes, dependants are recomputed by **the brain's verifier**, not by the model" — and never by
 * the hand, which has no CAS, no dimensional analysis and no fact base and must not invent numbers.
 *
 * So this file is only the loop, never the maths:
 *
 *   1. the handle follows the finger at once (the control's own value is re-inked locally, because
 *      a slider that waits for a round trip is a slider that feels broken);
 *   2. everything carrying `depends: ["<variable>"]` is gathered — that list is the question;
 *   3. a **brain** answers with ink frames, which land through the same grammar as any other frame,
 *      replacing the objects they name by id, so the tangent moves and the numbers under it change.
 *
 * `BoardBrain` is the seam. In the app it is the gateway (`gatewayBrain`); on the hermetic bench it
 * is the golden's own generator, which is where the twelve boards' numbers are computed anyway. The
 * loop is identical either way, which is the point — it is exercised end to end in mock mode.
 */

import { type BoardEvent, type BoardObject, type BoardStore, parseBoardEvent } from '@wobo/wobo';
import { type BoardContext, streamBoardTurn } from './board-stream';

/** What a bound control can carry (docs/BOARD.md §2: slider, toggle, input, drag). */
export type VariableValue = number | boolean | string | [number, number];

/** One move of one control. */
export interface VariableChange {
  variable: string;
  value: VariableValue;
}

/** What the brain is handed: the change, and everything on the board that declared it depends. */
export interface RecomputeRequest extends VariableChange {
  dependants: readonly BoardObject[];
}

/**
 * The half that recomputes. It answers with the ink frames that redraw the dependants — nothing
 * else; a brain that cannot answer returns an empty list and the board simply keeps what it has.
 */
export type BoardBrain = (request: RecomputeRequest) => BoardEvent[] | Promise<BoardEvent[]>;

const objectsOf = (store: BoardStore): BoardObject[] => store.snapshot().map((s) => s.object);

/** The names a board object declares it depends on. Absent means it depends on nothing. */
function dependsOf(object: BoardObject): readonly string[] {
  const declared = (object as { depends?: unknown }).depends;
  return Array.isArray(declared) ? declared.filter((d): d is string => typeof d === 'string') : [];
}

/** Everything on this board that says it depends on `variable`, in drawing order. */
export function dependantsOf(store: BoardStore, variable: string): BoardObject[] {
  return objectsOf(store).filter((object) => dependsOf(object).includes(variable));
}

/** The control bound to `variable`, if this board has one. */
export function controlFor(store: BoardStore, variable: string): BoardObject | undefined {
  return objectsOf(store).find(
    (object) => (object as { variable?: unknown }).variable === variable,
  );
}

/**
 * A learner moved a control. Returns the ids the brain actually redrew, so a caller can tell a
 * recompute that landed from one that was refused (an unverified number never reaches the board:
 * `store.ink` refuses it and it appears in `store.refused`, not here).
 *
 * The control's own value is written locally and immediately. That is not the hand computing
 * anything — it is the hand reporting where the learner put the handle.
 */
export async function changeVariable(
  store: BoardStore,
  change: VariableChange,
  brain: BoardBrain,
): Promise<string[]> {
  const control = controlFor(store, change.variable);
  const dependants = dependantsOf(store, change.variable);
  // A fresh clock for the redraw, so the frames the brain sends are timed from this gesture rather
  // than from an utterance that ended minutes ago.
  store.beginUtterance();
  if (control && (control as { value?: unknown }).value !== change.value) {
    // `dur: 1` — the handle snaps to the finger; only the recompute is drawn at a hand's pace.
    store.ink({ ...control, value: change.value, t: { start: 0, dur: 1 } } as BoardObject);
  }
  let frames: BoardEvent[] = [];
  try {
    frames = await brain({ ...change, dependants });
  } catch {
    // The brain could not be reached. The handle stays where the learner put it and the board keeps
    // the numbers it already had — stale is visibly stale, and a made-up number would not be.
    return [];
  }
  const redrawn: string[] = [];
  for (const frame of frames) {
    // The grammar is the gate here exactly as it is on the stream: an object the schema does not
    // recognise never reaches the hand.
    const parsed = parseBoardEvent(frame);
    if (!parsed) continue;
    store.applyEvent(parsed);
    if (parsed.type === 'ink') {
      const id = (parsed.object as { id?: unknown }).id;
      if (typeof id === 'string') redrawn.push(id);
    }
  }
  return redrawn;
}

/**
 * The brain, over the one door. A recompute is an ordinary board turn — same capability, same
 * meter, same grammar — carrying two extra facts in the board context: which control moved, and
 * which objects declared they depend on it.
 */
export function gatewayBrain(options: {
  gatewayUrl: string;
  /** The context packet payload, exactly as any other turn sends it. */
  payload: Record<string, unknown>;
  /** The board context the conductor would send, so the brain knows what is already drawn. */
  board?: BoardContext;
  signal?: AbortSignal;
}): BoardBrain {
  return async (request) => {
    const frames: BoardEvent[] = [];
    await streamBoardTurn({
      gatewayUrl: options.gatewayUrl,
      payload: options.payload,
      board: {
        ...options.board,
        changed: { variable: request.variable, value: request.value },
        recompute: request.dependants.map((o) => o.id),
      },
      ...(options.signal ? { signal: options.signal } : {}),
      handlers: {
        onInk: (event) => {
          frames.push(event);
        },
      },
    });
    return frames;
  };
}
