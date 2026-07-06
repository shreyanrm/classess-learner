'use client';

/**
 * Vidya's voice — Gemini Live through the gateway relay (DESIGN.md §4: voice via the Gemini path).
 * The browser streams 16 kHz PCM16 up the gateway websocket; her 24 kHz PCM replies play back with
 * minimal buffering. No key ever reaches the client — without one the hook resolves to
 * 'unavailable', silently.
 */

import type { VidyaMood } from '@classess/vidya';
import { useCallback, useEffect, useRef, useState } from 'react';

export type VoiceStatus = 'unavailable' | 'idle' | 'connecting' | 'listening' | 'speaking';

export interface VidyaVoice {
  status: VoiceStatus;
  /** Resolves to the status the attempt landed on ('listening' when voice is live). */
  start: () => Promise<VoiceStatus>;
  stop: () => void;
}

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL as string | undefined;

/** The Gemini Live server frames we care about: her audio, and the interruption signal. */
interface LiveServerMessage {
  serverContent?: {
    interrupted?: boolean;
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

interface LiveSession {
  ws: WebSocket;
  stream: MediaStream;
  capture: AudioContext;
  playback: AudioContext;
  sources: Set<AudioBufferSourceNode>;
  playhead: number;
}

export function useVidyaVoice(options?: { setMood?: (mood: VidyaMood) => void }): VidyaVoice {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const setMood = options?.setMood;
  const live = useRef<LiveSession | null>(null);

  const stop = useCallback(() => {
    const l = live.current;
    live.current = null;
    if (l) {
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
  }, [setMood]);

  // Never leave the mic open past unmount.
  useEffect(() => stop, [stop]);

  const start = useCallback(async (): Promise<VoiceStatus> => {
    if (live.current) return 'listening';
    if (!GATEWAY_URL) {
      setStatus('unavailable');
      return 'unavailable';
    }
    setStatus('connecting');

    // Mic FIRST: the permission prompt can sit for many seconds, so we must not mint the
    // single-use relay token until after it clears — otherwise the token can expire in the gap
    // and the relay closes 1008 before a word is spoken (the owner's "mic doesn't work").
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch {
      setStatus('idle'); // mic declined — voice stays available for a later yes
      return 'idle';
    }

    let session: { mode?: string; token?: string } = {};
    try {
      session = (await (await fetch(`${GATEWAY_URL}/v1/voice/session`)).json()) as {
        mode?: string;
        token?: string;
      };
    } catch {
      // absent gateway — degrade silently
    }
    if (session.mode !== 'relay' || !session.token) {
      for (const t of stream.getTracks()) t.stop();
      setStatus('unavailable');
      return 'unavailable';
    }

    // The session-minted single-use token gates the relay (never the raw key, never open).
    const ws = new WebSocket(
      `${GATEWAY_URL.replace(/^http/, 'ws')}/v1/voice/relay?token=${encodeURIComponent(session.token)}`,
    );
    // Do NOT force 16 kHz: Safari/iOS silently ignore the hint and hand back 44.1/48 kHz, so we
    // read the real capture rate below and resample every chunk to the 16 kHz Gemini expects.
    const capture = new AudioContext();
    const playback = new AudioContext({ sampleRate: 24000 });
    // A user gesture opened this call, but Safari still starts contexts suspended.
    await capture.resume().catch(() => {});
    await playback.resume().catch(() => {});
    const state: LiveSession = { ws, stream, capture, playback, sources: new Set(), playhead: 0 };
    live.current = state;

    // ponytail: ScriptProcessor over an AudioWorklet — one file, ~64 ms chunks; swap in a
    // worklet module if capture jitter ever becomes audible.
    const source = capture.createMediaStreamSource(stream);
    const processor = capture.createScriptProcessor(1024, 1, 1);
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
      setStatus('speaking');
      setMood?.('explaining');
      node.onended = () => {
        state.sources.delete(node);
        if (state.sources.size === 0 && live.current === state) {
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
      for (const part of content?.modelTurn?.parts ?? []) {
        const data = part.inlineData?.data;
        if (typeof data === 'string') playChunk(data);
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
  }, [setMood, stop]);

  return { status, start, stop };
}
