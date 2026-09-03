'use client';

/**
 * Push-to-talk, wherever the hold comes from (docs/WOBO-TASKS §5.9: "push-to-talk on the orb **and a
 * desktop hotkey**").
 *
 * There is one microphone and one live voice session, and it belongs to Wobo's docked body — the
 * component that owns the mute law, the halo, the transcript and the session teardown. The desktop
 * hotkey lives somewhere else entirely: it is a chord caught by the gesture layer on the stage,
 * mounted at the root. Without a seam between the two, the hotkey could only do what the stage
 * itself can do — set the listening face — so every real hold on a keyboard was a pointer's hold
 * pantomimed: Wobo looked like Wobo was listening, and no microphone ever opened.
 *
 * This is the seam. Wobo's body registers the hold it already performs; the hotkey asks for it by
 * name. Nothing here holds a stream, a token or a timer — it holds one pair of callbacks, so there
 * is exactly one push-to-talk in the app however many things can start it.
 */

/** A hold someone can perform: the same two beats the orb's press and release already run. */
export interface HoldToTalk {
  /** Open the microphone (mute law, permissions and all) and start listening. */
  start: () => void;
  /** The learner let go: stop capturing, and let Wobo's reply stream back. */
  end: () => void;
}

let holder: HoldToTalk | null = null;

/**
 * Wobo's body offers its hold. Returns the unregister, so an unmount can never leave a hotkey
 * pointing at a voice session that is gone. A second registration wins — there is only ever one
 * docked Wobo on screen, and the newest mount is the live one.
 */
export function registerHoldToTalk(hold: HoldToTalk): () => void {
  holder = hold;
  return () => {
    if (holder === hold) holder = null;
  };
}

/** True while something can actually take a hold — i.e. Wobo's body is on screen. */
export function holdToTalkReady(): boolean {
  return holder !== null;
}

/**
 * Begin a hold. Returns whether one was actually taken: a caller that gets `false` (no docked Wobo
 * on this route) is free to fall back to its own behaviour rather than pretend a session opened.
 */
export function holdToTalkStart(): boolean {
  if (!holder) return false;
  holder.start();
  return true;
}

/** End the hold. Returns whether there was one to end. */
export function holdToTalkEnd(): boolean {
  if (!holder) return false;
  holder.end();
  return true;
}

/** Tests only: forget whatever is registered, so one file's fake body cannot leak into the next. */
export function resetHoldToTalk(): void {
  holder = null;
}
