'use client';

/**
 * Wobo's voice — a live conversation through the gateway relay (DESIGN.md §4). The browser streams
 * 16 kHz PCM16 up the gateway websocket; her 24 kHz PCM replies play back with minimal buffering.
 * No key, no model and no limit ever reaches the client: the relay is gated by a single-use token
 * the gateway mints for this learner, and without one the hook resolves to 'unavailable', silently.
 */

import { mintVoiceToken, voiceSocketUrl } from '@classess/sdk';
import type { WoboMood } from '@classess/wobo';
import { useCallback, useEffect, useRef, useState } from 'react';

export type VoiceStatus = 'unavailable' | 'idle' | 'connecting' | 'listening' | 'speaking';

/**
 * What a start attempt landed on. 'cancelled' is its own answer: the learner let go of the orb
 * before the session was up, so nothing is wrong and nothing should be said about it — an
 * apologetic "allow microphone access" for a half-second hold is a lie.
 */
export type VoiceOutcome = VoiceStatus | 'cancelled';

export interface WoboVoice {
  status: VoiceStatus;
  /** Resolves to the outcome the attempt landed on ('listening' when voice is live). */
  start: () => Promise<VoiceOutcome>;
  /** Push-to-talk release: stop capturing the learner and tell the brain the utterance ended, but
   *  keep the session alive so her spoken reply streams back — then close when she finishes (or a
   *  safety timeout fires). The one end-of-utterance seam; plain stop() cuts her off mid-word. */
  finishTurn: () => void;
  stop: () => void;
}

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL as string | undefined;

/** The relay frames we care about: her audio, transcripts, and control signals. */
interface LiveServerMessage {
  serverContent?: {
    interrupted?: boolean;
    turnComplete?: boolean;
    inputTranscription?: { text?: string };
    outputTranscription?: { text?: string };
    modelTurn?: { parts?: { inlineData?: { data?: string } }[] };
  };
}

function pcm16Base64(samples: Float32Array): string {
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i] as number));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(pcm.buffer);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i] as number);
  return btoa(bin);
}

/** Linear-resample a mono chunk to 16 kHz PCM input. Identity when already 16 kHz (Chrome). */
function resampleTo16k(input: Float32Array, inRate: number): Float32Array {
  if (inRate === 16000) return input;
  const ratio = inRate / 16000;
  const outLen = Math.max(1, Math.round(input.length / ratio));
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const src = i * ratio;
    const i0 = Math.floor(src);
    const i1 = Math.min(input.length - 1, i0 + 1);
    const frac = src - i0;
    out[i] = (input[i0] as number) * (1 - frac) + (input[i1] as number) * frac;
  }
  return out;
}

export function base64ToFloat32(b64: string): Float32Array<ArrayBuffer> {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const pcm = new Int16Array(bytes.buffer);
  const out = new Float32Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) out[i] = (pcm[i] as number) / 0x8000;
  return out;
}

/** Stop every track on a stream — the one thing that actually closes the mic indicator. */
function releaseMic(stream: MediaStream): void {
  for (const track of stream.getTracks()) track.stop();
}

export type VoiceAcquisition =
  | { status: 'ok'; stream: MediaStream; token: string }
  | { status: 'cancelled' }
  | { status: 'idle' }
  | { status: 'unavailable' };

/**
 * Open the mic, then mint the relay token — in that order, because the permission prompt can sit
 * for many seconds and a token minted before it would expire in the gap.
 *
 * Both steps are awaits, and a push-to-talk hold can end during either one. `stale()` is checked
 * after each: if the learner has already let go, the mic is released here and the caller is told
 * 'cancelled', so a short hold can never leave the microphone streaming into a session nobody is
 * waiting for. Extracted from the hook so exactly this race can be tested.
 */
export async function acquireVoiceSession(deps: {
  stale: () => boolean;
  mic: () => Promise<MediaStream>;
  mintToken: () => Promise<{ mode?: string; token?: string } | null>;
}): Promise<VoiceAcquisition> {
  let stream: MediaStream;
  try {
    stream = await deps.mic();
  } catch {
    // Declined, or torn down mid-prompt. A cancelled hold says nothing; a real refusal says so.
    return deps.stale() ? { status: 'cancelled' } : { status: 'idle' };
  }
  if (deps.stale()) {
    releaseMic(stream);
    return { status: 'cancelled' };
  }
  let session: { mode?: string; token?: string } | null = null;
  try {
    session = await deps.mintToken();
  } catch {
    session = null; // absent gateway — degrade silently
  }
  if (deps.stale()) {
    releaseMic(stream);
    return { status: 'cancelled' };
  }
  if (session?.mode !== 'relay' || !session.token) {
    releaseMic(stream);
    return { status: 'unavailable' };
  }
  return { status: 'ok', stream, token: session.token };
}

interface LiveSession {
  ws: WebSocket;
  stream: MediaStream;
  capture: AudioContext;
  playback: AudioContext;
  sources: Set<AudioBufferSourceNode>;
  playhead: number;
  source: MediaStreamAudioSourceNode;
  processor: ScriptProcessorNode;
  /** After a push-to-talk release: capture is closed, we are only awaiting her reply. */
  finishing: boolean;
  /** Any audio played back this session — so an empty push-to-talk hold doesn't hang on the timeout. */
  spoke: boolean;
  /** Accumulated transcripts for the current turn, flushed on turnComplete / close. */
  inTxt: string;
  outTxt: string;
  safety?: ReturnType<typeof setTimeout>;
}

export function useWoboVoice(options?: {
  setMood?: (mood: WoboMood) => void;
  /** A spoken turn, once transcribed — the caller lands it in the one chat archive. */
  onTranscript?: (turn: { role: 'user' | 'wobo'; text: string }) => void;
}): WoboVoice {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const setMood = options?.setMood;
  // Held in a ref so start/stop/message closures see the latest callback without churning identity.
  const opts = useRef(options);
  opts.current = options;
  const live = useRef<LiveSession | null>(null);
  // The turn epoch. Every start() takes a number; stop() and finishTurn() bump it. Anything that
  // comes back from an await belonging to a superseded epoch tears itself down instead of landing —
  // this is what keeps a half-second push-to-talk hold from leaving the microphone open.
  const epoch = useRef(0);

  const flush = useCallback((l: LiveSession) => {
    const i = l.inTxt.trim();
    const o = l.outTxt.trim();
    l.inTxt = '';
    l.outTxt = '';
    if (i) opts.current?.onTranscript?.({ role: 'user', text: i });
    if (o) opts.current?.onTranscript?.({ role: 'wobo', text: o });
  }, []);

  const stop = useCallback(() => {
    epoch.current++; // any start() still in flight is now stale and will tear itself down
    const l = live.current;
    live.current = null;
    if (l) {
      if (l.safety) clearTimeout(l.safety);
      flush(l); // persist any un-flushed words before the session tears down
      l.ws.onclose = null;
      l.ws.onerror = null;
      l.ws.close();
      for (const t of l.stream.getTracks()) t.stop();
      for (const s of l.sources) s.stop();
      void l.capture.close();
      void l.playback.close();
      setStatus('idle');
      setMood?.('idle');
    }
  }, [setMood, flush]);

  // Never leave the mic open past unmount.
  useEffect(() => stop, [stop]);

  const start = useCallback(async (): Promise<VoiceOutcome> => {
    if (live.current) return 'listening';
    if (!GATEWAY_URL) {
      setStatus('unavailable');
      return 'unavailable';
    }
    const mine = ++epoch.current;
    const stale = () => epoch.current !== mine;
    const gateway = GATEWAY_URL;
    setStatus('connecting');

    // Mic first, then the token (see acquireVoiceSession) — and a hold that ends during either
    // await comes back 'cancelled' with the microphone already released.
    const acquired = await acquireVoiceSession({
      stale,
      mic: () =>
        navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        }),
      // Identity is proved over authenticated HTTP; the socket carries the single-use token it mints.
      mintToken: () => mintVoiceToken(gateway),
    });
    if (acquired.status !== 'ok') {
      if (stale() || acquired.status === 'cancelled') {
        // The learner let go before she was up. Nothing happened, so nothing is announced.
        setStatus('idle');
        return 'cancelled';
      }
      setStatus(acquired.status); // 'idle' = mic declined; 'unavailable' = no voice right now
      return acquired.status;
    }
    const { stream, token } = acquired;

    // Do NOT force 16 kHz: Safari/iOS silently ignore the hint and hand back 44.1/48 kHz, so we
    // read the real capture rate below and resample every chunk to the rate the relay expects.
    const capture = new AudioContext();
    const playback = new AudioContext({ sampleRate: 24000 });
    // A user gesture opened this call, but Safari still starts contexts suspended.
    await capture.resume().catch(() => {});
    await playback.resume().catch(() => {});
    // Last gate before anything becomes the live session: tear the whole apparatus down here, while
    // it is still local, rather than assigning live.current to a session nobody is waiting for.
    if (stale()) {
      releaseMic(stream);
      void capture.close();
      void playback.close();
      setStatus('idle');
      return 'cancelled';
    }

    // The session-minted single-use token gates the relay (never the raw key, never open).
    const ws = new WebSocket(voiceSocketUrl(gateway, '/v1/voice/relay', token));
    // ponytail: ScriptProcessor over an AudioWorklet — one file, ~64 ms chunks; swap in a
    // worklet module if capture jitter ever becomes audible.
    const source = capture.createMediaStreamSource(stream);
    const processor = capture.createScriptProcessor(1024, 1, 1);
    const state: LiveSession = {
      ws,
      stream,
      capture,
      playback,
      sources: new Set(),
      playhead: 0,
      source,
      processor,
      finishing: false,
      spoke: false,
      inTxt: '',
      outTxt: '',
    };
    live.current = state;

    const inRate = capture.sampleRate; // 16000 on Chrome, 44100/48000 on Safari
    processor.onaudioprocess = (e) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            realtimeInput: {
              audio: {
                data: pcm16Base64(resampleTo16k(e.inputBuffer.getChannelData(0), inRate)),
                mimeType: 'audio/pcm;rate=16000',
              },
            },
          }),
        );
      }
    };
    source.connect(processor);
    const mute = capture.createGain();
    mute.gain.value = 0;
    processor.connect(mute).connect(capture.destination);

    const playChunk = (b64: string) => {
      const data = base64ToFloat32(b64);
      if (data.length === 0 || live.current !== state) return;
      const buf = playback.createBuffer(1, data.length, 24000);
      buf.copyToChannel(data, 0);
      const node = playback.createBufferSource();
      node.buffer = buf;
      node.connect(playback.destination);
      state.playhead = Math.max(state.playhead, playback.currentTime + 0.02);
      node.start(state.playhead);
      state.playhead += buf.duration;
      state.sources.add(node);
      state.spoke = true;
      setStatus('speaking');
      setMood?.('explaining');
      node.onended = () => {
        state.sources.delete(node);
        if (state.sources.size === 0 && live.current === state) {
          // Push-to-talk: her reply has finished playing, so close the session cleanly.
          if (state.finishing) {
            stop();
            return;
          }
          setStatus('listening');
          setMood?.('listening');
        }
      };
    };

    const onServerMessage = (raw: string) => {
      let msg: LiveServerMessage;
      try {
        msg = JSON.parse(raw) as LiveServerMessage;
      } catch {
        return;
      }
      const content = msg.serverContent;
      if (content?.interrupted) {
        for (const s of state.sources) s.stop();
        state.sources.clear();
        state.playhead = 0;
        if (live.current === state) {
          setStatus('listening');
          setMood?.('listening');
        }
        return;
      }
      // Transcripts stream in incrementally; accumulate, then flush the pair on turnComplete.
      if (content?.inputTranscription?.text) state.inTxt += content.inputTranscription.text;
      if (content?.outputTranscription?.text) state.outTxt += content.outputTranscription.text;
      // Audio first, so `spoke` is set before the empty-turn check (a message can carry both).
      for (const part of content?.modelTurn?.parts ?? []) {
        const data = part.inlineData?.data;
        if (typeof data === 'string') playChunk(data);
      }
      if (content?.turnComplete) {
        const heardNothing = state.inTxt.trim() === '';
        flush(state);
        // Empty push-to-talk hold — a mic mis-tap that captured only silence, and she has no reply
        // to stream. Close gracefully now instead of leaving her hanging until the 12s safety timeout.
        if (state.finishing && heardNothing && !state.spoke) stop();
      }
    };

    ws.onmessage = (e) => {
      if (typeof e.data === 'string') onServerMessage(e.data);
      else if (e.data instanceof Blob) void e.data.text().then(onServerMessage);
    };
    ws.onclose = () => {
      if (live.current === state) stop();
    };
    ws.onerror = () => {
      if (live.current === state) stop();
    };

    setStatus('listening');
    setMood?.('listening');
    return 'listening';
  }, [setMood, stop, flush]);

  const finishTurn = useCallback(() => {
    // Bump first, always: a release that lands before the session is up must cancel the start that
    // is still in flight — otherwise the mic opens for a hold that is already over.
    epoch.current++;
    const l = live.current;
    if (!l || l.finishing) return;
    l.finishing = true;
    // Stop capturing the moment she lets go — nothing said after release should leave the device.
    try {
      l.source.disconnect();
      l.processor.disconnect();
    } catch {
      // already torn down — nothing to do
    }
    for (const t of l.stream.getTracks()) t.stop();
    // Signal end-of-utterance so the reply finalizes (automatic voice detection flushes on this).
    // ponytail: automatic detection + audioStreamEnd — good enough for hold-to-talk. Switch to
    // manual activity markers only if background noise triggers premature replies (needs a relay
    // config change that would break the open-mic callers, so left alone).
    if (l.ws.readyState === WebSocket.OPEN) {
      l.ws.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }));
    }
    // If she never replies (keyless/quota 502), the session must still close on its own.
    l.safety = setTimeout(() => {
      if (live.current === l) stop();
    }, 12000);
  }, [stop]);

  return { status, start, finishTurn, stop };
}
