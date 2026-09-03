/**
 * "Ask Wobo" — the grounded replies and the typewriter that lands them.
 */

import { describe, expect, it } from 'bun:test';
import {
  ANSWERS,
  answerFor,
  answerLength,
  TYPE_STEP,
  TYPE_TICK_MS,
  typedLength,
  typedRuns,
} from './ask';
import { ASK } from './page-copy';

describe('the replies', () => {
  it('always has something to say', () => {
    for (const question of ['', '???', 'zzz', 'what about badgers']) {
      expect(answerFor(question)).toBeDefined();
    }
  });

  it('answers each of the four chips from its own subject, not the catch-all', () => {
    const fallback = ANSWERS[ANSWERS.length - 1];
    for (const chip of ASK.chips) {
      expect(answerFor(chip)).not.toBe(fallback);
    }
  });

  it('answers the placeholder question, which is the one a visitor is most likely to send', () => {
    const reply = answerFor(ASK.placeholder);
    expect(reply).not.toBe(ANSWERS[ANSWERS.length - 1]);
  });

  it('routes a question about the syllabus to the syllabus answer', () => {
    const syllabus = ANSWERS[0];
    if (!syllabus) throw new Error('no answers');
    expect(answerFor("does it follow my school's syllabus?")).toBe(syllabus);
  });

  it('routes a question about being stuck to the never-says-wrong answer', () => {
    const reply = answerFor('what happens when my child gets stuck');
    expect(reply.plain).toContain("I never say 'wrong'");
  });

  it('keeps every reply in Wobo’s own first person, with no gendered pronoun', () => {
    for (const answer of ANSWERS) {
      const whole = `${answer.plain}${answer.accent}`;
      expect(/\b(he|she|him|her|his|hers)\b/i.test(whole)).toBe(false);
      expect(whole.includes('!')).toBe(false);
    }
  });

  it('gives every reply an emphasised closing clause', () => {
    for (const answer of ANSWERS) {
      expect(answer.accent.length).toBeGreaterThan(10);
      expect(answer.plain.endsWith(' ')).toBe(true);
    }
  });
});

describe('the typewriter', () => {
  it('has typed nothing at zero, and nothing before that', () => {
    expect(typedLength(0)).toBe(0);
    expect(typedLength(-100)).toBe(0);
    expect(typedLength(Number.NaN)).toBe(0);
  });

  it('adds a step per tick', () => {
    expect(typedLength(TYPE_TICK_MS)).toBe(TYPE_STEP);
    expect(typedLength(TYPE_TICK_MS * 10)).toBe(TYPE_STEP * 10);
  });

  it('finishes a reply in under four seconds — a visitor should not wait', () => {
    for (const answer of ANSWERS) {
      const ms = (answerLength(answer) / TYPE_STEP) * TYPE_TICK_MS;
      expect(ms).toBeLessThan(4000);
    }
  });

  it('never starts the blue clause before the sentence leading into it is finished', () => {
    const answer = ANSWERS[0];
    if (!answer) throw new Error('no answers');
    const early = typedRuns(answer, 5);
    expect(early.accent).toBe('');
    expect(early.plain).toBe(answer.plain.slice(0, 5));
  });

  it('holds the whole reply once the count passes its length', () => {
    const answer = ANSWERS[0];
    if (!answer) throw new Error('no answers');
    const done = typedRuns(answer, answerLength(answer) + 50);
    expect(done.plain).toBe(answer.plain);
    expect(done.accent).toBe(answer.accent);
  });
});
