import { describe, expect, it } from 'bun:test';
import { acquireVoiceSession } from './voice';

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

describe('the push-to-talk race — a hold that ends before she is up', () => {
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
