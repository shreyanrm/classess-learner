'use client';

/**
 * MotionPlayer — the in-app video engine. Plays a motion-scene JSON artifact (engine.motion):
 * timed scenes with spring transitions between visuals, a play/pause scrub bar, and narration
 * audio kept in sync when present. Explainer "videos" here are motion pieces rendered live,
 * never video files (DESIGN.md §9) — the narration track is the TTS pipeline's output.
 */

import { useRegisterTarget } from '@classess/vidya';
import { AnimatePresence, motion } from 'framer-motion';
import {
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { lead, whisper } from '../screens/course/shared';
import { SafeSvg, svgIsClean } from './DiagramView';

// --- The motion-scene spec ------------------------------------------------------------------------

export type MotionVisual =
  | { kind: 'svg'; svg: string }
  | { kind: 'image'; src: string; alt?: string };

export interface MotionStep {
  id: string;
  durationMs: number;
  caption?: string;
  visual: MotionVisual;
}

export interface MotionScene {
  id: string;
  title?: string;
  steps: MotionStep[];
  narration?: { src: string };
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

const isSafeMediaSrc = (src: string): boolean => /^(https?:\/\/|data:(image|audio)\/)/.test(src);

function parseVisual(raw: Record<string, unknown>): MotionVisual | null {
  const visual = isRecord(raw.visual) ? raw.visual : raw;
  const svg = typeof visual.svg === 'string' ? visual.svg : null;
  if (svg && svgIsClean(svg)) return { kind: 'svg', svg };
  const src = typeof visual.src === 'string' ? visual.src : null;
  if (src && isSafeMediaSrc(src)) {
    return { kind: 'image', src, alt: typeof visual.alt === 'string' ? visual.alt : undefined };
  }
  return null;
}

/**
 * Validates a generated motion-scene. Steps that cannot be rendered (unclean SVG, unsafe src) are
 * dropped; a scene with nothing left is refused — the caller falls back invisibly.
 */
export function parseMotionScene(raw: unknown): MotionScene | null {
  if (!isRecord(raw)) return null;
  const src = isRecord(raw.scene) ? raw.scene : raw;
  if (src.verified === false) return null;
  const rawSteps = Array.isArray(src.steps)
    ? src.steps
    : Array.isArray(src.scenes)
      ? src.scenes
      : [];
  const steps: MotionStep[] = [];
  rawSteps.forEach((s, i) => {
    if (!isRecord(s)) return;
    const durationRaw = s.durationMs ?? s.duration_ms;
    const durationMs = typeof durationRaw === 'number' ? durationRaw : Number.NaN;
    if (!Number.isFinite(durationMs) || durationMs <= 0 || durationMs > 300_000) return;
    const visual = parseVisual(s);
    if (!visual) return;
    steps.push({
      id: typeof s.id === 'string' ? s.id : `step-${i}`,
      durationMs,
      caption: typeof s.caption === 'string' ? s.caption : undefined,
      visual,
    });
  });
  if (steps.length === 0) return null;
  const narrationSrc =
    isRecord(src.narration) && typeof src.narration.src === 'string'
      ? src.narration.src
      : typeof src.narration_src === 'string'
        ? src.narration_src
        : null;
  return {
    id: typeof src.id === 'string' ? src.id : 'motion',
    title: typeof src.title === 'string' ? src.title : undefined,
    steps,
    narration: narrationSrc && isSafeMediaSrc(narrationSrc) ? { src: narrationSrc } : undefined,
  };
}

// --- Transport chrome -----------------------------------------------------------------------------

function clock(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function PlayIcon({ playing }: { playing: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      role="presentation"
      aria-hidden
      style={{ display: 'block' }}
    >
      {playing ? (
        <>
          <rect x="2.5" y="1.5" width="3.2" height="11" fill="currentColor" />
          <rect x="8.3" y="1.5" width="3.2" height="11" fill="currentColor" />
        </>
      ) : (
        <path d="M3.5 1.5 L12 7 L3.5 12.5 Z" fill="currentColor" />
      )}
    </svg>
  );
}

function ScrubBar({ fraction, onSeek }: { fraction: number; onSeek: (f: number) => void }) {
  const track = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const seekFromX = (clientX: number) => {
    const rect = track.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    onSeek(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)));
  };
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    seekFromX(e.clientX);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragging.current) seekFromX(e.clientX);
  };
  const onPointerUp = () => {
    dragging.current = false;
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onSeek(Math.min(1, fraction + 0.05));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onSeek(Math.max(0, fraction - 0.05));
    }
  };

  return (
    <div
      role="slider"
      aria-label="Playback position"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(fraction * 100)}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      style={{
        flex: 1,
        height: 18,
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer',
        touchAction: 'none',
        outlineOffset: 3,
      }}
    >
      <div ref={track} style={{ flex: 1, height: 3, background: 'var(--clss-ink-100)' }}>
        <div
          style={{
            width: `${Math.max(0, Math.min(1, fraction)) * 100}%`,
            height: '100%',
            background: 'var(--clss-ink-900)',
          }}
        />
      </div>
    </div>
  );
}

// --- The player -----------------------------------------------------------------------------------

export function MotionPlayer({ scene }: { scene: MotionScene }) {
  const total = useMemo(() => scene.steps.reduce((sum, s) => sum + s.durationMs, 0), [scene]);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const elapsedRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const stageRef = useRegisterTarget<HTMLDivElement>(`motion-${scene.id}`, {
    kind: 'motion',
    label: scene.title
      ? `the motion explainer "${scene.title}" — scenes play in sequence`
      : 'the motion explainer playing on this card',
  });

  // the clock: rAF-driven; when narration exists and is playing, audio time is the truth
  useEffect(() => {
    if (!playing) return;
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = elapsedRef.current / 1000;
      void audio.play().catch(() => {});
    }
    let last = performance.now();
    let raf = requestAnimationFrame(function tick(now: number) {
      const a = audioRef.current;
      const next =
        a && !a.paused && !a.ended ? a.currentTime * 1000 : elapsedRef.current + (now - last);
      last = now;
      elapsedRef.current = Math.min(next, total);
      setElapsed(elapsedRef.current);
      if (elapsedRef.current >= total) {
        setPlaying(false);
        a?.pause();
        return;
      }
      raf = requestAnimationFrame(tick);
    });
    return () => {
      cancelAnimationFrame(raf);
      audioRef.current?.pause();
    };
  }, [playing, total]);

  const seekTo = (fraction: number) => {
    const ms = Math.max(0, Math.min(total, fraction * total));
    elapsedRef.current = ms;
    setElapsed(ms);
    const audio = audioRef.current;
    if (audio) audio.currentTime = ms / 1000;
  };

  const toggle = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (elapsedRef.current >= total) seekTo(0);
    setPlaying(true);
  };

  const current = useMemo(() => {
    let acc = 0;
    for (const step of scene.steps) {
      acc += step.durationMs;
      if (elapsed < acc) return step;
    }
    return scene.steps[scene.steps.length - 1];
  }, [scene, elapsed]);

  if (!current) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* the stage — scenes hand over on springs */}
      <div
        ref={stageRef}
        style={{
          position: 'relative',
          width: '100%',
          minHeight: 220,
          border: '0.5px solid var(--clss-hairline-on-paper)',
          borderRadius: 'var(--clss-radius-md)',
          background: 'var(--clss-paper)',
          overflow: 'hidden',
          display: 'grid',
          placeItems: 'center',
          padding: 18,
        }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -14, scale: 0.99 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            style={{ width: '100%' }}
          >
            {current.visual.kind === 'svg' ? (
              <SafeSvg
                svg={current.visual.svg}
                label={current.caption ?? scene.title ?? 'motion scene'}
              />
            ) : (
              <img
                src={current.visual.src}
                alt={current.visual.alt ?? current.caption ?? ''}
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* the caption of the scene on stage */}
      <div style={{ minHeight: 30 }}>
        <AnimatePresence mode="wait" initial={false}>
          {current.caption && (
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
              style={{ ...lead, textAlign: 'center' }}
            >
              {current.caption}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* transport: play/pause, scrub, clock */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          type="button"
          aria-label={playing ? 'Pause' : 'Play'}
          onClick={toggle}
          style={{
            width: 34,
            height: 34,
            display: 'grid',
            placeItems: 'center',
            border: '0.5px solid var(--clss-hairline-on-paper-strong)',
            borderRadius: 999,
            background: 'var(--clss-paper)',
            color: 'var(--clss-ink-900)',
            cursor: 'pointer',
          }}
        >
          <PlayIcon playing={playing} />
        </button>
        <ScrubBar fraction={total > 0 ? elapsed / total : 0} onSeek={seekTo} />
        <span style={{ ...whisper, fontVariantNumeric: 'tabular-nums' }}>
          {clock(elapsed)} / {clock(total)}
        </span>
      </div>

      {scene.narration && (
        // ponytail: sync is rAF-vs-audio-clock; drift is imperceptible at these durations
        // biome-ignore lint/a11y/useMediaCaption: the narration text renders on-screen as the scene captions, in sync
        <audio ref={audioRef} src={scene.narration.src} preload="auto" />
      )}
    </div>
  );
}
