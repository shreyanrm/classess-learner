import { beforeEach, describe, expect, it } from 'bun:test';
import {
  holdToTalkEnd,
  holdToTalkReady,
  holdToTalkStart,
  registerHoldToTalk,
  resetHoldToTalk,
} from './hold';

/** Wobo's docked body, as far as the hotkey is concerned: a microphone with two beats. */
function fakeBody() {
  const voice = { started: 0, finished: 0 };
  const unregister = registerHoldToTalk({
    start: () => {
      voice.started++;
    },
    end: () => {
      voice.finished++;
    },
  });
  return { voice, unregister };
}

beforeEach(resetHoldToTalk);

/**
 * WOBO-TASKS §5.9: "push-to-talk on the orb AND a desktop hotkey". The chord is caught by the
 * gesture layer on the stage, which owns no microphone — so the hotkey could only ever set the
 * listening face, and every keyboard hold was a pantomime of a session that never opened.
 */
describe('the desktop hotkey is push-to-talk, not a face', () => {
  it('opens and closes the same voice session Wobo body does', () => {
    const { voice } = fakeBody();
    expect(holdToTalkReady()).toBe(true);
    expect(holdToTalkStart()).toBe(true);
    expect(voice.started).toBe(1);
    expect(holdToTalkEnd()).toBe(true);
    expect(voice.finished).toBe(1);
  });

  it('says so when there is no Wobo on screen to take the hold', () => {
    expect(holdToTalkReady()).toBe(false);
    // The caller is told, so it can keep its own behaviour rather than pretend a mic opened.
    expect(holdToTalkStart()).toBe(false);
    expect(holdToTalkEnd()).toBe(false);
  });

  it('an unmounted body takes no more holds — the hotkey never reaches a dead session', () => {
    const { voice, unregister } = fakeBody();
    unregister();
    expect(holdToTalkStart()).toBe(false);
    expect(voice.started).toBe(0);
  });

  it('the newest mount is the live one, and unregistering the old one does not disarm it', () => {
    const first = fakeBody();
    const second = fakeBody();
    holdToTalkStart();
    expect(second.voice.started).toBe(1);
    expect(first.voice.started).toBe(0);
    // The old body tears down after the new one mounted; the hotkey still reaches the live session.
    first.unregister();
    holdToTalkStart();
    expect(second.voice.started).toBe(2);
  });
});
