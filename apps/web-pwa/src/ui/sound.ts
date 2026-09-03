'use client';

/**
 * The sound layer — a tiny synthesized WebAudio voice for the interface. No assets, no files:
 * every sound is a few oscillators and an envelope, generated on the fly. Subtle and premium,
 * never noisy — a soft tick as you advance, a small bloom when you are right, a warm chord when
 * XP lands, a whoosh between pages, a gentle chime when Wobo arrives.
 *
 * ONE global switch: the same mute preference that silences Wobo's voice (wobo-voice-muted-v1)
 * silences everything here too. We read the key fresh on every play, so a toggle takes effect
 * immediately with no listener wiring — and we import nothing, so the kit stays dependency-free.
 */

const MUTE_KEY = 'wobo-voice-muted-v1';

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

  /**
   * Gentle low blip — a wrong answer. Kind, never punishing: a soft sine eases down a minor third
   * with a little body underneath. A quiet "not quite", never a buzzer (sines only, low peak).
   */
  wrong() {
    const ac = audio();
    if (!ac) return;
    tone(ac, { freq: 330, type: 'sine', dur: 0.2, peak: 0.045, attack: 0.012, glideTo: 262 });
    tone(ac, { freq: 165, type: 'sine', at: 0.02, dur: 0.22, peak: 0.02, attack: 0.012 });
  },

  /** Soft ding — a toast/notification landing. Two clear glassy notes lifting, brief and quiet. */
  ding() {
    const ac = audio();
    if (!ac) return;
    tone(ac, { freq: 783.99, type: 'sine', dur: 0.16, peak: 0.04, attack: 0.005 }); // G5
    tone(ac, { freq: 1046.5, type: 'sine', at: 0.1, dur: 0.28, peak: 0.035, attack: 0.006 }); // C6
  },

  /**
   * Reward glint — a chest opening, a daily bonus paid. A quick jewel-like arpeggio (E5·B5·E6)
   * over a warm low body: brighter and sparklier than the routine XP chord, so a bonus reads apart.
   */
  reward() {
    const ac = audio();
    if (!ac) return;
    tone(ac, { freq: 392, type: 'sine', dur: 0.5, peak: 0.035, attack: 0.02 }); // G4 body
    [659.25, 987.77, 1318.5].forEach((f, i) => {
      tone(ac, {
        freq: f,
        type: 'sine',
        at: 0.06 + i * 0.07,
        dur: 0.4,
        peak: 0.03 - i * 0.004,
        attack: 0.006,
      });
    });
  },

  /**
   * Soft breath — a drawer sliding open or closed. An airy filtered-noise swell, felt more than
   * heard; the bandpass rises for open and falls for close, so the direction is audible.
   */
  breath(open: boolean) {
    const ac = audio();
    if (!ac) return;
    const t0 = ac.currentTime;
    const dur = 0.3;
    const frames = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, frames, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++)
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / frames) * Math.PI);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(open ? 320 : 820, t0);
    bp.frequency.exponentialRampToValueAtTime(open ? 820 : 320, t0 + dur);
    bp.Q.value = 0.8;
    const g = ac.createGain();
    g.gain.value = 0.035 * MASTER;
    src.connect(bp).connect(g).connect(ac.destination);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  },

  /**
   * Combo rise — consecutive correct answers, from the third on. A quick two-note lift whose
   * pitch climbs a semitone with each step of the chain, so a longer streak literally sounds
   * higher. Quieter than a routine bloom (it rides alongside it) and capped so it never shrills.
   */
  combo(step: number) {
    const ac = audio();
    if (!ac) return;
    const n = Math.min(Math.max(step, 3), 11); // clamp: 3rd correct up, ceiling so it never shrills
    const base = 520 * 2 ** ((n - 3) / 12); // a semitone higher per step past the earn threshold
    tone(ac, {
      freq: base,
      type: 'triangle',
      dur: 0.13,
      peak: 0.03,
      attack: 0.005,
      glideTo: base * 1.5,
    });
    tone(ac, { freq: base * 1.5, type: 'sine', at: 0.06, dur: 0.14, peak: 0.026, attack: 0.006 });
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

  /**
   * Fanfare — a level crossing, the rarest earn. A rising major arpeggio that resolves an octave
   * up with a soft sparkle on top: brighter and taller than the completion chord, so a level-up
   * sounds unmistakably like more than a routine reward. Mute-aware like everything here.
   */
  fanfare() {
    const ac = audio();
    if (!ac) return;
    // C5 · E5 · G5 · C6 — an ascending major arpeggio, each note stepping in a touch later
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      tone(ac, { freq: f, type: 'sine', at: i * 0.09, dur: 0.55, peak: 0.05, attack: 0.012 });
    });
    // a high shimmer arriving on the resolve — the light on top of the sound
    tone(ac, { freq: 2093, type: 'sine', at: 0.34, dur: 0.5, peak: 0.018, attack: 0.01 });
  },

  /** Gentle chime — Wobo lands. A single bell: fundamental plus a soft high partial. */
  chime() {
    const ac = audio();
    if (!ac) return;
    tone(ac, { freq: 880, type: 'sine', dur: 0.5, peak: 0.05, attack: 0.006 });
    tone(ac, { freq: 1760, type: 'sine', dur: 0.35, peak: 0.02, attack: 0.006 });
  },

  /** Reveal — the clouds part on the adventure world. A soft rising shimmer plus an airy swell. */
  reveal() {
    const ac = audio();
    if (!ac) return;
    const t0 = ac.currentTime;
    // an airy noise swell, felt like breath clearing
    const dur = 0.9;
    const frames = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, frames, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) {
      const env = Math.sin((i / frames) * Math.PI); // swell in and out
      data[i] = (Math.random() * 2 - 1) * env;
    }
    const src = ac.createBufferSource();
    src.buffer = buf;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(500, t0);
    bp.frequency.exponentialRampToValueAtTime(1600, t0 + dur);
    bp.Q.value = 0.6;
    const g = ac.createGain();
    g.gain.value = 0.04 * MASTER;
    src.connect(bp).connect(g).connect(ac.destination);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
    // a gentle three-note shimmer arriving with the terrain
    tone(ac, { freq: 660, type: 'sine', at: 0.15, dur: 0.5, peak: 0.03, attack: 0.05 });
    tone(ac, { freq: 990, type: 'sine', at: 0.32, dur: 0.5, peak: 0.026, attack: 0.05 });
    tone(ac, { freq: 1320, type: 'sine', at: 0.5, dur: 0.5, peak: 0.02, attack: 0.05 });
  },
};

// --- scoped ambience — a soft nature + play bed, alive ONLY while the adventure world is open ----
// A looping wind bed, sparse bird chirps, and rare pentatonic plucks, all synthesized. It routes
// through one gain so it fades in on start, ducks under Wobo, and fully stops on unmount. Muted
// (wobo-voice-muted-v1) → start() is a no-op, so it never plays and never leaks to other pages.

interface Amb {
  gain: GainNode;
  nodes: AudioScheduledSourceNode[];
  timers: number[];
  stopped: boolean;
}
let amb: Amb | null = null;

/** Soft looping noise for the wind bed. */
function noiseLoop(ac: AudioContext, seconds: number): AudioBuffer {
  const frames = Math.floor(ac.sampleRate * seconds);
  const buf = ac.createBuffer(1, frames, ac.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < frames; i++) {
    // a gentle brown-ish noise (integrated white) — softer than raw hiss
    last = (last + (Math.random() * 2 - 1) * 0.04) * 0.985;
    data[i] = last;
  }
  return buf;
}

/** A short two-note bird chirp, routed into the bed's gain. */
function chirp(ac: AudioContext, dest: AudioNode) {
  const t0 = ac.currentTime;
  const base = 2400 + Math.random() * 900;
  for (const [at, f, to] of [
    [0, base, base * 1.18],
    [0.09, base * 1.1, base * 0.9],
  ] as const) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, t0 + at);
    osc.frequency.exponentialRampToValueAtTime(to, t0 + at + 0.07);
    g.gain.setValueAtTime(0.0001, t0 + at);
    g.gain.exponentialRampToValueAtTime(0.05 * MASTER, t0 + at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + 0.08);
    osc.connect(g).connect(dest);
    osc.start(t0 + at);
    osc.stop(t0 + at + 0.1);
  }
}

/** A sparse, soft plucked note — playful, never a melody. */
function pluck(ac: AudioContext, dest: AudioNode, freq: number) {
  const t0 = ac.currentTime;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.06 * MASTER, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
  osc.connect(g).connect(dest);
  osc.start(t0);
  osc.stop(t0 + 0.55);
}

const PENTA = [523.25, 587.33, 698.46, 783.99, 880.0]; // C D F G A — an open, wandering major

export const ambience = {
  /** Begin the bed. No-op if muted or already running. */
  start() {
    const ac = audio();
    if (!ac || amb) return;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.0001, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.9 * MASTER, ac.currentTime + 1.6);
    gain.connect(ac.destination);
    const state: Amb = { gain, nodes: [], timers: [], stopped: false };
    amb = state;

    // the wind bed — looping noise through a slowly breathing lowpass
    const src = ac.createBufferSource();
    src.buffer = noiseLoop(ac, 3);
    src.loop = true;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 480;
    const windG = ac.createGain();
    windG.gain.value = 0.5;
    const lfo = ac.createOscillator();
    lfo.frequency.value = 0.06;
    const lfoG = ac.createGain();
    lfoG.gain.value = 160;
    lfo.connect(lfoG).connect(lp.frequency);
    src.connect(lp).connect(windG).connect(gain);
    src.start();
    lfo.start();
    state.nodes.push(src, lfo);

    // sparse birds + plucks — recursive random schedulers, cleared on stop
    const scheduleBird = () => {
      if (state.stopped) return;
      chirp(ac, gain);
      state.timers.push(window.setTimeout(scheduleBird, 5000 + Math.random() * 9000));
    };
    const schedulePluck = () => {
      if (state.stopped) return;
      pluck(ac, gain, PENTA[Math.floor(Math.random() * PENTA.length)] as number);
      state.timers.push(window.setTimeout(schedulePluck, 4500 + Math.random() * 7000));
    };
    state.timers.push(window.setTimeout(scheduleBird, 2500 + Math.random() * 3000));
    state.timers.push(window.setTimeout(schedulePluck, 1800 + Math.random() * 3000));
  },

  /** Dip under Wobo's voice, or lift back. Safe to call when idle. */
  duck(on: boolean) {
    if (!amb || !ctx) return;
    const t = ctx.currentTime;
    amb.gain.gain.cancelScheduledValues(t);
    amb.gain.gain.linearRampToValueAtTime((on ? 0.35 : 0.9) * MASTER, t + 0.3);
  },

  /** Fade out and fully release. Idempotent — safe on every unmount. */
  stop() {
    if (!amb) return;
    const state = amb;
    amb = null;
    state.stopped = true;
    for (const t of state.timers) clearTimeout(t);
    if (!ctx) return;
    const now = ctx.currentTime;
    try {
      state.gain.gain.cancelScheduledValues(now);
      state.gain.gain.setValueAtTime(Math.max(0.0001, state.gain.gain.value), now);
      state.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    } catch {
      // ramp failed — nodes still stop below
    }
    for (const n of state.nodes) {
      try {
        n.stop(now + 0.65);
      } catch {
        // already stopped
      }
    }
    window.setTimeout(() => {
      try {
        state.gain.disconnect();
      } catch {
        // already disconnected
      }
    }, 800);
  },
};
