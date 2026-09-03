import { describe, expect, it } from 'bun:test';
import {
  LOADER_DURATION,
  LOADER_OVERSHOOT,
  LOADER_TIMING,
  LOADER_VIEW,
  loaderDash,
  loaderFrame,
  loaderRestFrame,
} from '../../src/body/loader';

const sample = (step = 1) => {
  const out = [];
  for (let t = 0; t <= LOADER_DURATION; t += step) out.push(loaderFrame(t));
  return out;
};

describe('the boot loader timeline', () => {
  it('is under a second, start to finish — the owner’s rule', () => {
    expect(LOADER_DURATION).toBeLessThan(1000);
    expect(LOADER_DURATION).toBe(LOADER_TIMING.draw + LOADER_TIMING.settle + LOADER_TIMING.hold);
  });

  it('draws the hairline first, then settles Wobo in, then rests', () => {
    expect(loaderFrame(0).phase).toBe('drawing');
    expect(loaderFrame(LOADER_TIMING.draw - 1).phase).toBe('drawing');
    expect(loaderFrame(LOADER_TIMING.draw).phase).toBe('settling');
    expect(loaderFrame(LOADER_TIMING.draw + LOADER_TIMING.settle - 1).phase).toBe('settling');
    expect(loaderFrame(LOADER_TIMING.draw + LOADER_TIMING.settle).phase).toBe('resting');
  });

  it('reports done exactly once the whole loader has run, and never before', () => {
    expect(loaderFrame(0).done).toBe(false);
    expect(loaderFrame(LOADER_DURATION - 1).done).toBe(false);
    expect(loaderFrame(LOADER_DURATION).done).toBe(true);
    expect(loaderFrame(LOADER_DURATION * 5).done).toBe(true);
  });

  it('draws the line from nothing to whole, and never backwards', () => {
    expect(loaderFrame(0).line).toBe(0);
    let last = -1;
    for (const f of sample()) {
      expect(f.line).toBeGreaterThanOrEqual(last);
      last = f.line;
    }
    expect(loaderFrame(LOADER_TIMING.draw).line).toBe(1);
  });

  it('runs the pen along the line it is drawing, and takes it away afterwards', () => {
    const mid = loaderFrame(LOADER_TIMING.draw / 2);
    expect(mid.pen).not.toBeNull();
    expect(mid.pen?.y).toBe(LOADER_VIEW.lineY);
    expect(mid.pen?.x).toBeGreaterThan(LOADER_VIEW.lineFrom);
    expect(mid.pen?.x).toBeLessThan(LOADER_VIEW.lineTo);
    // It lifts up and away as Wobo takes its place, and is gone by the time Wobo is at rest.
    const lifting = loaderFrame(LOADER_TIMING.draw + LOADER_TIMING.settle / 2);
    expect(lifting.pen?.y).toBeLessThan(LOADER_VIEW.lineY);
    expect(lifting.penOpacity).toBeLessThan(1);
    expect(loaderFrame(LOADER_DURATION).pen).toBeNull();
    expect(loaderFrame(LOADER_DURATION).penOpacity).toBe(0);
  });

  it('keeps Wobo out of it until the line exists', () => {
    for (let t = 0; t < LOADER_TIMING.draw; t += 5) {
      expect(loaderFrame(t).orb).toBe(0);
      expect(loaderFrame(t).orbOpacity).toBe(0);
    }
  });

  it('settles Wobo in with one overshoot and comes to rest at exactly one', () => {
    const peak = Math.max(...sample().map((f) => f.orb));
    expect(peak).toBeCloseTo(LOADER_OVERSHOOT, 3);
    expect(LOADER_OVERSHOOT).toBeGreaterThan(1);
    expect(loaderFrame(LOADER_DURATION).orb).toBeCloseTo(1, 6);
    // One overshoot, not a wobble: the curve crosses 1 on the way up exactly once.
    const crossings = sample().reduce((count, f, i, all) => {
      const prev = all[i - 1];
      return prev && prev.orb < 1 && f.orb >= 1 ? count + 1 : count;
    }, 0);
    expect(crossings).toBe(1);
  });

  it('never paints anything outside its own opacity range', () => {
    for (const f of sample()) {
      for (const v of [f.line, f.penOpacity, f.orbOpacity]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it('treats a nonsense clock as the very beginning rather than throwing', () => {
    expect(loaderFrame(-500).phase).toBe('drawing');
    expect(loaderFrame(Number.NaN).phase).toBe('drawing');
    expect(loaderFrame(Number.POSITIVE_INFINITY).phase).toBe('drawing');
  });
});

describe('the reduced-motion loader', () => {
  it('is the finished picture, at once — the same composition without the arrival', () => {
    const rest = loaderRestFrame();
    expect(rest).toEqual({
      phase: 'resting',
      line: 1,
      pen: null,
      penOpacity: 0,
      orb: 1,
      orbOpacity: 1,
      done: true,
    });
  });

  it('matches the last frame of the animated one, so nothing jumps at the handover', () => {
    const end = loaderFrame(LOADER_DURATION);
    const rest = loaderRestFrame();
    expect(end.line).toBe(rest.line);
    expect(end.orb).toBeCloseTo(rest.orb, 6);
    expect(end.pen).toBe(rest.pen);
    expect(end.done).toBe(rest.done);
  });
});

describe('drawing the hairline', () => {
  it('offsets a full dash to hide the line, and none of it to show the whole line', () => {
    const length = LOADER_VIEW.lineTo - LOADER_VIEW.lineFrom;
    expect(loaderDash(0)).toEqual({ array: length, offset: length });
    expect(loaderDash(1)).toEqual({ array: length, offset: 0 });
    expect(loaderDash(0.5).offset).toBeCloseTo(length / 2, 6);
  });

  it('clamps rather than letting a bad progress value draw a negative dash', () => {
    expect(loaderDash(-3).offset).toBe(LOADER_VIEW.lineTo - LOADER_VIEW.lineFrom);
    expect(loaderDash(9).offset).toBe(0);
  });
});

describe('where the loader puts things', () => {
  it('centres Wobo on the line Wobo just drew', () => {
    expect(LOADER_VIEW.woboX as number).toBe(LOADER_VIEW.width / 2);
    expect(LOADER_VIEW.woboY as number).toBe(LOADER_VIEW.lineY as number);
    expect(LOADER_VIEW.lineFrom).toBeLessThan(LOADER_VIEW.lineTo);
    expect(LOADER_VIEW.lineTo).toBeLessThan(LOADER_VIEW.width);
  });
});
