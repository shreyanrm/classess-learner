import { describe, expect, it } from 'bun:test';
import { plainOf } from '../../src/answers/hand';
import { padTex } from '../../src/answers/number-pad';
import {
  expressionIsBlank,
  expressionMatches,
  gcd,
  isPadEntry,
  isSimplified,
  normaliseExpression,
  parsePadEntry,
  pressPadKey,
} from '../../src/answers/value';

describe('what is on the pad', () => {
  it('reads a whole number, a decimal and a fraction', () => {
    expect(parsePadEntry('42')).toEqual({ value: 42 });
    expect(parsePadEntry('-12.5')).toEqual({ value: -12.5 });
    expect(parsePadEntry('3/4')).toEqual({ value: 0.75, numerator: 3, denominator: 4 });
    expect(parsePadEntry('-3/4')).toEqual({ value: -0.75, numerator: -3, denominator: 4 });
  });

  it('is not a number yet while it is half typed', () => {
    for (const half of ['', '-', '3.', '3/', '.5']) expect(parsePadEntry(half)).toBeNull();
  });

  it('refuses a division by zero rather than returning infinity', () => {
    expect(parsePadEntry('1/0')).toBeNull();
  });

  it('knows what the pad could have produced', () => {
    expect(isPadEntry('-3/4')).toBe(true);
    expect(isPadEntry('3..4')).toBe(false);
    expect(isPadEntry('3/4/5')).toBe(false);
  });

  it('caps the entry rather than growing without limit', () => {
    const long = '9'.repeat(32);
    expect(pressPadKey(long, '9')).toBe(long);
  });

  it('ignores a key the pad has no meaning for', () => {
    expect(pressPadKey('3', 'q')).toBe('3');
  });
});

describe('fractions in lowest terms', () => {
  it('divides down correctly, whatever the signs', () => {
    expect(gcd(6, 8)).toBe(2);
    expect(gcd(-6, 8)).toBe(2);
    expect(gcd(7, 13)).toBe(1);
  });

  it('calls a reduced fraction reduced, and zero over anything already lowest', () => {
    expect(isSimplified(3, 4)).toBe(true);
    expect(isSimplified(6, 8)).toBe(false);
    expect(isSimplified(0, 5)).toBe(true);
  });
});

describe('two expressions are the same expression', () => {
  it('unfolds a fraction, a root and a degree root into one normal form', () => {
    expect(normaliseExpression('\\frac{1}{2}')).toBe('1/2');
    expect(normaliseExpression('\\frac{ 1 }{ 2 }')).toBe('1/2');
    expect(normaliseExpression('\\sqrt{2}')).toBe('sqrt(2)');
    expect(normaliseExpression('\\sqrt[3]{8}')).toBe('root(3)(8)');
  });

  it('reads the operators through to one spelling', () => {
    expect(normaliseExpression('2\\times3')).toBe('2*3');
    expect(normaliseExpression('2\\cdot3')).toBe('2*3');
    expect(normaliseExpression('6\\div2')).toBe('6/2');
    expect(normaliseExpression('\\pi r^{2}')).toBe('pir^2');
  });

  it('drops the brackets that never meant anything', () => {
    expect(normaliseExpression('(x)')).toBe('x');
    expect(normaliseExpression('\\left(x+1\\right)')).toBe('(x+1)');
  });

  it('stays syntactic on purpose: reordering is a different answer unless the item allows it', () => {
    expect(expressionMatches('x+1', '1+x', [])).toBe(false);
    expect(expressionMatches('x+1', '1+x', ['x+1'])).toBe(true);
  });

  it('never matches an empty entry against anything', () => {
    expect(expressionMatches('', '', [])).toBe(false);
  });

  it('counts structure with no leaves as still blank', () => {
    expect(expressionIsBlank('')).toBe(true);
    expect(expressionIsBlank('\\frac{\\square}{\\square}')).toBe(true);
    expect(expressionIsBlank('\\sqrt{\\square}')).toBe(true);
    expect(expressionIsBlank('\\frac{1}{\\square}')).toBe(false);
    expect(expressionIsBlank('\\pi')).toBe(false);
    expect(expressionIsBlank('3^{\\square}')).toBe(false);
  });
});

describe('what the learner sees', () => {
  it('sets a typed fraction as a fraction, not as a slash', () => {
    expect(padTex('3/4')).toBe('\\frac{3}{4}');
    expect(padTex('-3/4')).toBe('-\\frac{3}{4}');
    expect(padTex('12.5')).toBe('12.5');
  });

  it('keeps a half-typed fraction drawable rather than collapsing its bar', () => {
    expect(padTex('3/')).toBe('\\frac{3}{ }');
    // ...and the flat fallback shows the empty slot as empty, not as a pair of brackets.
    expect(plainOf(padTex('3/'))).toBe('3/');
  });

  it('never leaves a backslash on the screen when the hand is unavailable', () => {
    expect(plainOf('\\frac{1}{2}')).toBe('1/2');
    expect(plainOf('\\frac{x+1}{2}')).toBe('(x+1)/2');
    expect(plainOf('x^{2}')).toBe('x^2');
    expect(plainOf('\\pi r^{2}')).toBe('π r^2');
    expect(plainOf('\\sqrt{2}')).toBe('√2');
    expect(plainOf('2\\times3')).toBe('2×3');
  });
});
