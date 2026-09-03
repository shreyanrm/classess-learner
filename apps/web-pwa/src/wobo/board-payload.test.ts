/**
 * The board turn's envelope, held to the gateway's reading of it.
 *
 * `board-stream.ts` posts `{ payload: { ...payload, board } }` and the gateway reads the learner's
 * words out of `payload.context.turn.lastUserInput` in TWO places:
 *
 *   · `safety.py::inbound_text` — the inbound screen, which runs before anything reaches a model;
 *   · `wobo.py::mock_board_plan` / `run_board_plan` — what Wobo is actually being asked to draw.
 *
 * App.tsx once passed `woboTurnPayload(context).context` here — the inside of the envelope rather
 * than the envelope — so both readings landed on nothing: every board turn was screened against an
 * empty string and planned no objects at all. These tests are the shape contract that catches it.
 */

import { describe, expect, it } from 'bun:test';
import { boardTurnPayload, inboundTextOf, woboTurnPayload } from './capabilities';

const context = (lastUserInput: string) => ({
  page: { route: 'learn', state: {} },
  turn: { lastUserInput, recentTurns: [{ role: 'user' as const, text: lastUserInput }] },
  lifetime: {},
  targets: [],
});

describe("the board turn's payload", () => {
  it('nests the context one level down, where the gateway reads it', () => {
    const payload = boardTurnPayload(context('solve 2*x + 3 = 7 step by step'));
    expect(Object.hasOwn(payload, 'context')).toBe(true);
    // The mistake this guards: the context's own keys hoisted to the root of the payload.
    expect(Object.hasOwn(payload, 'turn')).toBe(false);
    expect(Object.hasOwn(payload, 'page')).toBe(false);
  });

  it("carries the learner's words to the exact path the inbound safety screen reads", () => {
    const payload = boardTurnPayload(context('solve 2*x + 3 = 7 step by step'));
    expect(inboundTextOf(payload)).toBe('solve 2*x + 3 = 7 step by step');
  });

  it('is empty-safe: an unwrapped context reads as no words at all', () => {
    // Proof that `inboundTextOf` is a real reading and not a constant — the old, wrong shape
    // genuinely resolves to the empty string, which is exactly how the bug hid.
    const unwrapped = woboTurnPayload(context('I want to hurt myself'))
      .context as unknown as Record<string, unknown>;
    expect(inboundTextOf(unwrapped)).toBe('');
    expect(inboundTextOf(boardTurnPayload(context('I want to hurt myself')))).toBe(
      'I want to hurt myself',
    );
  });

  it('still rides the context packet the brain needs, inside the envelope', () => {
    const payload = boardTurnPayload(context('graph y = x^2'));
    const inner = payload.context as Record<string, unknown>;
    expect(inner.packet).toBeDefined();
    expect(inner.page).toBeDefined();
  });

  it('does not mutate the context it was handed', () => {
    const source = context('draw a free body diagram');
    boardTurnPayload(source);
    expect(Object.hasOwn(source, 'packet')).toBe(false);
  });
});
