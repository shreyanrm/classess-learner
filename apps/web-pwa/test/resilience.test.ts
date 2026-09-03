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
 * The degradation this module documents has to be APPLIED, not merely decidable. Two consumers
 * carry it: the home arrival (a 1.5s swoop plus a letter-by-letter greeting) and the pointer-tilt
 * spring (a continuous pointermove listener + two springs). Both are grace, not help.
 */
describe('low fidelity is actually wired into the surfaces that cost frames', () => {
  const home = readFileSync(join(import.meta.dir, '..', 'src', 'screens', 'Home.tsx'), 'utf8');
  const kit = readFileSync(join(import.meta.dir, '..', 'src', 'ui', 'kit.tsx'), 'utf8');

  it('gates the home arrival on fidelity, not on first-visit alone', () => {
    expect(home).toContain('currentFidelity()');
    expect(home).toMatch(/const \[swoop\] = useState\(\(\) => firstVisit && currentFidelity\(\)/);
    // the animation branches read the gated flag, never the raw first-visit flag
    expect(home).not.toMatch(/initial=\{firstVisit \?/);
    expect(home).not.toMatch(/flashDelay=\{firstVisit \?/);
  });

  it('records the session as opened even when the arrival is skipped', () => {
    expect(home).toMatch(/if \(landed\) sessionStorage\.setItem\('clss-home-opened', '1'\)/);
  });

  it('turns the continuous pointer-tilt spring off under low fidelity', () => {
    expect(kit).toContain("useFidelity() === 'low'");
    expect(kit).toMatch(/reduced \|\|\s*lowFi/);
  });
});
