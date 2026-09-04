/**
 * "Ask Wobo" — the two things about it that must never quietly change.
 *
 * It answers the four questions the page itself offers, and it is honest about everything else. A
 * keyword matcher would read as understanding and would eventually claim something untrue about the
 * product on the one surface that says Wobo is careful; that is why the match is exact.
 */

import { describe, expect, it } from 'bun:test';
import { answerFor, typedLength } from './ask';
import { ASK, ASK_TYPE_MS } from './page-copy';

describe('answerFor', () => {
  it('answers every question the page puts in the reader’s hand', () => {
    for (const chip of ASK.chips) {
      expect(answerFor(chip)).toBe(ASK.answers[chip] as string);
      expect(answerFor(chip)).not.toBe(ASK.fallback);
    }
  });

  it('ignores case and stray whitespace, because a reader retyping one will not match it', () => {
    const chip = ASK.chips[0] as string;
    expect(answerFor(`  ${chip.toUpperCase()}  `)).toBe(ASK.answers[chip] as string);
  });

  it('is honest about anything else rather than inventing a reply', () => {
    expect(answerFor('what is the capital of France')).toBe(ASK.fallback);
    expect(answerFor('')).toBe(ASK.fallback);
    expect(answerFor('   ')).toBe(ASK.fallback);
  });

  it('always has something to say', () => {
    for (const question of ['', 'x', 'is it any good?', '你好']) {
      expect(answerFor(question).length).toBeGreaterThan(0);
    }
  });

  it('never claims to be the tutor thinking', () => {
    expect(ASK.fallback).toContain('help centre');
    expect(ASK.fallback).toContain('support@heywobo.com');
  });
});

describe('typedLength', () => {
  it('adds one character per tick', () => {
    expect(typedLength(0)).toBe(0);
    expect(typedLength(ASK_TYPE_MS - 1)).toBe(0);
    expect(typedLength(ASK_TYPE_MS)).toBe(1);
    expect(typedLength(ASK_TYPE_MS * 10)).toBe(10);
  });

  it('reads a nonsense clock as "not started" rather than poisoning the reply', () => {
    expect(typedLength(Number.NaN)).toBe(0);
    expect(typedLength(-500)).toBe(0);
  });
});
