import { beforeEach, describe, expect, it } from 'bun:test';
import { describeFramePart, frameSurfaceId, holdFilm, isFramePartId, videoHandoff } from './video';

describe('the parts of a paused frame', () => {
  it('names a machine id in words a person reads', () => {
    expect(describeFramePart('velocity-arrow', undefined, 0)).toBe('velocity arrow');
    expect(describeFramePart('apexPoint', undefined, 0)).toBe('apex point');
  });

  it('carries the frame own sentence, so the brain knows what it is looking at', () => {
    expect(describeFramePart('arrow', 'at the top the ball is still moving', 0)).toBe(
      'arrow, in the frame: at the top the ball is still moving',
    );
  });

  it('falls back to a position when the id says nothing', () => {
    expect(describeFramePart('42', undefined, 2)).toBe('part 3');
  });

  it('takes only ids we could have authored — never a defs entry or a generated hash', () => {
    expect(isFramePartId('velocity-arrow')).toBe(true);
    expect(isFramePartId('clipPath1')).toBe(false);
    expect(isFramePartId('gradient-a')).toBe(false);
    expect(isFramePartId('maskA')).toBe(false);
    expect(isFramePartId('')).toBe(false);
    expect(isFramePartId('3d-thing')).toBe(false); // must start with a letter
  });

  it('gives a film its own surface id', () => {
    expect(frameSurfaceId('motion-7')).toBe('frame:motion-7');
  });
});

describe('the handoff back to the film', () => {
  beforeEach(() => videoHandoff.release(videoHandoff.get().playerId ?? ''));

  it('holds the paused position and puts the learner back on it, to the millisecond', () => {
    let returnedTo = -1;
    videoHandoff.hold('motion-7', 4321, (at) => {
      returnedTo = at;
    });
    expect(videoHandoff.waiting()).toBe(true);
    expect(videoHandoff.returnToFrame()).toBe(true);
    expect(returnedTo).toBe(4321);
  });

  it('releases when the film plays again — nothing stale is ever returned to', () => {
    videoHandoff.hold('motion-7', 100, () => {});
    videoHandoff.release('motion-7');
    expect(videoHandoff.waiting()).toBe(false);
    expect(videoHandoff.returnToFrame()).toBe(false);
  });

  it('ignores a release from a film that is not the one being held', () => {
    videoHandoff.hold('motion-7', 100, () => {});
    videoHandoff.release('motion-9');
    expect(videoHandoff.waiting()).toBe(true);
  });
});

/**
 * A baked MP4 is a different transport from the live scene player: the position lives in the
 * element's own `currentTime`, in seconds, and the only way back to it is to set that. The film
 * branch used to be handed the scene player's resume, which moved a SMIL beat index — so "back to
 * the film" returned the learner to a scrubber the film does not have while the video played on.
 */
describe('the handoff back to a baked film', () => {
  beforeEach(() => videoHandoff.release(videoHandoff.get().playerId ?? ''));

  it("puts the learner back by the video's own clock, in seconds", () => {
    const film = { currentTime: 42.5 };
    holdFilm('film-1', () => film, { title: 'photosynthesis' });
    expect(videoHandoff.get()).toEqual({
      playerId: 'film-1',
      atMs: 42500,
      title: 'photosynthesis',
    });

    film.currentTime = 0; // the learner wandered off, and something reset the element
    expect(videoHandoff.returnToFrame()).toBe(true);
    expect(film.currentTime).toBe(42.5); // …and is put back to the millisecond
  });

  it('reads the position off the element when it is not told one', () => {
    holdFilm('film-2', () => ({ currentTime: 3.25 }));
    expect(videoHandoff.get().atMs).toBe(3250);
  });

  it('asks for the element at resume time, not at hold time — the player can re-render under it', () => {
    let film: { currentTime: number } | null = null;
    holdFilm('film-3', () => film, { atMs: 9000 });
    film = { currentTime: 0 }; // the <video> mounts (or remounts) after the hold was taken
    expect(videoHandoff.returnToFrame()).toBe(true);
    expect(film.currentTime).toBe(9);
  });

  it('a film that has gone is not a crash — there is simply nothing to put back', () => {
    holdFilm('film-4', () => null, { atMs: 1000 });
    expect(videoHandoff.returnToFrame()).toBe(true);
    expect(videoHandoff.get().playerId).toBe('film-4');
  });
});
