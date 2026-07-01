import { describe, expect, it } from 'bun:test';
import { type ConceptState, showsColor } from '../src/ConceptTile';
import { type Band, bandMeta } from '../src/MasteryBand';

describe('ConceptTile — colour is earned', () => {
  it('shows colour only when mastered', () => {
    const states: ConceptState[] = ['locked', 'not_started', 'in_progress', 'mastered'];
    for (const s of states) {
      expect(showsColor(s)).toBe(s === 'mastered');
    }
  });
});

describe('MasteryBand — label + shape + earned colour', () => {
  it('maps every band to a plain-language label and a pip level', () => {
    const expected: Record<Band, { label: string; level: number; earnsColor: boolean }> = {
      not_started: { label: 'Not started', level: 0, earnsColor: false },
      emerging: { label: 'Emerging', level: 1, earnsColor: false },
      developing: { label: 'Developing', level: 2, earnsColor: false },
      secure: { label: 'Secure', level: 3, earnsColor: true },
      independent: { label: 'Independent', level: 4, earnsColor: true },
    };
    for (const band of Object.keys(expected) as Band[]) {
      expect(bandMeta(band)).toEqual(expected[band]);
    }
  });

  it('earns colour only at the top bands (never colour alone on the low ones)', () => {
    expect(bandMeta('emerging').earnsColor).toBe(false);
    expect(bandMeta('independent').earnsColor).toBe(true);
  });
});
