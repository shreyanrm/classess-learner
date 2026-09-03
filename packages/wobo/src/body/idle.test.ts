import { describe, expect, it } from 'bun:test';
import {
  baseInForce,
  dozing,
  glancesAt,
  IDLE_STAGE_NAMES,
  IDLE_THRESHOLDS,
  idleClock,
  idleStageFor,
  idleStageName,
  idleTransition,
  nextGlanceDelay,
  nextGlanceTarget,
} from './idle';

describe('the idle scheduler', () => {
  it('holds the owner-approved thresholds', () => {
    expect(IDLE_THRESHOLDS).toEqual({
      glancing: 4_000,
      bored: 12_000,
      yawning: 20_000,
      dozing: 35_000,
    });
  });

  it('steps through the stages at the boundaries, inclusive', () => {
    expect(idleStageFor(0)).toBe(0);
    expect(idleStageFor(3_999)).toBe(0);
    expect(idleStageFor(4_000)).toBe(1);
    expect(idleStageFor(11_999)).toBe(1);
    expect(idleStageFor(12_000)).toBe(2);
    expect(idleStageFor(19_999)).toBe(2);
    expect(idleStageFor(20_000)).toBe(3);
    expect(idleStageFor(34_999)).toBe(3);
    expect(idleStageFor(35_000)).toBe(4);
    expect(idleStageFor(10 * 60_000)).toBe(4);
  });

  it('names every stage', () => {
    expect(IDLE_STAGE_NAMES).toEqual(['awake', 'glancing', 'bored', 'yawning', 'dozing']);
    expect(idleStageName(0)).toBe('awake');
    expect(idleStageName(4)).toBe('dozing');
  });

  it('glances only while glancing or bored, and dreams only while dozing', () => {
    expect([0, 1, 2, 3, 4].map((s) => glancesAt(s as 0))).toEqual([
      false,
      true,
      true,
      false,
      false,
    ]);
    expect([0, 1, 2, 3, 4].map((s) => dozing(s as 0))).toEqual([false, false, false, false, true]);
  });
});

describe('what fires when Wobo crosses a stage', () => {
  it('does nothing when the stage has not changed', () => {
    expect(idleTransition(2, 2)).toBeNull();
  });

  it('gets bored, then yawns or sighs, then dozes', () => {
    expect(idleTransition(1, 2)).toEqual({ expression: 'bored' });
    expect(idleTransition(2, 3, () => 0.1)).toEqual({ behaviour: 'yawn' });
    expect(idleTransition(2, 3, () => 0.9)).toEqual({ behaviour: 'sigh' });
    expect(idleTransition(3, 4)).toEqual({ expression: 'sleepy' });
  });

  it('startles awake from bored or deeper, and simply returns from a glance', () => {
    expect(idleTransition(2, 0)).toEqual({ expression: 'surprised', behaviour: 'startle' });
    expect(idleTransition(4, 0)).toEqual({ expression: 'surprised', behaviour: 'startle' });
    expect(idleTransition(1, 0)).toEqual({ expression: 'idle' });
  });

  it('has nothing to say about the first quiet stage — Wobo just starts looking about', () => {
    expect(idleTransition(0, 1)).toBeNull();
  });
});

describe('glances', () => {
  it('holds a glance between 0.9 s and 2.7 s', () => {
    expect(nextGlanceDelay(() => 0)).toBe(900);
    expect(nextGlanceDelay(() => 1)).toBe(2700);
  });

  it("wanders inside Wobo's reach, centred on straight ahead", () => {
    expect(nextGlanceTarget(() => 0.5)).toEqual([0, 0]);
    expect(nextGlanceTarget(() => 0)).toEqual([-22, -13]);
    expect(nextGlanceTarget(() => 1)).toEqual([22, 13]);
  });
});

/**
 * Wobo's idle life belongs to the LEARNER's quiet, not to Wobo's. Speaking, drawing, listening and
 * thinking are not among the four input events the app watches, so without these two rules a
 * learner sat through a two-minute explanation watching Wobo get bored, yawn and fall asleep.
 */
describe('Wobo is not idle while Wobo has something to do', () => {
  it("holds Wobo's idle clock at now for as long as the app has Wobo doing something", () => {
    expect(idleClock('explaining', 1_000, 40_000)).toBe(40_000);
    expect(idleClock('drawing', 1_000, 40_000)).toBe(40_000);
    // Idle is idle: the learner's own quiet is measured honestly.
    expect(idleClock('idle', 1_000, 40_000)).toBe(1_000);
  });

  it('never reaches a doze while Wobo is explaining', () => {
    const spokeFrom = 1_000;
    for (const now of [spokeFrom + 13_000, spokeFrom + 21_000, spokeFrom + 36_000]) {
      expect(idleStageFor(now - idleClock('explaining', spokeFrom, now))).toBe(0);
    }
    // The same silence with nothing to do does put Wobo to sleep, which is the behaviour we keep.
    expect(
      idleStageFor(spokeFrom + 36_000 - idleClock('idle', spokeFrom, spokeFrom + 36_000)),
    ).toBe(4);
  });

  it('takes the expression the app asks for at once, even mid-doze', () => {
    expect(baseInForce('sleepy', 'explaining', 4)).toBe('explaining');
    expect(baseInForce('idle', 'listening', 3)).toBe('listening');
  });

  it("lets Wobo's idle life colour Wobo only when the app has nothing to say", () => {
    // Stage 3 with nothing asked of Wobo: Wobo's yawn stands.
    expect(baseInForce('sleepy', 'idle', 3)).toBe('sleepy');
    // Back at stage 0 the app's answer takes over again.
    expect(baseInForce('sleepy', 'idle', 0)).toBe('idle');
  });
});
