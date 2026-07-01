import { describe, expect, it } from 'bun:test';
import { selectMotion } from '../src/internal/reduced-motion';

describe('selectMotion', () => {
  it('picks the calm value when motion is reduced', () => {
    expect(selectMotion(true, 'full', 'calm')).toBe('calm');
  });

  it('picks the full value when motion is not reduced', () => {
    expect(selectMotion(false, 'full', 'calm')).toBe('full');
  });

  it('works with arbitrary transition objects', () => {
    const full = { type: 'spring', bounce: 0 };
    const calm = { duration: 0.16 };
    type Transition = Record<string, number | string>;
    expect(selectMotion<Transition>(true, full, calm)).toBe(calm);
    expect(selectMotion<Transition>(false, full, calm)).toBe(full);
  });
});
