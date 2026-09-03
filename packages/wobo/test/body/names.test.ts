/**
 * Display names, so a surface never shows a reader a variable.
 *
 * The defect this exists for: the character bench captioned its contact sheets with the rig's own
 * identifiers — `followPointer`, `penTap`, `gotIt`, `headShake` — sitting in a row beside `wave` and
 * `drift`, with a lowercase `replay` button under them. Every one of the rig's names is checked
 * here, so a scene or behaviour added later cannot arrive with a caption nobody wrote.
 */

import { describe, expect, it } from 'bun:test';
import { BEHAVIOUR_NAMES } from '../../src/body/behaviours';
import { EXPRESSION_NAMES } from '../../src/body/expressions';
import { displayName } from '../../src/body/names';
import { SCENE_NAMES } from '../../src/body/scenes';

describe('displayName', () => {
  it('breaks a camel hump into two words', () => {
    expect(displayName('followPointer')).toBe('Follow pointer');
    expect(displayName('penTap')).toBe('Pen tap');
    expect(displayName('gotIt')).toBe('Got it');
    expect(displayName('headShake')).toBe('Head shake');
  });

  it('sentence-cases a single word without otherwise touching it', () => {
    expect(displayName('wave')).toBe('Wave');
    expect(displayName('drift')).toBe('Drift');
    expect(displayName('idle')).toBe('Idle');
  });

  it('reads a dash or an underscore as a space too', () => {
    expect(displayName('head-shake')).toBe('Head shake');
    expect(displayName('head_shake')).toBe('Head shake');
  });

  it('leaves an empty name empty rather than inventing one', () => {
    expect(displayName('')).toBe('');
    expect(displayName('   ')).toBe('');
  });

  it('is idempotent, so a name already written for a reader survives a second pass', () => {
    for (const name of ['Follow pointer', 'Got it', 'Wave']) {
      expect(displayName(name)).toBe(name);
    }
  });
});

describe('every name the rig exposes', () => {
  const ALL = [...EXPRESSION_NAMES, ...BEHAVIOUR_NAMES, ...SCENE_NAMES];

  it('comes out in sentence case with no camel hump left in it', () => {
    for (const name of ALL) {
      const shown = displayName(name);
      expect(shown[0]).toBe(shown[0]?.toUpperCase() ?? '');
      expect(shown.slice(1)).not.toMatch(/[a-z][A-Z]/);
    }
  });

  it('still says one name per thing — no two collide once they are readable', () => {
    for (const names of [EXPRESSION_NAMES, BEHAVIOUR_NAMES, SCENE_NAMES]) {
      const shown = names.map(displayName);
      expect(new Set(shown).size).toBe(shown.length);
    }
  });
});
