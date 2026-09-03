/**
 * The score, checked.
 *
 * These are the beats a reader actually experiences — which line is on screen, whether the proof
 * has finished drawing before it is talked about, whether the board is up before the pen starts.
 * They are the kind of thing that breaks silently when a tween is nudged, and are invisible in a
 * screenshot, so they are pinned here rather than eyeballed.
 */

import { describe, expect, it } from 'bun:test';
import {
  boardReveal,
  captionAt,
  captionOpacity,
  entered,
  flapOpen,
  letterRise,
  NIGHT_BOARD_IN,
  NIGHT_CAPTIONS,
  NIGHT_DRAW,
  NIGHT_TOTAL,
  nextBeat,
  nightDrawAmount,
  pinProgress,
  power2InOut,
  power2Out,
  SUNDAY_TOTAL,
  sceneOpacity,
  sceneScale,
  startAt,
} from './choreography';

describe('pinProgress', () => {
  it('is 0 at the moment the chapter pins and 1 when it releases', () => {
    expect(pinProgress(1000, 1000, 4200)).toBe(0);
    expect(pinProgress(3100, 1000, 4200)).toBeCloseTo(0.5);
    expect(pinProgress(5200, 1000, 4200)).toBe(1);
  });

  it('clamps outside the pin rather than running the timeline backwards', () => {
    expect(pinProgress(0, 1000, 4200)).toBe(0);
    expect(pinProgress(99999, 1000, 4200)).toBe(1);
  });

  it('reads a chapter with no scrub distance as finished', () => {
    expect(pinProgress(0, 0, 0)).toBe(1);
  });
});

describe('the night captions', () => {
  it('hands over one line at a time — two are never on screen together', () => {
    for (let t = 0; t <= NIGHT_TOTAL; t += 0.02) {
      const lit = NIGHT_CAPTIONS.filter((caption) => captionOpacity(t, caption) > 0);
      expect(lit.length).toBeLessThanOrEqual(1);
    }
  });

  it('opens on nothing and closes holding "9:46 pm. Oh."', () => {
    expect(captionAt(0)).toBeNull();
    expect(captionAt(NIGHT_TOTAL)).toBe('c4');
  });

  it('runs the four beats in order', () => {
    expect(captionAt(0.5)).toBe('c1');
    expect(captionAt(2.0)).toBe('c2');
    expect(captionAt(4.0)).toBe('c3');
    expect(captionAt(5.9)).toBe('c4');
  });

  it('fades a caption in over the fade rather than cutting to it', () => {
    const first = NIGHT_CAPTIONS[0];
    if (!first) throw new Error('the night chapter lost its first caption');
    expect(captionOpacity(first.in, first)).toBe(0);
    expect(captionOpacity(first.in + 0.15, first)).toBeCloseTo(0.5);
    expect(captionOpacity(first.in + 0.3, first)).toBe(1);
  });
});

describe('the night drawing', () => {
  it('starts once the board is up', () => {
    expect(boardReveal(NIGHT_BOARD_IN.at)).toBe(0);
    expect(boardReveal(NIGHT_DRAW.at)).toBeGreaterThan(0.9);
    expect(nightDrawAmount(NIGHT_DRAW.at)).toBe(0);
  });

  it('is finished before the chapter releases', () => {
    expect(nightDrawAmount(NIGHT_DRAW.at + NIGHT_DRAW.duration)).toBeCloseTo(1);
    expect(nightDrawAmount(NIGHT_TOTAL)).toBe(1);
  });

  it('is all but complete as the last caption arrives', () => {
    const last = NIGHT_CAPTIONS[NIGHT_CAPTIONS.length - 1];
    if (!last) throw new Error('the night chapter lost its last caption');
    expect(nightDrawAmount(last.in)).toBeGreaterThan(0.9);
  });
});

describe('the camera', () => {
  it('settles from its opening frame, holds, then pushes into the phone', () => {
    expect(sceneScale(0)).toBeCloseTo(1.06);
    expect(sceneScale(1)).toBeCloseTo(1);
    expect(sceneScale(2.0)).toBeCloseTo(1);
    expect(sceneScale(2.5)).toBeGreaterThan(1);
    expect(sceneScale(3.0)).toBeCloseTo(2.6);
  });

  it('hands the frame to the board', () => {
    expect(sceneOpacity(2.8)).toBe(1);
    expect(sceneOpacity(3.2)).toBe(0);
    expect(boardReveal(3.8)).toBe(1);
  });
});

describe('the easings', () => {
  it('power2.out leaves fast and lands soft', () => {
    expect(power2Out(0)).toBe(0);
    expect(power2Out(1)).toBe(1);
    expect(power2Out(0.5)).toBeCloseTo(0.75);
  });

  it('power2.inOut is symmetric about its middle', () => {
    expect(power2InOut(0)).toBe(0);
    expect(power2InOut(0.5)).toBeCloseTo(0.5);
    expect(power2InOut(1)).toBe(1);
    expect(power2InOut(0.25)).toBeCloseTo(1 - power2InOut(0.75));
  });
});

describe('the Sunday note', () => {
  it('opens the flap before the letter is out', () => {
    expect(flapOpen(0.9)).toBe(0);
    expect(flapOpen(1.4)).toBeCloseTo(1);
    expect(letterRise(1.1)).toBe(0);
    expect(letterRise(2.3)).toBeCloseTo(1);
  });

  it('holds the note after the letter has risen', () => {
    expect(SUNDAY_TOTAL).toBeGreaterThan(2.3);
  });
});

describe('the entry beats', () => {
  it('writes GSAP starts from the fractions rather than the other way round', () => {
    expect(startAt(0.72)).toBe('top 72%');
    expect(startAt(0.78)).toBe('top 78%');
  });

  it('fires as the top crosses the trigger line', () => {
    expect(entered(800, 1000, 0.72)).toBe(false);
    expect(entered(720, 1000, 0.72)).toBe(true);
    expect(entered(0, 0, 0.72)).toBe(true);
  });

  it('keeps the beat it had when nothing is intersecting', () => {
    expect(nextBeat('night', [{ id: 'night', visible: false }])).toBe('night');
    expect(nextBeat('night', [{ id: 'sunday', visible: true }])).toBe('sunday');
    expect(nextBeat(null, [])).toBeNull();
  });
});
