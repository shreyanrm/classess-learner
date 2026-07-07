import { describe, expect, it } from 'bun:test';
import { foldFact, forgetFacts } from '../src/store/mind';

describe('forgetFacts (the forget verb, pure)', () => {
  it('drops facts matching the target either direction and reports exactly what left', () => {
    const facts = ['prefers to be called Ravi', 'exam on Friday', 'cricket'];
    // substring: "exam" is inside "exam on Friday"
    const a = forgetFacts(facts, 'exam');
    expect(a.facts).toEqual(['prefers to be called Ravi', 'cricket']);
    expect(a.removed).toEqual(['exam on Friday']);
    // reverse substring: the whole fact ("cricket") appears inside the longer spoken target phrase
    const b = forgetFacts(facts, 'forget cricket for me');
    expect(b.removed).toEqual(['cricket']);
  });

  it('is case-insensitive and removes nothing on an empty or unmatched target', () => {
    const facts = ['exam on FRIDAY'];
    expect(forgetFacts(facts, 'friday').removed).toEqual(['exam on FRIDAY']);
    expect(forgetFacts(facts, '  ')).toEqual({ facts, removed: [] });
    expect(forgetFacts(facts, 'chemistry')).toEqual({ facts, removed: [] });
  });
});

describe('foldFact (the remember verb, pure) — round-trips with forget', () => {
  it('dedupes case-insensitively and caps, and what it adds forget can remove', () => {
    const one = foldFact([], 'exam on Friday');
    expect(one).toEqual(['exam on Friday']);
    expect(foldFact(one, 'EXAM ON FRIDAY')).toBe(one); // dupe -> same ref, no write
    expect(forgetFacts(one, 'exam on Friday').facts).toEqual([]);
  });
});
