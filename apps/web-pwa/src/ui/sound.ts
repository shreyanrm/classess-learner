'use client';

/**
 * The sound layer — a tiny synthesized WebAudio voice for the interface. No assets, no files:
 * every sound is a few oscillators and an envelope, generated on the fly. Subtle and premium,
 * never noisy — a soft tick as you advance, a small bloom when you are right, a warm chord when
 * XP lands, a whoosh between pages, a gentle chime when Vidya arrives.
 *
 * ONE global switch: the same mute preference that silences her voice (clss-voice-muted-v1)
 * silences everything here too. We read the key fresh on every play, so a toggle takes effect
 * immediately with no listener wiring — and we import nothing, so the kit stays dependency-free.
 */

const MUTE_KEY = 'clss-voice-muted-v1';

function muted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

// One shared context, lazily created inside a user gesture (a button tap is our first sound).
let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  if (muted()) return null;
  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

// Everything routes through one quiet master so the whole layer stays a background presence.
const MASTER = 0.5;

/** One shaped tone: an oscillator with an attack/decay gain envelope. */
function tone(
  ac: AudioContext,
  opts: {
    freq: number;
    type?: OscillatorType;
    at?: number; // start offset (s)
    dur: number; // total (s)
    peak: number; // gain peak, pre-master
    attack?: number; // rise (s)
    glideTo?: number; // sweep the pitch to this freq across dur
  },
) {
  const t0 = ac.currentTime + (opts.at ?? 0);
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(opts.freq, t0);
  if (opts.glideTo) osc.frequency.exponentialRampToValueAtTime(opts.glideTo, t0 + opts.dur);
  const attack = opts.attack ?? 0.008;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(opts.peak * MASTER, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + opts.dur + 0.02);
}

let lastTap = 0;

export const sfx = {
  /** Soft tick — a button tap, a card advance. Debounced so rapid taps never stack into noise. */
  tap() {
    const ac = audio();
    if (!ac) return;
    const now = ac.currentTime;
    if (now - lastTap < 0.05) return;
    lastTap = now;
    tone(ac, { freq: 2200, type: 'triangle', dur: 0.045, peak: 0.03, attack: 0.003 });
  },

  /** Small bloom — a correct answer. A quick two-note lift. */
  bloom() {
    const ac = audio();
    if (!ac) return;
    tone(ac, { freq: 660, type: 'sine', dur: 0.14, peak: 0.05, glideTo: 990 });
    tone(ac, { freq: 990, type: 'sine', at: 0.07, dur: 0.16, peak: 0.045 });
  },

  /** Warm chord — XP, an award, a completion. A soft major triad that blooms and fades. */
  chord() {
    const ac = audio();
    if (!ac) return;
    // A4 · C#5 · E5 — a bright, warm major, staggered so it swells rather than stabs.
    tone(ac, { freq: 440, type: 'sine', dur: 0.6, peak: 0.05, attack: 0.02 });
    tone(ac, { freq: 554.37, type: 'sine', at: 0.04, dur: 0.58, peak: 0.045, attack: 0.02 });
    tone(ac, { freq: 659.25, type: 'sine', at: 0.08, dur: 0.56, peak: 0.04, attack: 0.02 });
  },

  /** Whoosh — a page transition. A short filtered-noise sweep, felt more than heard. */
  whoosh() {
    const ac = audio();
    if (!ac) return;
    const t0 = ac.currentTime;
    const dur = 0.22;
    const frames = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, frames, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(900, t0);
    bp.frequency.exponentialRampToValueAtTime(300, t0 + dur);
    bp.Q.value = 0.7;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.06 * MASTER, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(bp).connect(g).connect(ac.destination);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  },

  /** Gentle chime — Vidya lands. A single bell: fundamental plus a soft high partial. */
  chime() {
    const ac = audio();
    if (!ac) return;
    tone(ac, { freq: 880, type: 'sine', dur: 0.5, peak: 0.05, attack: 0.006 });
    tone(ac, { freq: 1760, type: 'sine', dur: 0.35, peak: 0.02, attack: 0.006 });
  },
};
