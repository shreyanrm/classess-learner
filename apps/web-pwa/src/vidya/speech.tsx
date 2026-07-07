'use client';

/**
 * Vidya speaks what she writes. Every reply plays aloud through the gateway's TTS (the same
 * voice as the live relay), starting as her ink starts — one performance, sound and hand
 * together. Mute silences the sound only, never the words; the mic conversation (Gemini Live)
 * always speaks back and ignores this switch entirely.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { currentFidelity, isOffline } from '../shell/resilience';
import { type ChatTurn, useVidyaChat } from './chat';
import { base64ToFloat32 } from './voice';

// Family N: a stalled 2G link must never leave the narration gate hanging on a fetch that never
// resolves. Bound every TTS request; on timeout it aborts → synth returns null → the words already
// on screen carry the turn and any gate waiting on us releases on its own clock.
const TTS_TIMEOUT_MS = 8000;

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
let playing: { source: AudioBufferSourceNode } | null = null;
// Bumped on every stop/new-utterance so a running sentence pipeline knows it was superseded.
let speechGen = 0;

// ONE shared AudioContext for all her speech, lazily created (mirrors ui/sound.ts). A fresh
// context per sentence starts 'suspended' on Safari/iOS — and always when narration auto-fires
// before any gesture (cold reload / deep-link into a course) — so source.start() is silent and
// onended never fires. Sharing one context lets us unlock it on the first user gesture below.
let sharedCtx: AudioContext | null = null;
function speechCtx(): AudioContext | null {
  try {
    if (!sharedCtx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      sharedCtx = new Ctor();
    }
    return sharedCtx;
  } catch {
    return null;
  }
}

// Belt-and-suspenders unlock: a context created outside a user gesture (auto-narration on a course
// cold-load) stays suspended and cannot resume until the learner touches the page. Resume it on the
// first pointer/key — any already-scheduled narration then becomes audible.
if (typeof window !== 'undefined') {
  const unlock = () => {
    const c = speechCtx();
    if (c && c.state === 'suspended') void c.resume();
  };
  const opts: AddEventListenerOptions = { capture: true, passive: true };
  window.addEventListener('pointerdown', unlock, opts);
  window.addEventListener('keydown', unlock, opts);
}

export function stopSpeaking(): void {
  speechGen++; // abort any in-flight sentence sequence
  if (!playing) return;
  const p = playing;
  playing = null;
  try {
    p.source.stop();
  } catch {
    // already ended
  }
  // The context is shared and reused — stop the source, never tear the context down.
}

/** Split into speakable sentences so we can synth+play the first while the rest queues. */
function sentences(text: string): string[] {
  const parts = text
    .match(/[^.!?\n]+[.!?]*/g)
    ?.map((s) => s.trim())
    .filter(Boolean);
  return parts && parts.length > 0 ? parts : [text.trim()];
}

/** Synthesize one sentence to PCM samples (or null when keyless/rate-limited/muted). */
async function synth(
  text: string,
): Promise<{ samples: Float32Array<ArrayBuffer>; rate: number } | null> {
  // Offline (or keyless): don't burn the timeout on a fetch that can't land — fall straight to
  // text. The reply is already on screen; her voice is the grace, not the help.
  if (!GATEWAY_URL || !text.trim() || isOffline()) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TTS_TIMEOUT_MS);
  try {
    const res = await fetch(`${GATEWAY_URL}/v1/voice/tts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: text.slice(0, 600) }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null; // quota 502 / any non-ok → silent-safe, gate releases via onDone
    const audio = (await res.json()) as { mime?: string; b64?: string };
    if (!audio.b64) return null;
    const rate = Number(/rate=(\d+)/.exec(audio.mime ?? '')?.[1] ?? 24000);
    const samples = base64ToFloat32(audio.b64);
    return samples.length === 0 ? null : { samples, rate };
  } catch {
    return null; // abort (stall) or network error — same graceful text-first fallback
  } finally {
    clearTimeout(timer);
  }
}

/** Play one sentence; resolves when it finishes (or immediately if superseded). */
async function playSamples(
  samples: Float32Array<ArrayBuffer>,
  rate: number,
  gen: number,
): Promise<void> {
  if (gen !== speechGen) return;
  const ctx = speechCtx();
  if (!ctx) return;
  if (playing) {
    try {
      playing.source.stop();
    } catch {
      /* ended */
    }
    playing = null;
  }
  // Unlock before scheduling — mirrors voice.ts:148 ("Safari still starts contexts suspended").
  if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
  if (gen !== speechGen) return; // a newer utterance took over during the resume await
  // The buffer carries its own sample rate; WebAudio resamples it to the shared context's rate.
  const buffer = ctx.createBuffer(1, samples.length, rate);
  buffer.copyToChannel(samples, 0);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  playing = { source };
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      if (playing?.source === source) playing = null;
      resolve();
    };
    source.onended = done;
    source.start();
    // Never hang the pipeline (or a gated advance button) if onended never fires — e.g. the context
    // is still suspended because the page has had no gesture yet. Resolve on the sentence's own
    // clock as a floor; the audio still plays once a tap resumes the context.
    setTimeout(done, (samples.length / rate) * 1000 + 500);
  });
}

/**
 * Speak a line aloud, sentence by sentence: the first sentence plays the instant it returns while
 * the next is already synthesizing — first audio in ~1s instead of after the whole line renders.
 * `onDone` fires once the last sentence finishes (used to gate the course's advance button).
 */
export async function speakLine(text: string, opts?: { onDone?: () => void }): Promise<void> {
  if (!GATEWAY_URL || isMuted() || !text.trim()) {
    opts?.onDone?.();
    return;
  }
  stopSpeaking();
  const gen = ++speechGen;
  try {
    // Low-fi (reduced-motion / Data Saver / 2G): shorter TTS — voice the first couple of sentences,
    // the rest stays on screen. Grace degrades, the words don't.
    const all = sentences(text);
    const parts = currentFidelity() === 'low' ? all.slice(0, 2) : all;
    let pending = synth(parts[0] as string);
    for (let i = 0; i < parts.length; i++) {
      const cur = await pending;
      if (gen !== speechGen) return; // a newer utterance took over
      pending = i + 1 < parts.length ? synth(parts[i + 1] as string) : Promise.resolve(null);
      if (isMuted()) return; // muted mid-flight — respect it
      if (cur) await playSamples(cur.samples, cur.rate, gen);
      if (gen !== speechGen) return;
    }
    if (gen === speechGen) opts?.onDone?.();
  } catch {
    // Never fail silently: her words are already on screen — just release any gate waiting on us
    // (the course advance button) so a TTS hiccup can never strand the learner on a locked card.
    if (gen === speechGen) opts?.onDone?.();
  }
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
    if (last?.role !== 'vidya' || last.id === 'seed') return;
    if (spokenUpTo.current === last.id) return;
    spokenUpTo.current = last.id;
    void speakLine(last.text);
  }, [turns]);
  return null;
}

// --- Card narration: she reads each course card aloud, and the advance button waits for her ------
//
// A card announces its core line on arrival; the course shell speaks it and, for teaching cards,
// gates "begin/continue" until she finishes — or, when muted, until an equal reading time passes.
// A tiny window-event singleton so any card can announce without threading props through the deck.

interface Narration {
  key: string;
  text: string;
  gate: boolean;
}
let currentNarration: Narration = { key: 'none', text: '', gate: false };
const NARR_EVENT = 'clss-card-narration';

/** A card calls this on arrival. `gate` locks the advance button while she reads (teaching cards). */
export function announceCard(key: string, text: string, gate = true): void {
  currentNarration = { key, text, gate };
  window.dispatchEvent(new Event(NARR_EVENT));
}

/** Rough spoken/read duration for a line — the fallback clock when she is muted. */
export function estimateReadMs(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1600, Math.min(14000, (words / 165) * 60000)); // ~165 wpm
}

export interface CardNarration {
  /** True once she has finished reading (or the muted reading clock elapsed). */
  ready: boolean;
  /** 0→1 fill for the locked advance button — never a dead button. */
  progress: number;
  /** True while a gating (teaching) line is still being read. */
  gating: boolean;
  /** Re-speak the current card from the top. */
  replay: () => void;
}

/**
 * Mounted once by the course shell. Watches announced cards, speaks each on arrival, and reports
 * readiness so the advance button can wait for her. When muted, a reading-time clock stands in.
 */
export function useCardNarration(): CardNarration {
  const [narr, setNarr] = useState<Narration>(currentNarration);
  const [progress, setProgress] = useState(1);
  const [ready, setReady] = useState(true);
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    const h = () => setNarr(currentNarration);
    // Child cards run their announce effect BEFORE this parent effect attaches (React runs child
    // effects first), so the first card's event lands before we're listening — re-sync on attach.
    h();
    window.addEventListener(NARR_EVENT, h);
    return () => window.removeEventListener(NARR_EVENT, h);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: epoch is a replay trigger, not read here
  useEffect(() => {
    if (!narr.text) {
      setProgress(1);
      setReady(true);
      return;
    }
    setProgress(0);
    setReady(false);
    let raf = 0;
    let cancelled = false;
    let audioDone = false;
    const muted = isMuted();
    const dur = estimateReadMs(narr.text);
    const started = performance.now();
    if (!muted) void speakLine(narr.text, { onDone: () => (audioDone = true) });
    const tick = () => {
      if (cancelled) return;
      const t = (performance.now() - started) / dur;
      if (muted) {
        const p = Math.min(1, t);
        setProgress(p);
        if (p >= 1) {
          setReady(true);
          return;
        }
      } else {
        // ramp toward 0.95 on the estimate, then snap to done when her audio actually ends
        setProgress(audioDone ? 1 : Math.min(0.95, t * 0.95));
        if (audioDone) {
          setReady(true);
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [narr, epoch]);

  const replay = useCallback(() => {
    stopSpeaking();
    setEpoch((e) => e + 1);
  }, []);

  return { ready, progress, gating: narr.gate, replay };
}

/** Replay button for the course stage — re-speaks the current card. Sits beside mute. */
export function ReplayButton({ onReplay, size = 17 }: { onReplay: () => void; size?: number }) {
  return (
    <button
      type="button"
      onClick={onReplay}
      aria-label="Replay Vidya"
      title="Hear this again"
      style={{
        border: 'none',
        background: 'transparent',
        color: 'var(--clss-ink)',
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
        <path
          d="M15.5 6.5 A6 6 0 1 0 16.4 11"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M15.8 3.4 L16 6.9 L12.5 6.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
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
        color: muted ? 'var(--clss-ink-faint)' : 'var(--clss-ink)',
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
