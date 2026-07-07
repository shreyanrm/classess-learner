import { describe, expect, it } from 'bun:test';
import { decideFidelity } from '../src/shell/resilience';

describe('decideFidelity — grace degrades, help does not', () => {
  it('full fidelity on a healthy device and link', () => {
    expect(decideFidelity({ reducedMotion: false, saveData: false, effectiveType: '4g' })).toBe(
      'full',
    );
    expect(decideFidelity({ reducedMotion: false, saveData: false, effectiveType: '3g' })).toBe(
      'full',
    );
    // unknown network (no Network Information API) is not a reason to degrade
    expect(decideFidelity({ reducedMotion: false, saveData: false })).toBe('full');
  });

  it('reduced-motion forces low fidelity regardless of network', () => {
    expect(decideFidelity({ reducedMotion: true, saveData: false, effectiveType: '4g' })).toBe(
      'low',
    );
  });

  it('Data Saver forces low fidelity', () => {
    expect(decideFidelity({ reducedMotion: false, saveData: true, effectiveType: '4g' })).toBe(
      'low',
    );
  });

  it('a 2G-class link forces low fidelity', () => {
    expect(decideFidelity({ reducedMotion: false, saveData: false, effectiveType: '2g' })).toBe(
      'low',
    );
    expect(
      decideFidelity({ reducedMotion: false, saveData: false, effectiveType: 'slow-2g' }),
    ).toBe('low');
  });
});
