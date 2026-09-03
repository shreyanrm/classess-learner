import { describe, expect, it } from 'bun:test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import * as wobo from '../src/index';

const SRC = join(import.meta.dir, '..', 'src');

/**
 * Wave 5 left a single presence surface: actions + context-bus + highlight-overlay + board.
 * The second, unused presence implementation (WoboPresence / WoboPanel / wobo-layer) is deleted;
 * this pins it so it cannot creep back in as a parallel, drifting copy.
 */
describe('the package exposes exactly one presence surface', () => {
  it('has no second presence implementation on disk', () => {
    for (const dead of ['WoboPresence.tsx', 'WoboPanel.tsx', 'wobo-layer.tsx']) {
      expect(existsSync(join(SRC, dead))).toBe(false);
    }
  });

  it('does not export the deleted presence components', () => {
    for (const dead of ['WoboPresence', 'WoboPanel', 'WoboLayer']) {
      expect(Object.hasOwn(wobo, dead)).toBe(false);
    }
  });

  it('still exports the live surface', () => {
    expect(typeof wobo.WoboOverlay).toBe('function');
    expect(typeof wobo.WoboBody).toBe('function');
    expect(wobo.WOBO_IDENTITY.color).toBe('#2B45FF'); // Wobo blue — palette v4, DESIGN.md §2/§4
    expect(wobo.WOBO_IDENTITY.form).toBe('ink_visor_wobot');
  });
});
