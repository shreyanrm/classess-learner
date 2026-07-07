'use client';

import { fontFamily, vidyaHighlight, zIndex } from '@classess/config';
import { useReducedMotion } from '@classess/motion';
import { useEffect, useState } from 'react';
import type { ActiveAnnotation, ActiveHighlight, ActiveNote } from './actions';
import { useVidyaBus } from './context-bus';
import { highlighterSwipe, inkRng, type Mark, markPath, noteRotation } from './freehand';

const DEFAULT_TTL = 6000;
const FADE = 500;
/** How long a single stroke takes to draw itself on, tied to the shared age clock. */
const DRAW_MS = 520;
/** Handwriting speed for Vidya's notes — a natural ~22 chars/sec. */
const MS_PER_CHAR = 45;

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
  if (age <= ttl - FADE) return 1;
  if (age >= ttl) return 0;
  return Math.max(0, (ttl - age) / FADE);
}

const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);

/** Dash-offset props that draw a path on over DRAW_MS on the SAME age clock (0 = fully drawn). */
function drawOn(
  age: number,
  reduced: boolean,
): { pathLength: number; strokeDasharray: string; strokeDashoffset: number } {
  const progress = reduced ? 1 : clamp01(age / DRAW_MS);
  return { pathLength: 1, strokeDasharray: '1', strokeDashoffset: 1 - progress };
}

/**
 * VidyaOverlay — the visible half of "every page is a canvas she's plugged into", drawn in her own
 * hand. Highlights are highlighter swipes, marks are seeded freehand strokes (no two identical), and
 * notes are written on letter-by-letter in Caveat at a slight margin tilt. Every stroke draws itself
 * on and then fades — TRANSIENT, living only for the ttl Vidya chose. Nothing is scaled: paths are
 * built to each target's real rect, so the pen nib stays a constant width. The overlay never
 * intercepts pointer events and casts no shadow.
 */
export function VidyaOverlay() {
  const bus = useVidyaBus();
  const reduced = useReducedMotion();
  const active = bus.highlights.length + bus.annotations.length + bus.notes.length > 0;
  useLiveTick(active);

  if (!active) return null;

  const age = performance.now() - bus.marksBornAt;
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
      {bus.highlights.map((h: ActiveHighlight) => {
        const rect = rectOf(h.targetId);
        if (!rect) return null;
        const opacity = fadeOpacity(age, h.ttl ?? DEFAULT_TTL);
        if (opacity <= 0) return null;
        const color = vidyaHighlight[h.level];
        const pad = 6;
        const w = rect.width + pad * 2;
        const hh = rect.height + pad * 2;
        const rng = inkRng(h.targetId, 'highlight', h.level + reink);
        const d = highlighterSwipe(w, hh, rng);
        return (
          <svg
            key={`hl-${h.targetId}-${h.level}`}
            width={w}
            height={hh}
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: rect.left - pad,
              top: rect.top - pad,
              overflow: 'visible',
              opacity: opacity * 0.28, // a broad, soft marker pass — ink, never a border box
              transform: `skewX(-4deg)`,
            }}
          >
            <path
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={hh * 0.92}
              strokeLinecap="round"
              {...drawOn(age, reduced)}
            />
          </svg>
        );
      })}

      {bus.annotations.map((a: ActiveAnnotation) => {
        const rect = rectOf(a.targetId);
        if (!rect) return null;
        const opacity = fadeOpacity(age, a.ttl ?? DEFAULT_TTL);
        if (opacity <= 0) return null;
        const rng = inkRng(a.targetId, a.mark, a.level + reink);
        const d = markPath(a.mark as Mark, rect.width, rect.height, rng);
        return (
          <svg
            key={`an-${a.targetId}-${a.mark}-${a.level}`}
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
              {...drawOn(age, reduced)}
            />
          </svg>
        );
      })}

      {bus.notes.map((n: ActiveNote) => {
        const rect = rectOf(n.targetId);
        if (!rect) return null;
        const ttl = n.ttl ?? DEFAULT_TTL;
        const opacity = fadeOpacity(age, ttl);
        if (opacity <= 0) return null;
        // Type the note on, letter by letter, like a hand writing it.
        const shown = Math.min(n.text.length, Math.max(0, Math.floor(age / MS_PER_CHAR)));
        const typing = shown < n.text.length && age < ttl - FADE;
        const rng = inkRng(n.targetId, 'note', n.level + reink);
        const tilt = reduced ? 0 : noteRotation(rng);
        const nudgeX = Math.round((rng() * 2 - 1) * 6); // a small margin drift, not pinned to the edge
        return (
          <div
            key={`nt-${n.targetId}-${n.level}`}
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
