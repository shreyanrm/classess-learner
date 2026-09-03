import { describe, expect, it } from 'bun:test';
import { acquireVoiceSession, bargeIn, readServerFrame } from './voice';

/** A microphone stream that reports whether it was actually released. */
function fakeStream(): MediaStream & { stopped: boolean } {
  const stream = {
    stopped: false,
    getTracks: () => [{ stop: () => (stream.stopped = true) }],
  };
  return stream as unknown as MediaStream & { stopped: boolean };
}

const later = <T>(value: T): Promise<T> => Promise.resolve().then(() => value);
const relay = { mode: 'relay', token: 'tok-1' };

describe('the push-to-talk race — a hold that ends before Wobo is up', () => {
  it('releases the microphone and reports cancelled when the hold ends during the prompt', async () => {
    const stream = fakeStream();
    let released = false; // the learner let go while getUserMedia was still pending
    const out = await acquireVoiceSession({
      stale: () => released,
      mic: async () => {
        released = true;
        return stream;
      },
      mintToken: async () => {
        throw new Error('must not mint a token for a hold that is already over');
      },
    });
    expect(out.status).toBe('cancelled');
    expect(stream.stopped).toBe(true);
  });

  it('releases the microphone when the hold ends while the token is being minted', async () => {
    const stream = fakeStream();
    let released = false;
    const out = await acquireVoiceSession({
      stale: () => released,
      mic: () => later(stream),
      mintToken: async () => {
        released = true;
        return relay;
      },
    });
    expect(out.status).toBe('cancelled');
    expect(stream.stopped).toBe(true);
  });

  it('a cancelled hold is not a permission refusal — the two are told apart', async () => {
    const denied = await acquireVoiceSession({
      stale: () => false,
      mic: async () => {
        throw new Error('NotAllowedError');
      },
      mintToken: async () => relay,
    });
    expect(denied.status).toBe('idle'); // a real refusal: the app may ask for the microphone

    const cancelled = await acquireVoiceSession({
      stale: () => true,
      mic: async () => {
        throw new Error('aborted by teardown');
      },
      mintToken: async () => relay,
    });
    expect(cancelled.status).toBe('cancelled'); // a short hold says nothing at all
  });
});

describe('the acquisition order and its refusals', () => {
  it('opens the microphone first, then mints — never the other way round', async () => {
    const order: string[] = [];
    const out = await acquireVoiceSession({
      stale: () => false,
      mic: async () => {
        order.push('mic');
        return fakeStream();
      },
      mintToken: async () => {
        order.push('token');
        return relay;
      },
    });
    expect(order).toEqual(['mic', 'token']);
    expect(out).toMatchObject({ status: 'ok', token: 'tok-1' });
  });

  it('no token, no session — and the microphone does not stay open', async () => {
    const stream = fakeStream();
    const out = await acquireVoiceSession({
      stale: () => false,
      mic: () => later(stream),
      mintToken: async () => null, // refused, or no gateway at all
    });
    expect(out.status).toBe('unavailable');
    expect(stream.stopped).toBe(true);
  });

  it('a mint that throws degrades to unavailable, with the microphone released', async () => {
    const stream = fakeStream();
    const out = await acquireVoiceSession({
      stale: () => false,
      mic: () => later(stream),
      mintToken: async () => {
        throw new Error('offline');
      },
    });
    expect(out.status).toBe('unavailable');
    expect(stream.stopped).toBe(true);
  });
});

/**
 * Barge-in by voice (BOARD.md §4). The relay says `interrupted` the moment the learner talks over
 * Wobo; the client used to stop only Wobo's audio sources, so the pen kept drawing a plan nobody
 * was listening to and the object Wobo was cut off on never reached the brain.
 */
describe('the learner speaks over Wobo', () => {
  const audio = () => {
    const stopped: string[] = [];
    const sources = new Set([{ stop: () => stopped.push('a') }, { stop: () => stopped.push('b') }]);
    return { stopped, state: { sources, playhead: 4.25 } };
  };

  it('lifts the pen with the voice — one interruption, both halves', () => {
    const { stopped, state } = audio();
    let lifted = 0;
    bargeIn(state, { interrupt: () => lifted++ });
    expect(stopped).toEqual(['a', 'b']); // Wobo stops mid-sentence
    expect(state.sources.size).toBe(0);
    expect(state.playhead).toBe(0);
    expect(lifted).toBe(1); // …and the hand stops mid-stroke on the same beat
  });

  it('is what the relay frame actually reaches — not a function nobody calls', () => {
    const seen: string[] = [];
    const sink = {
      interrupted: () => seen.push('interrupted'),
      audio: (b64: string) => seen.push(`audio:${b64}`),
      heard: (t: string) => seen.push(`heard:${t}`),
      said: (t: string) => seen.push(`said:${t}`),
      turnComplete: () => seen.push('done'),
    };
    readServerFrame(JSON.stringify({ serverContent: { interrupted: true } }), sink);
    expect(seen).toEqual(['interrupted']);
  });

  it('an interrupted frame stops there — no audio, no transcript, no turn close', () => {
    const seen: string[] = [];
    readServerFrame(
      JSON.stringify({
        serverContent: {
          interrupted: true,
          turnComplete: true,
          outputTranscription: { text: 'a sentence Wobo never finished' },
          modelTurn: { parts: [{ inlineData: { data: 'AAAA' } }] },
        },
      }),
      {
        interrupted: () => seen.push('interrupted'),
        audio: () => seen.push('audio'),
        heard: () => seen.push('heard'),
        said: () => seen.push('said'),
        turnComplete: () => seen.push('done'),
      },
    );
    expect(seen).toEqual(['interrupted']);
  });

  it('an ordinary frame still carries the words, then the audio, then the close', () => {
    const seen: string[] = [];
    readServerFrame(
      JSON.stringify({
        serverContent: {
          inputTranscription: { text: 'why' },
          outputTranscription: { text: 'because' },
          modelTurn: { parts: [{ inlineData: { data: 'BBBB' } }] },
          turnComplete: true,
        },
      }),
      {
        interrupted: () => seen.push('interrupted'),
        audio: (b64: string) => seen.push(`audio:${b64}`),
        heard: (t: string) => seen.push(`heard:${t}`),
        said: (t: string) => seen.push(`said:${t}`),
        turnComplete: () => seen.push('done'),
      },
    );
    expect(seen).toEqual(['heard:why', 'said:because', 'audio:BBBB', 'done']);
  });

  it('rubbish on the wire means nothing — it is dropped, never guessed at', () => {
    let touched = 0;
    const sink = {
      interrupted: () => touched++,
      audio: () => touched++,
      heard: () => touched++,
      said: () => touched++,
      turnComplete: () => touched++,
    };
    readServerFrame('not json at all', sink);
    readServerFrame(JSON.stringify({ setupComplete: {} }), sink);
    expect(touched).toBe(0);
  });
});
