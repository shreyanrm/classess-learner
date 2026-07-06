'use client';

/**
 * Vidya speaks what she writes. Every reply plays aloud through the gateway's TTS (the same
 * voice as the live relay), starting as her ink starts — one performance, sound and hand
 * together. Mute silences the sound only, never the words; the mic conversation (Gemini Live)
 * always speaks back and ignores this switch entirely.
 */

import { useEffect, useRef, useState } from 'react';
import { type ChatTurn, useVidyaChat } from './chat';
import { base64ToFloat32 } from './voice';

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL as string | undefined;
const MUTE_KEY = 'clss-voice-muted-v1';
const MUTE_EVENT = 'clss-mute-changed';

export function isMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // session-only preference
  }
  if (muted) stopSpeaking();
  window.dispatchEvent(new Event(MUTE_EVENT));
}

// One voice at a time — a new line stops the previous one mid-word, like a person would.
let playing: { ctx: AudioContext; source: AudioBufferSourceNode } | null = null;

export function stopSpeaking(): void {
  if (!playing) return;
  const p = playing;
  playing = null;
  try {
    p.source.stop();
  } catch {
    // already ended
  }
  void p.ctx.close();
}

/** Speak one line aloud. Resolves when playback starts (not when it ends). */
export async function speakLine(text: string): Promise<void> {
  if (!GATEWAY_URL || isMuted() || !text.trim()) return;
  let audio: { mime?: string; b64?: string };
  try {
    const res = await fetch(`${GATEWAY_URL}/v1/voice/tts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: text.slice(0, 600) }),
    });
    if (!res.ok) return; // keyless or rate-limited — the words are already on screen
    audio = (await res.json()) as { mime?: string; b64?: string };
  } catch {
    return;
  }
  if (!audio.b64 || isMuted()) return; // muted mid-fetch: respect it
  const rate = Number(/rate=(\d+)/.exec(audio.mime ?? '')?.[1] ?? 24000);
  const samples = base64ToFloat32(audio.b64);
  if (samples.length === 0) return;
  stopSpeaking();
  const ctx = new AudioContext({ sampleRate: rate });
  const buffer = ctx.createBuffer(1, samples.length, rate);
  buffer.copyToChannel(samples, 0);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  playing = { ctx, source };
  source.onended = () => {
    if (playing?.source === source) {
      playing = null;
      void ctx.close();
    }
  };
  source.start();
}

/**
 * Always-mounted: watches the one conversation and speaks each new line of hers as it lands —
 * the same moment her ink actions dispatch, so sound and hand move together.
 * ponytail: sync = same starting beat; word-level ink timing is the upgrade path.
 */
export function SpeechNarrator() {
  const { turns } = useVidyaChat();
  // Mark everything already said before this mount as spoken — she only voices NEW lines.
  // Initialized synchronously (not in the effect) so a mount that happens mid-exchange, while
  // the newest turn is the learner's, can never swallow the reply that follows it.
  const spokenUpTo = useRef<string | null>(null);
  const booted = useRef(false);
  if (!booted.current) {
    booted.current = true;
    spokenUpTo.current =
      ([...turns].reverse().find((t) => t.role === 'vidya') as ChatTurn | undefined)?.id ?? 'none';
  }
  useEffect(() => {
    const last = turns[turns.length - 1] as ChatTurn | undefined;
    if (!last || last.role !== 'vidya' || last.id === 'seed') return;
    if (spokenUpTo.current === last.id) return;
    spokenUpTo.current = last.id;
    void speakLine(last.text);
  }, [turns]);
  return null;
}

/** The sound switch — mutes her voice, never her words. Lives beside her name. */
export function MuteButton({ size = 17 }: { size?: number }) {
  const [muted, setMutedState] = useState(isMuted);
  useEffect(() => {
    const sync = () => setMutedState(isMuted());
    window.addEventListener(MUTE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(MUTE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return (
    <button
      type="button"
      onClick={() => setMuted(!muted)}
      aria-label={muted ? 'Unmute Vidya' : 'Mute Vidya'}
      aria-pressed={muted}
      title={muted ? 'her voice is off — words still arrive' : 'she speaks her replies'}
      style={{
        border: 'none',
        background: 'transparent',
        color: muted ? '#989AA4' : '#121316',
        cursor: 'pointer',
        fontFamily: 'inherit',
        padding: 6,
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden
        role="presentation"
      >
        {/* a small speaker, hers */}
        <path
          d="M3.5 7.5 H6.8 L10.6 4.4 V15.6 L6.8 12.5 H3.5 Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
        {muted ? (
          <path
            d="M13.2 7.6 L17 12.4 M17 7.6 L13.2 12.4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        ) : (
          <>
            <path
              d="M13.2 7.2 C14.2 8.6 14.2 11.4 13.2 12.8"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <path
              d="M15.4 5.6 C17.2 7.8 17.2 12.2 15.4 14.4"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              opacity="0.55"
            />
          </>
        )}
      </svg>
    </button>
  );
}
