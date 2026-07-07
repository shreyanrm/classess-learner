'use client';

import { fontFamily, vidyaHighlight, zIndex } from '@classess/config';
import { useReducedMotion } from '@classess/motion';
import { useEffect, useState } from 'react';
import type { ActiveAnnotation, ActiveHighlight, ActiveNote } from './actions';
import { useVidyaBus } from './context-bus';
import { highlighterSwipe, inkRng, type Mark, markPath, noteRotation } from './freehand';

const DEFAULT_TTL = 6000;
const FADE = 500;
/** A highlighter wash is attention, not a pen — it blooms in softly over this window (owner law). */
const WASH_FADE_IN = 260;
/** Natural handwriting pace when her voice isn't pacing the note — ~28ms/char (owner: muted fallback). */
const MS_PER_CHAR = 28;
/** How fast the pen travels along a stroke, px/ms — a believable hand, not an instant reveal. */
const PEN_PX_PER_MS = 0.6;
const MIN_STROKE_MS = 380;
const MAX_STROKE_MS = 1200;

/** Keep marks glued to their moving targets AND drive the draw/fade/typing clock: re-measure every frame. */
function useLiveTick(active: boolean): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const loop = () => {
      setTick((t) => (t + 1) % 1_000_000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);
  return tick;
}

/** 1 while alive, ramps to 0 over the last FADE ms of the mark's life. */
function fadeOpacity(age: number, ttl: number): number {
  if (age >= ttl) return 0;
  if (age <= ttl - FADE) return 1;
  return Math.max(0, (ttl - age) / FADE);
}

const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);
/** Ease-out cubic — the pen decelerates into the finish of a stroke, the way a hand lifts. */
const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;

/** Rough drawn length of a mark, in px, so a long arrow takes longer to ink than a short tick. */
function strokeLen(mark: Mark, w: number, h: number): number {
  switch (mark) {
    case 'underline':
      return w + 6;
    case 'circle':
      return 2.15 * Math.PI * ((w + h) / 2 + 9); // two passes round the term
    case 'crossOut':
      return 2 * Math.hypot(w, h * 0.25);
    case 'arrow':
      return Math.hypot(Math.max(48, w * 0.5), Math.max(18, h * 0.35)) + 26; // shaft, then the head
    case 'bracket':
      return h + 12;
    case 'check':
      return Math.min(Math.max(Math.min(w, h), 22), 40) * 1.7;
    default:
      return 46; // lookHere — a small quick tick
  }
}

/** How long this stroke takes to draw itself on — pen speed, with a seeded ±10% micro-variation. */
function strokeDurationMs(mark: Mark, w: number, h: number, rng: () => number): number {
  const raw = (strokeLen(mark, w, h) / PEN_PX_PER_MS) * (0.9 + rng() * 0.2);
  return Math.max(MIN_STROKE_MS, Math.min(MAX_STROKE_MS, raw));
}

/** Dash-offset props that draw a path on over `duration` ms, eased like a moving pen (0 = fully drawn). */
function drawOn(
  age: number,
  duration: number,
  reduced: boolean,
): { pathLength: number; strokeDasharray: string; strokeDashoffset: number } {
  const progress = reduced ? 1 : easeOutCubic(clamp01(age / duration));
  return { pathLength: 1, strokeDasharray: '1', strokeDashoffset: 1 - progress };
}

/**
 * VidyaOverlay — the visible half of "every page is a canvas she's plugged into", drawn in her own
 * hand. Highlighter washes bloom in softly (attention, not a pen); every stroke mark DRAWS ITSELF
 * ON like a moving pen — the arrow grows along its shaft with the head arriving last, the circle
 * sweeps its arc, the underline travels left to right — at a believable, slightly varying hand
 * speed. Notes are written on letter-by-letter in Caveat, paced to her voice when a sentence beat
 * carries them (THE SYNCED HAND) or at a natural handwriting pace when muted. Each mark runs on its
 * OWN birth clock, so a choreographed turn accumulates ink beat by beat instead of popping in at
 * once. Nothing is scaled: paths are built to each target's real rect, so the pen nib stays a
 * constant width. The overlay never intercepts pointer events and casts no shadow.
 */
export function VidyaOverlay() {
  const bus = useVidyaBus();
  const reduced = useReducedMotion();
  const active = bus.highlights.length + bus.annotations.length + bus.notes.length > 0;
  useLiveTick(active);

  if (!active) return null;

  const now = performance.now();
  /** Each mark ages from its own paint time; a pre-timeline turn shares the dispatch clock. */
  const ageOf = (bornAt: number | undefined): number => now - (bornAt ?? bus.marksBornAt);
  // When she re-inks a faded set, the nonce reseeds every stroke so the redraw is genuinely fresh
  // (a new hand-drawn pass), not a pixel-identical copy of what faded.
  const reink = bus.reinkNonce ? String(bus.reinkNonce) : '';
  const rectOf = (targetId: string): DOMRect | null =>
    bus
      .getTargets()
      .find((t) => t.id === targetId)
      ?.getRect() ?? null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: zIndex.vidyaPresence - 10,
      }}
    >
      {bus.highlights.map((h: ActiveHighlight, i) => {
        const rect = rectOf(h.targetId);
        if (!rect) return null;
        const age = ageOf(h.bornAt);
        const life = fadeOpacity(age, h.ttl ?? DEFAULT_TTL);
        if (life <= 0) return null;
        // The wash is attention, not a pen: it blooms in softly rather than drawing on.
        const bloom = reduced ? 1 : clamp01(age / WASH_FADE_IN);
        const color = vidyaHighlight[h.level];
        const pad = 6;
        const w = rect.width + pad * 2;
        const hh = rect.height + pad * 2;
        const rng = inkRng(h.targetId, 'highlight', h.level + reink);
        const d = highlighterSwipe(w, hh, rng);
        return (
          <svg
            key={`hl-${h.targetId}-${h.level}-${i}`}
            width={w}
            height={hh}
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: rect.left - pad,
              top: rect.top - pad,
              overflow: 'visible',
              opacity: life * bloom * 0.28, // a broad, soft marker pass — ink, never a border box
              transform: `skewX(-4deg)`,
            }}
          >
            <path
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={hh * 0.92}
              strokeLinecap="round"
            />
          </svg>
        );
      })}

      {bus.annotations.map((a: ActiveAnnotation, i) => {
        const rect = rectOf(a.targetId);
        if (!rect) return null;
        const age = ageOf(a.bornAt);
        const opacity = fadeOpacity(age, a.ttl ?? DEFAULT_TTL);
        if (opacity <= 0) return null;
        const rng = inkRng(a.targetId, a.mark, a.level + reink);
        const mark = a.mark as Mark;
        const d = markPath(mark, rect.width, rect.height, rng);
        // A fresh rng for the duration so the seeded ±10% pen-speed variation doesn't disturb the path.
        const duration = strokeDurationMs(mark, rect.width, rect.height, inkRng(a.targetId, a.mark, `dur${a.level}${reink}`));
        return (
          <svg
            key={`an-${a.targetId}-${a.mark}-${a.level}-${i}`}
            width={rect.width}
            height={rect.height}
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: rect.left,
              top: rect.top,
              overflow: 'visible',
              opacity,
            }}
          >
            <path
              d={d}
              fill="none"
              stroke={vidyaHighlight[a.level]}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              {...drawOn(age, duration, reduced)}
            />
          </svg>
        );
      })}

      {bus.notes.map((n: ActiveNote, i) => {
        const rect = rectOf(n.targetId);
        if (!rect) return null;
        const ttl = n.ttl ?? DEFAULT_TTL;
        const age = ageOf(n.bornAt);
        const opacity = fadeOpacity(age, ttl);
        if (opacity <= 0) return null;
        const rng = inkRng(n.targetId, 'note', n.level + reink);
        // Write the note on letter by letter. When a sentence beat set durationMs, the hand keeps
        // pace with her voice; otherwise a natural pace with a per-note pen-speed variation.
        const speedVar = 0.88 + rng() * 0.24;
        const writeDur = n.durationMs ?? n.text.length * MS_PER_CHAR * speedVar;
        const shown = reduced
          ? n.text.length
          : Math.min(n.text.length, Math.max(0, Math.floor(clamp01(age / writeDur) * n.text.length)));
        const typing = shown < n.text.length && age < ttl - FADE;
        const tilt = reduced ? 0 : noteRotation(rng);
        const nudgeX = Math.round((rng() * 2 - 1) * 6); // a small margin drift, not pinned to the edge
        return (
          <div
            key={`nt-${n.targetId}-${n.level}-${i}`}
            style={{
              position: 'absolute',
              left: rect.left + nudgeX,
              top: rect.bottom + 6,
              maxWidth: Math.max(rect.width, 220),
              fontFamily: fontFamily.handwritten,
              fontSize: '1.5rem',
              lineHeight: 1.25,
              color: vidyaHighlight[n.level],
              opacity,
              transform: `rotate(${tilt}deg)`,
              transformOrigin: 'left center',
            }}
          >
            {n.text.slice(0, shown)}
            {typing && (
              <span
                aria-hidden
                style={{
                  display: 'inline-block',
                  width: 2,
                  height: '1.05em',
                  marginLeft: 1,
                  transform: 'translateY(3px)',
                  background: vidyaHighlight[n.level],
                  opacity: Math.floor(age / 300) % 2 === 0 ? 1 : 0.2,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
