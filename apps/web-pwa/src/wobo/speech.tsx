'use client';

/**
 * Wobo speaks what she writes. Every reply plays aloud through the gateway's TTS (the same
 * voice as the live relay), starting as her ink starts — one performance, sound and hand
 * together. Mute silences the sound only, never the words; the mic conversation always speaks
 * back and ignores this switch entirely.
 */

import { gatewayFetch, mintVoiceToken, voiceSocketUrl } from '@classess/sdk';
import {
  planPerformance,
  useWoboBus,
  type WoboAction,
  type WoboBus,
  type WoboMood,
} from '@classess/wobo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { currentFidelity, isOffline } from '../shell/resilience';
import { type ChatTurn, useWoboChat } from './chat';
import { base64ToFloat32 } from './voice';

// Family N: a stalled 2G link must never leave the narration gate hanging on a fetch that never
// resolves. Bound every TTS request; on timeout it aborts → synth returns null → the words already
// on screen carry the turn and any gate waiting on us releases on its own clock.
const TTS_TIMEOUT_MS = 8000;

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL;
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
// The streaming path schedules many short chunks ahead on the shared context; tracked here so a
// new utterance (stopSpeaking) can cut them all off mid-word, exactly like the buffered `playing`.
const streamSources = new Set<AudioBufferSourceNode>();
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
  // Cut off any streamed chunks scheduled ahead on the shared context.
  for (const node of streamSources) {
    try {
      node.stop();
    } catch {
      // already ended
    }
  }
  streamSources.clear();
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

// Words whose period never ends a sentence. A small, high-traffic list — a tutor's narration
// splitter, not a tokenizer. Single letters ("e.g.", "U.S.", "Ph.D.") are handled as initials below.
const ABBREVIATIONS = new Set([
  'mr',
  'mrs',
  'ms',
  'dr',
  'prof',
  'sr',
  'jr',
  'st',
  'vs',
  'etc',
  'eg',
  'ie',
  'approx',
  'fig',
  'no',
  'al',
  'dept',
  'est',
  'inc',
  'ltd',
  'min',
  'max',
  'cf',
]);

const isUpperChar = (c: string): boolean => c !== c.toLowerCase() && c === c.toUpperCase();

/** The word (letters/digits) immediately before position `i`, lowercased. */
function wordBefore(text: string, i: number): string {
  let start = i;
  while (start > 0 && /[A-Za-z0-9]/.test(text[start - 1] as string)) start--;
  return text.slice(start, i).toLowerCase();
}

/**
 * Does the ender run text[i..end] actually close a sentence? `!` and `?` always do. A period only
 * does when what follows is the end of the line, or whitespace and then a capital — so "3.14",
 * "e.g." and "Dr. Rao" stay in one breath instead of shattering the beat (each fragment would
 * otherwise get its own synth request and its own ink beat, drifting the choreography).
 */
function endsSegment(text: string, i: number, end: number): boolean {
  const run = text.slice(i, end + 1);
  if (run.includes('!') || run.includes('?')) return true;
  const word = wordBefore(text, i);
  if (word.length === 1 && /[A-Za-z]/.test(word)) return false; // an initial: e.g., U.S., Ph.D.
  if (ABBREVIATIONS.has(word)) return false;
  const rest = text.slice(end + 1);
  if (rest.trim() === '') return true; // end of the line
  if (!/^[\s]/.test(rest)) return false; // "3.14", "v1.2" — glued to what follows
  const head = rest.trimStart().replace(/^["'“‘([]+/, '')[0];
  return head !== undefined && isUpperChar(head);
}

/**
 * Split into speakable sentences so we can synth+play the first while the rest queues. Newlines and
 * `!`/`?` always break; a period breaks only where it really ends a sentence (see endsSegment).
 */
export function sentences(text: string): string[] {
  const out: string[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i] as string;
    if (ch === '\n') {
      const seg = text.slice(start, i).trim();
      if (seg) out.push(seg);
      start = i + 1;
      continue;
    }
    if (ch !== '.' && ch !== '!' && ch !== '?') continue;
    let end = i; // swallow a run of enders ("...", "?!") into one break
    while (end + 1 < text.length && '.!?'.includes(text[end + 1] as string)) end++;
    if (endsSegment(text, i, end)) {
      const seg = text.slice(start, end + 1).trim();
      if (seg) out.push(seg);
      start = end + 1;
    }
    i = end;
  }
  const tail = text.slice(start).trim();
  if (tail) out.push(tail);
  return out.length > 0 ? out : [text.trim()];
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
    // Identity rides every gateway call (gatewayFetch); the brain decides whether this learner has
    // a voice left today. A refusal is just silence here — the words are already on screen.
    const res = await gatewayFetch(`${GATEWAY_URL}/v1/voice/tts`, {
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
/**
 * Stream the whole line through the gateway's voice socket — playback starts at the first
 * ~200 ms audio chunk instead of waiting on the full clip (~4 s sooner to first sound; verified
 * verbatim so she reads the exact line). Resolves `true` once audio has begun (the caller is done),
 * `false` if it can't start — the caller then falls back to the buffered path, so voice never
 * regresses. A watchdog bails to the fallback if no audio arrives in time.
 */
async function speakStream(
  text: string,
  gen: number,
  opts?: { onDone?: () => void },
): Promise<boolean> {
  if (!GATEWAY_URL || !text.trim() || isOffline()) return false;
  const ctx = speechCtx();
  if (!ctx) return false;
  if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
  if (gen !== speechGen) return true; // superseded during the resume await — treat as handled
  // A websocket carries no headers we control, so identity is proved over authenticated HTTP and
  // the socket carries the short-lived, single-use token it mints. No token, no stream — the
  // buffered path below still speaks her line.
  // ponytail: one extra round-trip before first audio; a pre-minted token pool is the upgrade if
  // that ever shows up next to the ~4s the stream already saves.
  const minted = await mintVoiceToken(GATEWAY_URL);
  if (!minted) return false;
  if (gen !== speechGen) return true; // superseded while minting
  const url = voiceSocketUrl(GATEWAY_URL, '/v1/voice/tts/stream', minted.token);
  return new Promise<boolean>((resolve) => {
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      resolve(false);
      return;
    }
    let playhead = 0;
    let played = false;
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(watchdog);
      try {
        ws.close();
      } catch {
        // already closing
      }
      resolve(ok);
    };
    // No first chunk within the budget → abandon to the buffered fallback.
    const watchdog = setTimeout(() => !played && finish(false), TTS_TIMEOUT_MS);
    ws.onopen = () => {
      try {
        ws.send(text.slice(0, 600));
      } catch {
        finish(false);
      }
    };
    // Error before any audio → fall back; error after → keep what played (finish handled).
    ws.onerror = () => finish(played);
    ws.onclose = () => {
      if (played && gen === speechGen) {
        const remainMs = Math.max(0, playhead - ctx.currentTime) * 1000;
        setTimeout(() => gen === speechGen && opts?.onDone?.(), remainMs + 40);
      }
      finish(played);
    };
    ws.onmessage = (e) => {
      if (gen !== speechGen) {
        finish(true);
        return;
      }
      let msg: unknown;
      try {
        msg = JSON.parse(String(e.data));
      } catch {
        return;
      }
      const sc = (msg as { serverContent?: Record<string, unknown> }).serverContent;
      const parts =
        (sc?.modelTurn as { parts?: { inlineData?: { data?: string } }[] })?.parts ?? [];
      for (const p of parts) {
        const b64 = p?.inlineData?.data;
        if (!b64) continue;
        const samples = base64ToFloat32(b64);
        if (samples.length === 0) continue;
        const buf = ctx.createBuffer(1, samples.length, 24000);
        buf.copyToChannel(samples, 0);
        const node = ctx.createBufferSource();
        node.buffer = buf;
        node.connect(ctx.destination);
        playhead = Math.max(playhead, ctx.currentTime + 0.05);
        node.start(playhead);
        playhead += buf.duration;
        streamSources.add(node);
        node.onended = () => streamSources.delete(node);
        played = true;
        clearTimeout(watchdog);
      }
    };
  });
}

/**
 * Wrap a callback so it runs at most once. `onDone` releases the course's advance button — firing
 * it twice double-advances a card, never firing it locks the learner on one. Every exit of
 * speakLine goes through one of these.
 */
export function onceCallback(fn?: () => void): () => void {
  let done = false;
  return () => {
    if (done) return;
    done = true;
    fn?.();
  };
}

export async function speakLine(text: string, opts?: { onDone?: () => void }): Promise<void> {
  // Guaranteed-once: muted, keyless, superseded, thrown or finished — the gate always releases.
  // (A whole-body finally can't do this: the streaming path resolves before its audio ends and
  // fires onDone from a timer afterwards, so a finally here would pre-empt it.)
  const finish = onceCallback(opts?.onDone);
  if (!GATEWAY_URL || isMuted() || !text.trim()) {
    finish();
    return;
  }
  stopSpeaking();
  const gen = ++speechGen;
  // Fast path: stream the whole line (first audio ~4s sooner). If it can't start, fall through to
  // the buffered sentence pipeline below — voice never regresses.
  if (await speakStream(text, gen, { onDone: finish })) {
    // Handled — the stream fires `finish` when its audio drains. Unless it was superseded, in which
    // case nothing more is coming and the gate would hang: release it now.
    if (gen !== speechGen) finish();
    return;
  }
  if (gen !== speechGen) {
    finish(); // superseded while streaming attempted
    return;
  }
  try {
    // Low-fi (reduced-motion / Data Saver / 2G): shorter TTS — voice the first couple of sentences,
    // the rest stays on screen. Grace degrades, the words don't.
    const all = sentences(text);
    const parts = currentFidelity() === 'low' ? all.slice(0, 2) : all;
    let pending = synth(parts[0] as string);
    for (let i = 0; i < parts.length; i++) {
      const cur = await pending;
      if (gen !== speechGen) {
        finish(); // a newer utterance took over
        return;
      }
      pending = i + 1 < parts.length ? synth(parts[i + 1] as string) : Promise.resolve(null);
      if (isMuted()) {
        finish(); // muted mid-flight — respect it, but never strand the gate
        return;
      }
      if (cur) await playSamples(cur.samples, cur.rate, gen);
      if (gen !== speechGen) {
        finish();
        return;
      }
    }
    finish();
  } catch {
    // Never fail silently: her words are already on screen — just release any gate waiting on us
    // (the course advance button) so a TTS hiccup can never strand the learner on a locked card.
    finish();
  }
}

// --- THE CONDUCTOR: one continuous performance, voice and hand together ---------------------------
//
// A choreographed turn's ink no longer lands all at once. She speaks her line sentence by sentence,
// and each action's sync anchor (withSentence / afterSentence, set by the gateway) fires its ink on
// that exact beat — the underline lands as she says the term, the arrow arrives as she references it,
// and a written note is paced to the audio length of the sentence carrying it, so the hand keeps up
// with the voice. Unanchored actions were already dispatched at once by the caller (backward compat).

/** Hold a beat on the reading clock (muted / keyless / a sentence that failed to synth). */
function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Speak a line sentence by sentence, calling back on each sentence's start (with its measured audio
 * length when voiced) and end. The first sentence plays while the next synthesizes. Muted/keyless/
 * low-fi still run the callbacks on the reading clock so the ink stays paced.
 */
async function speakSentences(
  segs: string[],
  gen: number,
  hooks?: { onStart?: (i: number, voicedMs?: number) => void; onEnd?: (i: number) => void },
): Promise<void> {
  const canVoice = Boolean(GATEWAY_URL) && !isMuted();
  const voiceCount = currentFidelity() === 'low' ? Math.min(2, segs.length) : segs.length;
  let pending = canVoice && segs.length > 0 ? synth(segs[0] as string) : null;
  for (let i = 0; i < segs.length; i++) {
    const cur = pending ? await pending : null;
    if (gen !== speechGen) return;
    pending = canVoice && i + 1 < voiceCount ? synth(segs[i + 1] as string) : null;
    const voicedMs = cur ? (cur.samples.length / cur.rate) * 1000 : undefined;
    hooks?.onStart?.(i, voicedMs);
    if (cur && !isMuted()) await playSamples(cur.samples, cur.rate, gen);
    else await waitMs(estimateReadMs(segs[i] as string));
    if (gen !== speechGen) return;
    hooks?.onEnd?.(i);
  }
}

/** A tiny timing trail the live verifier reads off `window` — proves ink lands on its beat. */
function traceBeat(kind: string, i: number, count: number, voicedMs?: number): void {
  if (typeof window === 'undefined') return;
  const w = window as unknown as { __woboTiming?: unknown[] };
  if (!Array.isArray(w.__woboTiming)) return; // opt-in: the verifier sets it to []
  w.__woboTiming.push({
    t: Math.round(performance.now()),
    kind,
    sentence: i,
    marks: count,
    voicedMs,
  });
}

const moodOfBeat = (beat: WoboAction[]): WoboMood | undefined => {
  const m = beat.find((a) => a.type === 'setMood');
  return m && 'mood' in m ? (m.mood as WoboMood) : undefined;
};

/**
 * Perform one choreographed turn: speak `text` and land each anchored action on its sentence beat.
 * The caller has already dispatched the unanchored (immediate) actions. Mood follows content —
 * anchored setMood beats drive her body as she writes (thinking on the setup, bright on the reveal).
 */
export async function performTurn(
  text: string,
  actions: WoboAction[],
  bus: Pick<WoboBus, 'addBeat' | 'beginTurn'>,
  opts?: { onMood?: (m: WoboMood) => void },
): Promise<void> {
  const segs = sentences(text);
  const plan = planPerformance(actions, segs.length);
  stopSpeaking();
  const gen = ++speechGen;
  bus.beginTurn(); // this turn's ink starts a fresh redrawable set
  // Every beat fires exactly once, keyed by its slot: `s${i}` for withSentence, `e${i}` for
  // afterSentence. The end-of-turn flush replays the same runBeat, so a beat that already landed is
  // a no-op — without this the flush re-fired every afterSentence beat (doubled ink, doubled say
  // lines, doubled setState) on every completed performance.
  const fired = new Set<string>();
  const runBeat = (
    beat: WoboAction[] | undefined,
    i: number,
    voicedMs: number | undefined,
    kind: string,
    slot: 's' | 'e',
  ) => {
    if (!beat?.length) return;
    const key = `${slot}${i}`;
    if (fired.has(key)) return;
    fired.add(key);
    const mood = moodOfBeat(beat);
    if (mood) opts?.onMood?.(mood);
    bus.addBeat(beat, voicedMs !== undefined ? { noteDurationMs: voicedMs } : undefined);
    traceBeat(kind, i, beat.length, voicedMs);
  };
  try {
    await speakSentences(segs, gen, {
      onStart: (i, voicedMs) => runBeat(plan.atStart.get(i), i, voicedMs, 'withSentence', 's'),
      onEnd: (i) => runBeat(plan.atEnd.get(i), i, undefined, 'afterSentence', 'e'),
    });
  } finally {
    // Never strand ink: if the performance was cut short, land the beats that never fired — through
    // runBeat, so their mood and trace are honoured too.
    if (gen === speechGen) {
      for (const [i, beat] of plan.atStart) runBeat(beat, i, undefined, 'flush', 's');
      for (const [i, beat] of plan.atEnd) runBeat(beat, i, undefined, 'flush', 'e');
    }
  }
}

// --- THE UTTERANCE CLOCK: what the board's hand is timed against ---------------------------------
//
// A board turn's plan carries `t.start` on every object, measured from the beginning of the current
// utterance (docs/BOARD.md §2). The clock that zero is measured from lives HERE, with her voice, not
// in the renderer: the performance opens, the board is zeroed on the same instant, and the pen then
// leads the first syllable by exactly the time that syllable takes to arrive — a hand's anticipation
// before a stroke, which is what BOARD.md §7 asks for and what keeps the first stroke inside its
// one-second budget while the voice keeps its own.
//
// Lines arrive as the plan streams, so the utterance is a queue, not a string: `say` each frame as
// it lands, `end` when the stream closes, and the speaker drains them in order without ever
// re-synthesising a sentence it has already spoken.

/** What the board offers the voice: a clock it can zero. `BoardStore` satisfies this as it is. */
export interface UtteranceClock {
  beginUtterance: (at?: number) => void;
}

export interface Utterance {
  /** Queue a line of hers. Safe to call while she is already speaking. */
  say: (text: string) => void;
  /** No more lines are coming; `done` resolves once the queue drains. */
  end: () => void;
  /** The learner cut her off: the voice stops mid-word and the queue is dropped. */
  stop: () => void;
  /** Resolves when she has finished speaking, been superseded, or been stopped. */
  readonly done: Promise<void>;
}

/**
 * Open one utterance. `clock` is read at the moment the performance opens (the board she is drawing
 * on can be chosen on the first object, so it is a getter, not a value).
 */
export function startUtterance(clock?: () => UtteranceClock | null | undefined): Utterance {
  stopSpeaking();
  const gen = ++speechGen;
  clock?.()?.beginUtterance();
  const queue: string[] = [];
  let ended = false;
  let wake: (() => void) | null = null;
  const nudge = () => {
    const w = wake;
    wake = null;
    w?.();
  };

  const drain = (async () => {
    while (true) {
      if (gen !== speechGen) return;
      const next = queue.shift();
      if (next === undefined) {
        if (ended) return;
        await new Promise<void>((resolve) => {
          wake = resolve;
        });
        continue;
      }
      const canVoice = Boolean(GATEWAY_URL) && !isMuted();
      const segs = sentences(next);
      // Low-fi (reduced motion, Data Saver, 2G): voice the first couple of sentences, read the rest
      // on the clock. Grace degrades; the timing the ink is paced against does not.
      const voiceCount = currentFidelity() === 'low' ? Math.min(2, segs.length) : segs.length;
      let pending = canVoice && segs.length > 0 ? synth(segs[0] as string) : null;
      for (let i = 0; i < segs.length; i++) {
        const cur = pending ? await pending : null;
        if (gen !== speechGen) return;
        pending = canVoice && i + 1 < voiceCount ? synth(segs[i + 1] as string) : null;
        if (cur && !isMuted()) await playSamples(cur.samples, cur.rate, gen);
        else await waitMs(estimateReadMs(segs[i] as string));
        if (gen !== speechGen) return;
      }
    }
  })();

  return {
    say(text: string) {
      if (!text.trim()) return;
      queue.push(text);
      nudge();
    },
    end() {
      ended = true;
      nudge();
    },
    stop() {
      ended = true;
      queue.length = 0;
      stopSpeaking();
      nudge();
    },
    done: drain,
  };
}

// A turn's anchored actions, handed from App's ask() to the conductor and consumed once, keyed by
// the wobo turn's id (so it never mis-fires on an identical-looking line).
const pendingPerformances = new Map<string, WoboAction[]>();
export function registerPerformance(turnId: string, anchored: WoboAction[]): void {
  if (anchored.length > 0) pendingPerformances.set(turnId, anchored);
}
function takePerformance(turnId: string): WoboAction[] | undefined {
  const p = pendingPerformances.get(turnId);
  if (p) pendingPerformances.delete(turnId);
  return p;
}

/**
 * Always-mounted: the conductor. It watches the one conversation and, as each new line of hers
 * lands, either performs it (speak + choreographed ink beats, when App registered anchors) or simply
 * speaks it. Sound and hand move together — one continuous performance, like a tutor at a whiteboard.
 */
export function SpeechNarrator() {
  const { turns, setMood } = useWoboChat();
  const bus = useWoboBus();
  // Mark everything already said before this mount as spoken — she only voices NEW lines.
  // Initialized synchronously (not in the effect) so a mount that happens mid-exchange, while
  // the newest turn is the learner's, can never swallow the reply that follows it.
  const spokenUpTo = useRef<string | null>(null);
  const booted = useRef(false);
  if (!booted.current) {
    booted.current = true;
    spokenUpTo.current =
      ([...turns].reverse().find((t) => t.role === 'wobo') as ChatTurn | undefined)?.id ?? 'none';
  }
  useEffect(() => {
    const last = turns[turns.length - 1] as ChatTurn | undefined;
    if (last?.role !== 'wobo' || last.id === 'seed') return;
    if (spokenUpTo.current === last.id) return;
    spokenUpTo.current = last.id;
    const anchored = takePerformance(last.id);
    if (anchored) void performTurn(last.text, anchored, bus, { onMood: setMood });
    else void speakLine(last.text);
  }, [turns, bus, setMood]);
  // Dev-only verification seam: lets a live check drive a controlled choreographed turn against the
  // real app and measure the beats. Never compiled into a production build (import.meta.env.DEV).
  useEffect(() => {
    if (!import.meta.env.DEV || typeof window === 'undefined') return;
    (window as unknown as { __woboConductor?: unknown }).__woboConductor = {
      performTurn,
      bus,
      setMood,
    };
  }, [bus, setMood]);
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
    const dur = estimateReadMs(narr.text);
    // Hard ceiling: if her onDone is ever lost (a socket that neither closes nor errors), the gate
    // degrades to the reading clock instead of locking the learner on the card forever.
    const ceiling = dur * 2 + 5000;
    const started = performance.now();
    if (!isMuted()) void speakLine(narr.text, { onDone: () => (audioDone = true) });
    const tick = () => {
      if (cancelled) return;
      const elapsed = performance.now() - started;
      const t = elapsed / dur;
      // Re-read the switch each frame: muting mid-line cuts her off, and from then on the reading
      // clock — not an audio callback that will never come — has to carry the gate.
      const muted = isMuted();
      if (audioDone || elapsed >= ceiling || (muted && t >= 1)) {
        setProgress(1);
        setReady(true);
        return;
      }
      // ramp toward 0.95 on the estimate, then snap to done when her audio actually ends
      setProgress(muted ? Math.min(1, t) : Math.min(0.95, t * 0.95));
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
      aria-label="Hear Wobo again"
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
      aria-label={muted ? 'Unmute Wobo' : 'Mute Wobo'}
      aria-pressed={muted}
      title={muted ? 'Her voice is off — words still arrive' : 'She speaks her replies'}
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
