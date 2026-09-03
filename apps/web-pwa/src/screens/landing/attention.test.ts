/**
 * Reading is attention: the throttle that keeps Wobo awake without a render per event.
 */

import { describe, expect, it } from 'bun:test';
import { MIN_GAP_MS, shouldReport } from './attention';

describe('shouldReport', () => {
  it('reports the first input after a gap', () => {
    expect(shouldReport(10_000, 10_000 - MIN_GAP_MS)).toBe(true);
    expect(shouldReport(10_000, 0)).toBe(true);
  });

  it('swallows everything inside the gap — a scroll is thousands of events', () => {
    expect(shouldReport(10_000, 9_999)).toBe(false);
    expect(shouldReport(10_000, 10_000 - MIN_GAP_MS + 1)).toBe(false);
  });

  it('stays well under the rig’s first idle beat, so Wobo never starts to drift', () => {
    // The rig glances away at four seconds of no input (packages/wobo/src/body/idle.ts).
    expect(MIN_GAP_MS).toBeLessThan(4000);
  });
});
