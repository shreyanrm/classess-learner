import { describe, expect, it } from 'bun:test';
import { BudgetExhaustedError, SignInRequiredError } from '@classess/sdk';
import { friendlyTime, refusalLine } from './refusals';

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
