import { describe, expect, it } from 'bun:test';
import { gazeTarget, life, moodFor, type PresenceSignals } from './presence';

const quiet: PresenceSignals = {
  listening: false,
  thinking: false,
  drawing: false,
  aha: false,
  speaking: false,
  engaged: false,
};

describe('the expression the moment calls for', () => {
  it('rests when nothing is happening', () => {
    expect(moodFor(quiet)).toBe('idle');
  });

  it('reads the room in the order a person would', () => {
    expect(moodFor({ ...quiet, aha: true, listening: true, drawing: true })).toBe('celebrating');
    expect(moodFor({ ...quiet, listening: true, drawing: true })).toBe('listening');
    expect(moodFor({ ...quiet, drawing: true, thinking: true })).toBe('drawing');
    expect(moodFor({ ...quiet, computing: true, thinking: true })).toBe('computing');
    expect(moodFor({ ...quiet, thinking: true, speaking: true })).toBe('thinking');
    expect(moodFor({ ...quiet, speaking: true, engaged: true })).toBe('explaining');
    expect(moodFor({ ...quiet, engaged: true })).toBe('focused');
  });
});

describe('where her eyes go', () => {
  const region = { x: 10, y: 20, width: 100, height: 40 };

  it('to what the learner circled, before anything else', () => {
    expect(gazeTarget(region, { x: 500, y: 500 })).toBe(region);
  });

  it('to the ink she is laying down when nothing is circled', () => {
    expect(gazeTarget(null, { x: 500, y: 500 })).toEqual({
      x: 492,
      y: 492,
      width: 16,
      height: 16,
    });
  });

  it('nowhere in particular when there is nothing to look at', () => {
    expect(gazeTarget(null, null)).toBeNull();
    expect(gazeTarget({ x: 0, y: 0, width: 0, height: 0 }, null)).toBeNull();
  });
});

describe('real idleness', () => {
  it('is measured from real input, not a timer', () => {
    const before = life.get();
    life.note(before + 10_000);
    expect(life.get()).toBe(before + 10_000);
  });

  it('does not fan a re-render for every pixel of a pointer move', () => {
    let notified = 0;
    const stop = life.subscribe(() => {
      notified += 1;
    });
    const base = life.get() + 100_000;
    life.note(base);
    life.note(base + 50); // inside the burst window
    life.note(base + 90);
    expect(notified).toBe(1);
    life.note(base + 1000);
    expect(notified).toBe(2);
    stop();
  });
});
