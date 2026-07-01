import { describe, expect, it } from 'bun:test';
import { vidyaMolten } from '@classess/config';
import { flameForMood, MOLTEN, VIDYA_IDENTITY } from '../src/identity';

describe('Vidya identity is locked', () => {
  it('is molten only, and molten is reserved for her', () => {
    expect(VIDYA_IDENTITY.color).toBe('#FF4D1A');
    expect(VIDYA_IDENTITY.color).toBe(vidyaMolten);
    expect(VIDYA_IDENTITY.colorFamily).toBe('molten');
    expect(MOLTEN.base).toBe('#FF4D1A');
  });

  it('is a single round squircle jelly, matte, with two eyes', () => {
    expect(VIDYA_IDENTITY.form).toBe('round_squircle_jelly');
    expect(VIDYA_IDENTITY.surface).toBe('matte');
    expect(VIDYA_IDENTITY.eyes).toBe(2);
  });

  it('always has the flame', () => {
    expect(VIDYA_IDENTITY.flame).toBe('always');
  });

  it('is frozen — identity cannot be mutated at runtime', () => {
    expect(Object.isFrozen(VIDYA_IDENTITY)).toBe(true);
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
