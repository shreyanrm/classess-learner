/**
 * "Ask Wobo about Wobo" — that every question gets a grounded answer, and that the hand types it
 * out without ever handing a visitor's own words back to the DOM as markup.
 */

import { describe, expect, it } from 'bun:test';
import { ASK } from './copy';
import { askWobo, replyLength, type Reply, typedTo } from './ask';

const flat = (reply: Reply) => reply.map((s) => s.text).join('');

describe('askWobo', () => {
  it('answers every chip the section offers', () => {
    for (const chip of ASK.chips) {
      const reply = askWobo(chip);
      expect(replyLength(reply)).toBeGreaterThan(40);
    }
  });

  it('answers the question in the placeholder', () => {
    expect(flat(askWobo(ASK.placeholder))).toContain('board and class');
  });

  it('always has an answer, even for nothing at all', () => {
    for (const q of ['', '   ', 'asdfgh', 'what is the capital of Peru']) {
      expect(replyLength(askWobo(q))).toBeGreaterThan(0);
    }
  });

  it('routes each subject to its own grounded answer', () => {
    expect(flat(askWobo('is it safe'))).toContain('never show ads');
    expect(flat(askWobo('what if my child is stuck'))).toContain('never say');
    expect(flat(askWobo('how much does it cost'))).toContain('Free every day');
  });

  it('never says wrong without disowning it, and never shouts', () => {
    for (const q of [...ASK.chips, ASK.placeholder, 'anything']) {
      const text = flat(askWobo(q));
      expect(text).not.toContain('!');
      if (/wrong/i.test(text)) expect(text).toContain('never say');
    }
  });

  it('sets exactly one span of the reply in pigment', () => {
    for (const q of [...ASK.chips, 'anything at all']) {
      expect(askWobo(q).filter((s) => s.em)).toHaveLength(1);
    }
  });

  it('carries no markup, so a visitor cannot type any in', () => {
    for (const q of ['<img src=x onerror=alert(1)>', ASK.placeholder]) {
      expect(flat(askWobo(q))).not.toMatch(/[<>]/);
    }
  });
});

describe('typedTo', () => {
  const reply = askWobo('syllabus');

  it('writes nothing at zero and everything at the end', () => {
    expect(typedTo(reply, 0)).toEqual([]);
    expect(flat(typedTo(reply, replyLength(reply)))).toBe(flat(reply));
    expect(flat(typedTo(reply, 9999))).toBe(flat(reply));
  });

  it('grows one character at a time and never goes backwards', () => {
    let last = 0;
    for (let i = 0; i <= replyLength(reply); i++) {
      const len = flat(typedTo(reply, i)).length;
      expect(len).toBe(i);
      expect(len).toBeGreaterThanOrEqual(last);
      last = len;
    }
  });

  it('does not create the pigment span before the hand reaches it', () => {
    const firstLen = reply[0]?.text.length ?? 0;
    expect(typedTo(reply, firstLen - 1).some((s) => s.em)).toBe(false);
    expect(typedTo(reply, firstLen + 1).some((s) => s.em)).toBe(true);
  });
});
