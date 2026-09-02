import { describe, expect, it } from 'bun:test';
import { woboMolten } from '@classess/config';
import { flameForMood, MOLTEN, WOBO_IDENTITY } from '../src/identity';

describe('Wobo identity is locked', () => {
  it('is molten only, and molten is reserved for her', () => {
    expect(WOBO_IDENTITY.color).toBe('#FF5A1F');
    expect(WOBO_IDENTITY.color).toBe(woboMolten);
    expect(WOBO_IDENTITY.colorFamily).toBe('molten');
    expect(MOLTEN.base).toBe('#FF5A1F');
  });

  it('is a single round squircle jelly, matte, with two eyes', () => {
    expect(WOBO_IDENTITY.form).toBe('round_squircle_jelly');
    expect(WOBO_IDENTITY.surface).toBe('matte');
    expect(WOBO_IDENTITY.eyes).toBe(2);
  });

  it('always has the flame', () => {
    expect(WOBO_IDENTITY.flame).toBe('always');
  });

  it('is frozen — identity cannot be mutated at runtime', () => {
    expect(Object.isFrozen(WOBO_IDENTITY)).toBe(true);
    expect(Object.isFrozen(MOLTEN)).toBe(true);
  });

  it('maps moods to expressive flame states (choreography, not identity)', () => {
    expect(flameForMood('idle')).toBe('steady');
    expect(flameForMood('thinking')).toBe('lean');
    expect(flameForMood('celebrate')).toBe('flare');
    expect(flameForMood('waiting')).toBe('ember');
    expect(flameForMood('hint')).toBe('brighten');
  });
});
