'use client';

/**
 * PodcastPlayer — an audio lecture for learning and revision (DESIGN.md §9, "podcasts"). The
 * composer emits a chaptered script; the client synthesizes each chapter through the same TTS seam
 * Wobo speaks with (the gateway /v1/voice/tts endpoint + base64ToFloat32), so no audio ships in the
 * artifact. A chaptered scrubber, playback speed, and a minimize toggle let it keep playing while
 * the learner browses the rest of the card. Keyless / offline / muted → it degrades to a transcript
 * reader that auto-advances on a reading clock; the words are always there, the voice is the grace.
 *
 * Registers as a Wobo scene target (Wobo can play, pause, and jump chapters). No new deps.
 * ponytail: minimize collapses within the card; a truly floating cross-page dock is the upgrade path.
 */

import { gatewayFetch } from '@wobo/sdk';
import { useRegisterTarget, useWoboBus } from '@wobo/wobo';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { BarState } from '../screens/course/shared';
import { CardBody, cardTitle, lead, rgba, whisper } from '../screens/course/shared';
import { isOffline } from '../shell/resilience';
import { hueForTopic } from '../ui/hues';
import { isMuted } from '../wobo/speech';
import { base64ToFloat32 } from '../wobo/voice';

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL;

// --- The spec ------------------------------------------------------------------------------------

export interface PodcastChapter {
  id: string;
  title: string;
  /** One chapter's spoken script. Capped at the TTS seam's limit so one chapter = one synth call. */
  script: string;
}

export interface PodcastSpec {
  id: string;
  title: string;
  chapters: PodcastChapter[];
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const str = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';

export function parsePodcast(raw: unknown): PodcastSpec | null {
  if (!isRecord(raw)) return null;
  const src = isRecord(raw.artifact) ? raw.artifact : raw;
  if (raw.verified === false || src.verified === false) return null;
  const chapters = (Array.isArray(src.chapters) ? src.chapters : [])
    .filter((c): c is Record<string, unknown> => isRecord(c) && str(c.title) && str(c.script))
    .map((c, i) => ({
      id: str(c.id) ? (c.id as string) : `ch${i + 1}`,
      title: c.title as string,
      script: (c.script as string).slice(0, 600),
    }));
  if (chapters.length === 0 || chapters.length > 12) return null;
  return {
    id: str(src.id) ? src.id : 'podcast',
    title: str(src.title) ? src.title : 'the lecture',
    chapters,
  };
}

// --- Reading-clock estimate (the muted / keyless fallback duration for a chapter) -----------------

function estMs(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(3000, (words / 165) * 60000); // ~165 wpm
}

const SPEEDS = [1, 1.25, 1.5, 0.75] as const;

// --- The player ----------------------------------------------------------------------------------

export function PodcastPlayer({
  spec,
  hue = hueForTopic(''),
  setBar,
  onDone,
}: {
  spec: PodcastSpec;
  hue?: string;
  setBar?: (b: BarState | null) => void;
  onDone?: () => void;
}) {
  const bus = useWoboBus();
  const audioMode = Boolean(GATEWAY_URL) && !isOffline() && !isMuted();

  const [chapter, setChapter] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1 within the current chapter
  const [rate, setRate] = useState(1);
  const [minimized, setMinimized] = useState(false);
  const [heard, setHeard] = useState<Set<number>>(() => new Set());

  // audio engine refs
  const ctxRef = useRef<AudioContext | null>(null);
  const srcRef = useRef<AudioBufferSourceNode | null>(null);
  const buffers = useRef<Map<number, AudioBuffer | null>>(new Map());
  const offsetRef = useRef(0); // seconds already played of the current chapter (at 1x)
  const startedAtRef = useRef(0); // ctx time when the current source started
  const rafRef = useRef(0);
  const clockRef = useRef<{ start: number; dur: number } | null>(null); // transcript-mode clock

  const ctx = useCallback((): AudioContext | null => {
    try {
      if (!ctxRef.current) {
        const Ctor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        ctxRef.current = new Ctor();
      }
      return ctxRef.current;
    } catch {
      return null;
    }
  }, []);

  const synth = useCallback(
    async (i: number): Promise<AudioBuffer | null> => {
      if (buffers.current.has(i)) return buffers.current.get(i) ?? null;
      const ac = ctx();
      const chap = spec.chapters[i];
      if (!ac || !chap || !GATEWAY_URL) return null;
      try {
        // Identity rides the call (gatewayFetch): the brain meters the lecture like every other
        // spoken line. A refusal drops the chapter to its transcript, which is always there.
        const res = await gatewayFetch(`${GATEWAY_URL}/v1/voice/tts`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text: chap.script }),
        });
        if (!res.ok) return null;
        const data = (await res.json()) as { mime?: string; b64?: string };
        if (!data.b64) return null;
        const sampleRate = Number(/rate=(\d+)/.exec(data.mime ?? '')?.[1] ?? 24000);
        const samples = base64ToFloat32(data.b64);
        if (samples.length === 0) return null;
        const buf = ac.createBuffer(1, samples.length, sampleRate);
        buf.copyToChannel(samples, 0);
        buffers.current.set(i, buf);
        return buf;
      } catch {
        buffers.current.set(i, null);
        return null;
      }
    },
    [ctx, spec],
  );

  const stopSource = useCallback(() => {
    if (srcRef.current) {
      try {
        srcRef.current.onended = null;
        srcRef.current.stop();
      } catch {
        // already stopped
      }
      srcRef.current = null;
    }
    cancelAnimationFrame(rafRef.current);
  }, []);

  // advance to the next chapter (or finish)
  const finishChapter = useCallback(() => {
    setHeard((h) => new Set(h).add(chapter));
    if (chapter >= spec.chapters.length - 1) {
      setPlaying(false);
      setProgress(1);
      return;
    }
    offsetRef.current = 0;
    setProgress(0);
    setChapter((c) => c + 1);
  }, [chapter, spec.chapters.length]);

  // the rAF progress loop for audio mode
  const runAudioClock = useCallback(
    (buf: AudioBuffer) => {
      const ac = ctxRef.current;
      if (!ac) return;
      const tick = () => {
        const played = offsetRef.current + (ac.currentTime - startedAtRef.current) * rate;
        setProgress(Math.min(1, played / buf.duration));
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [rate],
  );

  // play the current chapter from offsetRef (audio) or start the reading clock (transcript)
  const play = useCallback(async () => {
    setPlaying(true);
    if (!audioMode) {
      // transcript mode — a reading clock advances the chapter
      const dur = estMs(spec.chapters[chapter]?.script ?? '') / rate;
      clockRef.current = { start: performance.now() - progress * dur, dur };
      const tick = () => {
        const c = clockRef.current;
        if (!c) return;
        const p = (performance.now() - c.start) / c.dur;
        setProgress(Math.min(1, p));
        if (p >= 1) {
          finishChapter();
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    const ac = ctx();
    if (!ac) return;
    if (ac.state === 'suspended') await ac.resume().catch(() => {});
    const buf = await synth(chapter);
    if (!buf) {
      // synth failed for this chapter — fall back to the reading clock for it
      const dur = estMs(spec.chapters[chapter]?.script ?? '') / rate;
      clockRef.current = { start: performance.now() - progress * dur, dur };
      const tick = () => {
        const c = clockRef.current;
        if (!c) return;
        const p = (performance.now() - c.start) / c.dur;
        setProgress(Math.min(1, p));
        if (p >= 1) return finishChapter();
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    stopSource();
    const source = ac.createBufferSource();
    source.buffer = buf;
    source.playbackRate.value = rate;
    source.connect(ac.destination);
    source.onended = () => {
      if (srcRef.current === source) finishChapter();
    };
    startedAtRef.current = ac.currentTime;
    source.start(0, Math.min(offsetRef.current, buf.duration - 0.02));
    srcRef.current = source;
    runAudioClock(buf);
    // warm the next chapter so the gap between chapters is silent
    void synth(chapter + 1);
  }, [
    audioMode,
    ctx,
    synth,
    chapter,
    rate,
    progress,
    stopSource,
    runAudioClock,
    finishChapter,
    spec,
  ]);

  const pause = useCallback(() => {
    setPlaying(false);
    if (audioMode && srcRef.current && ctxRef.current) {
      offsetRef.current += (ctxRef.current.currentTime - startedAtRef.current) * rate;
    } else if (clockRef.current) {
      // freeze the transcript clock at the current progress
      clockRef.current = null;
    }
    stopSource();
    cancelAnimationFrame(rafRef.current);
  }, [audioMode, rate, stopSource]);

  const toggle = useCallback(() => {
    if (playing) pause();
    else void play();
  }, [playing, play, pause]);

  const jumpTo = useCallback(
    (i: number) => {
      const wasPlaying = playing;
      pause();
      offsetRef.current = 0;
      setProgress(0);
      setChapter(i);
      if (wasPlaying) window.setTimeout(() => void play(), 20);
    },
    [playing, pause, play],
  );

  const cycleRate = useCallback(() => {
    const nextRate =
      SPEEDS[(SPEEDS.indexOf(rate as (typeof SPEEDS)[number]) + 1) % SPEEDS.length] ?? 1;
    setRate(nextRate);
    if (srcRef.current && ctxRef.current) {
      // keep the audio position continuous when the rate changes mid-play
      offsetRef.current += (ctxRef.current.currentTime - startedAtRef.current) * rate;
      startedAtRef.current = ctxRef.current.currentTime;
      srcRef.current.playbackRate.value = nextRate;
    }
  }, [rate]);

  // when the chapter changes while playing, start the new chapter's audio
  const chapterRef = useRef(chapter);
  useEffect(() => {
    if (chapterRef.current !== chapter) {
      chapterRef.current = chapter;
      if (playing) void play();
    }
  }, [chapter, playing, play]);

  useEffect(
    () => () => {
      stopSource();
      void ctxRef.current?.close();
    },
    [stopSource],
  );

  // optional course-card action bar — advance is always available (a lecture is never a wall)
  useEffect(() => {
    setBar?.({ primary: { label: 'continue', onClick: () => onDone?.() } });
  }, [setBar, onDone]);

  const chap = spec.chapters[chapter];
  const totalProgress = (chapter + progress) / spec.chapters.length;

  const stageRef = useRegisterTarget<HTMLDivElement>(`podcast-${spec.id}`, {
    kind: 'podcast',
    label: `audio lecture: ${spec.title}`,
    getSceneState: () => ({
      title: spec.title,
      chapter: chap?.title,
      index: `${chapter + 1} of ${spec.chapters.length}`,
      playing,
      speed: `${rate}x`,
      audio: audioMode,
    }),
    getValidActions: () => [playing ? 'pause' : 'play', 'jump to a chapter', 'change speed'],
    applyTutorAction: (patch) => {
      if (patch.play === true) return void play();
      if (patch.pause === true) return pause();
      if (typeof patch.chapter === 'number')
        return jumpTo(Math.max(0, Math.min(spec.chapters.length - 1, patch.chapter)));
    },
  });

  useEffect(() => {
    bus.publishCanvas({
      nodeId: `podcast-${spec.id}`,
      steps: [
        `podcast: ${spec.title}`,
        `chapter ${chapter + 1}/${spec.chapters.length}: ${chap?.title ?? ''}`,
        playing ? `playing at ${rate}x` : 'paused',
      ],
      lastEditedAt: new Date().toISOString(),
    });
  }, [bus, spec, chapter, chap, playing, rate]);
  useEffect(() => () => bus.publishCanvas(undefined), [bus]);

  // --- the minimized dock ---
  if (minimized) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 14px',
          border: `0.5px solid ${rgba(hue, 0.5)}`,
          borderRadius: 999,
          background: rgba(hue, 0.05),
        }}
      >
        <PlayButton playing={playing} hue={hue} onClick={toggle} size={30} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '0.85rem',
              fontWeight: 520,
              color: 'var(--wobo-ink-900)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {chap?.title}
          </div>
          <div
            style={{
              height: 2,
              marginTop: 4,
              background: 'var(--wobo-ink-100)',
              borderRadius: 10,
              overflow: 'hidden',
            }}
          >
            <div style={{ height: '100%', width: `${totalProgress * 100}%`, background: hue }} />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMinimized(false)}
          aria-label="expand the player"
          style={iconBtn}
        >
          ▴
        </button>
      </div>
    );
  }

  return (
    <CardBody maxWidth={620} center={false}>
      <div ref={stageRef} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: 12,
          }}
        >
          <div>
            <div style={whisper}>
              listen · a lecture in chapters{audioMode ? '' : ' · transcript'}
            </div>
            <div style={{ ...cardTitle, marginTop: 8 }}>{spec.title}</div>
          </div>
          <button
            type="button"
            onClick={() => setMinimized(true)}
            aria-label="minimize the player"
            style={iconBtn}
          >
            ▾
          </button>
        </div>

        {/* the now-playing chapter, its script as the transcript */}
        <div
          style={{
            border: `0.5px solid ${rgba(hue, 0.5)}`,
            borderRadius: 10,
            padding: '20px 22px',
            background: rgba(hue, 0.04),
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <PlayButton playing={playing} hue={hue} onClick={toggle} size={54} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 540, color: 'var(--wobo-ink-900)' }}>
                {chap?.title}
              </div>
              <div style={{ ...whisper, marginTop: 4 }}>
                chapter {chapter + 1} of {spec.chapters.length}
              </div>
            </div>
            <button
              type="button"
              onClick={cycleRate}
              aria-label={`playback speed ${rate}x`}
              style={{
                padding: '6px 12px',
                borderRadius: 999,
                border: `1px solid ${hue}`,
                background: rgba(hue, 0.1),
                color: 'var(--wobo-ink-900)',
                fontFamily: 'inherit',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {rate}×
            </button>
          </div>

          {/* the chapter scrubber */}
          <div
            role="progressbar"
            aria-valuenow={Math.round(progress * 100)}
            style={{
              height: 4,
              background: 'var(--wobo-ink-100)',
              borderRadius: 10,
              overflow: 'hidden',
            }}
          >
            <motion.div
              animate={{ width: `${progress * 100}%` }}
              transition={{ ease: 'linear', duration: 0.1 }}
              style={{ height: '100%', background: hue }}
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.p
              key={chapter}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ ...lead, color: 'var(--wobo-ink-700)', margin: 0 }}
            >
              {chap?.script}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* the chapter list — the chaptered scrubber, jump anywhere */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {spec.chapters.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => jumpTo(i)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 10,
                border: 'none',
                background: i === chapter ? rgba(hue, 0.08) : 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
              }}
            >
              <span
                style={{
                  minWidth: 22,
                  height: 22,
                  borderRadius: 999,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  background: heard.has(i)
                    ? hue
                    : i === chapter
                      ? rgba(hue, 0.2)
                      : 'var(--wobo-tonal)',
                  color: heard.has(i) ? 'var(--wobo-on-ink)' : 'var(--wobo-ink-500)',
                }}
              >
                {i + 1}
              </span>
              <span
                style={{
                  fontSize: '0.95rem',
                  color: i === chapter ? 'var(--wobo-ink-900)' : 'var(--wobo-ink-700)',
                  fontWeight: i === chapter ? 540 : 400,
                }}
              >
                {c.title}
              </span>
            </button>
          ))}
        </div>
      </div>
    </CardBody>
  );
}

const iconBtn = {
  border: 'none',
  background: 'transparent',
  color: 'var(--wobo-ink-500)',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: '0.9rem',
  padding: 6,
} as const;

function PlayButton({
  playing,
  hue,
  onClick,
  size,
}: {
  playing: boolean;
  hue: string;
  onClick: () => void;
  size: number;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      aria-label={playing ? 'pause' : 'play'}
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        border: 'none',
        background: hue,
        color: 'var(--wobo-on-ink)',
        display: 'grid',
        placeItems: 'center',
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      <svg
        width={size * 0.42}
        height={size * 0.42}
        viewBox="0 0 20 20"
        fill="currentColor"
        role="img"
        aria-hidden
      >
        <title>{playing ? 'pause' : 'play'}</title>
        {playing ? (
          <>
            <rect x={4} y={3} width={4} height={14} rx={1} />
            <rect x={12} y={3} width={4} height={14} rx={1} />
          </>
        ) : (
          <path d="M5 3.5 L16 10 L5 16.5 Z" />
        )}
      </svg>
    </motion.button>
  );
}

// --- A hand-authored demo -------------------------------------------------------------------------

export const PODCAST_DEMO: PodcastSpec = {
  id: 'demo-podcast',
  title: 'the atom, out loud',
  chapters: [
    {
      id: 'c1',
      title: 'mostly empty space',
      script:
        'here is the strangest thing about the atom. it is almost entirely empty. if the nucleus were a marble on the halfway line of a football field, the electrons would drift somewhere out by the stands. everything you touch is, at heart, mostly nothing.',
    },
    {
      id: 'c2',
      title: 'the proton decides everything',
      script:
        'so what makes gold gold, and carbon carbon? one number. the count of protons in the nucleus. six protons is always carbon. seventy-nine is always gold. change that number and you have literally changed the element.',
    },
    {
      id: 'c3',
      title: 'why the shells matter',
      script:
        'the electrons live in shells, at a distance, and it is the outermost shell that does the talking. that shell is why sodium is so eager and why neon wants nothing to do with anyone. chemistry, all of it, is really a story about that outer ring.',
    },
  ],
};
