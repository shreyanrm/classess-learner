import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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

/**
 * The degradation this module documents has to be APPLIED, not merely decidable. The pointer-tilt
 * spring (a continuous pointermove listener + two springs) carries it; the home's old arrival (a
 * 1.5s swoop plus a letter-by-letter greeting) is gone with the home built on the prototype, which
 * arrives finished — the app's arrival is the states set's loader (DESIGN.md §5), not a screen's.
 */
describe('low fidelity is actually wired into the surfaces that cost frames', () => {
  const home = readFileSync(join(import.meta.dir, '..', 'src', 'screens', 'Home.tsx'), 'utf8');
  const kit = readFileSync(join(import.meta.dir, '..', 'src', 'ui', 'kit.tsx'), 'utf8');

  it('the home carries no arrival of its own to gate', () => {
    expect(home).not.toContain('swoop');
    expect(home).not.toMatch(/initial=\{firstVisit \?/);
    expect(home).not.toMatch(/flashDelay=\{firstVisit \?/);
  });

  it('turns the continuous pointer-tilt spring off under low fidelity', () => {
    expect(kit).toContain("useFidelity() === 'low'");
    expect(kit).toMatch(/reduced \|\|\s*lowFi/);
  });
});
