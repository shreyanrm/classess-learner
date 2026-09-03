import { describe, expect, it } from 'bun:test';
import { BudgetExhaustedError, SignInRequiredError } from '@classess/sdk';
import { WOBBLY_LINE } from '../shell/resilience';
import { friendlyTime, isBargeIn, isNetworkError, refusalLine } from './refusals';

describe('what she says when the brain says no', () => {
  it('401: asks them to sign in, and the app takes them to her sign-in beat', () => {
    const line = refusalLine(new SignInRequiredError());
    expect(line.signIn).toBe(true);
    expect(line.text).toMatch(/sign in/i);
  });

  it('429: says when she is free again, in the learner’s own clock', () => {
    const reset = new Date(Date.now() + 3_600_000).toISOString();
    const line = refusalLine(new BudgetExhaustedError('spent', reset, 0));
    expect(line.signIn).toBe(false);
    expect(line.text).toContain(
      new Date(reset).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
    );
    expect(line.text).toMatch(/come back/i);
  });

  it('429 with no reset time still lands as her sentence, not an error', () => {
    const line = refusalLine(
      new BudgetExhaustedError('That is everything I can carry today.', null, null),
    );
    expect(line.text).toBe('That is everything I can carry today.');
  });

  it('never leaks a status code, a provider, a model or a price', () => {
    const lines = [
      refusalLine(new SignInRequiredError()),
      refusalLine(new BudgetExhaustedError('', new Date().toISOString(), 0)),
      refusalLine(new Error('litellm.APIConnectionError: gemini-2.5-flash quota exceeded')),
    ].map((l) => l.text);
    for (const text of lines) {
      expect(text).not.toMatch(/gemini|openai|claude|anthropic|google|classess|gpt|litellm/i);
      expect(text).not.toMatch(/\b(401|403|429|5\d\d)\b/);
      expect(text).not.toMatch(/[₹$]|upgrade|plan|price/i);
      expect(text.length).toBeGreaterThan(10);
    }
  });

  it('anything else is the honest "give me a moment", never a raw error', () => {
    expect(refusalLine(new Error('TypeError: fetch failed')).text).toBe(
      'Give me a moment, then ask me again.',
    );
    expect(refusalLine(undefined).signIn).toBe(false);
  });

  it('a nonsense reset time is simply not spoken', () => {
    expect(friendlyTime('not-a-time')).toBeNull();
    expect(friendlyTime(null)).toBeNull();
  });
});

/**
 * BOARD.md §4: on an interrupt the pen lifts, the voice stops, and what is drawn stays. Nothing
 * there is an error. The abort rejects the in-flight fetch, and reading that as a refusal appended
 * "Give me a moment, then ask me again." to her own half-finished sentence — telling the learner to
 * try again for something they deliberately did.
 */
describe('barging in', () => {
  it('says nothing at all', () => {
    expect(refusalLine(new DOMException('aborted', 'AbortError'))).toEqual({
      text: '',
      signIn: false,
    });
    // Whatever shape the runtime gives it, an AbortError is an AbortError.
    const plain = Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' });
    expect(refusalLine(plain).text).toBe('');
  });

  it('still has her line for everything that is genuinely wrong', () => {
    expect(refusalLine(new Error('socket hang up')).text).not.toBe('');
  });

  it('knows a barge-in from an ordinary failure', () => {
    expect(isBargeIn(new DOMException('aborted', 'AbortError'))).toBe(true);
    expect(isBargeIn(new Error('socket hang up'))).toBe(false);
    expect(isBargeIn(null)).toBe(false);
  });
});

/**
 * Family N's dead-end rule: a link that wobbled is not "something went wrong". `resilience.ts`
 * already had her line for it; nothing said it, so a 2G stall reached the learner as the generic
 * trouble copy.
 */
describe('a network stall gets her own line', () => {
  const stalls = [
    new TypeError('Failed to fetch'), // Chrome
    new TypeError('NetworkError when attempting to fetch resource.'), // Firefox
    new TypeError('Load failed'), // Safari
    new TypeError('The network connection was lost.'),
  ];

  it('recognises a fetch that never reached the gateway', () => {
    for (const err of stalls) expect(isNetworkError(err)).toBe(true);
  });

  it('says the wobbly line, and never asks the learner to sign in for it', () => {
    for (const err of stalls) {
      expect(refusalLine(err)).toEqual({ text: WOBBLY_LINE, signIn: false });
    }
  });

  it('is not fooled by an ordinary error, or by a barge-in', () => {
    expect(isNetworkError(new Error('Failed to fetch'))).toBe(false); // not a TypeError
    expect(isNetworkError(new TypeError('x is not a function'))).toBe(false);
    expect(isNetworkError(null)).toBe(false);
    expect(refusalLine(new DOMException('aborted', 'AbortError')).text).toBe('');
  });

  it('leaves the two real refusals alone', () => {
    expect(refusalLine(new SignInRequiredError()).signIn).toBe(true);
    expect(refusalLine(new Error('socket hang up')).text).not.toBe(WOBBLY_LINE);
  });
});
