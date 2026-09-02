import { describe, expect, it } from 'bun:test';
import { answersMatch, normalizeAnswer } from './answer';

describe('a typed answer is judged on meaning, not on typing', () => {
  it('ignores case, stray spacing and a trailing full stop', () => {
    expect(answersMatch('  Photosynthesis. ', 'photosynthesis')).toBe(true);
    expect(answersMatch('carbon   dioxide', 'Carbon dioxide')).toBe(true);
    expect(answersMatch('9.8 m/s²!', '9.8 m/s²')).toBe(true);
  });

  it('still marks a wrong answer wrong', () => {
    expect(answersMatch('oxygen', 'carbon dioxide')).toBe(false);
    expect(answersMatch('', 'photosynthesis')).toBe(false);
  });

  it('normalises to a single canonical form', () => {
    expect(normalizeAnswer('  The\tMitochondria ??')).toBe('the mitochondria');
  });
});
