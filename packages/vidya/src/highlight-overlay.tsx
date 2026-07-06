'use client';

import { fontFamily, radius, vidyaHighlight, zIndex } from '@classess/config';
import { Arrow, Bracket, Check, Circle, CrossOut, LookHere, Underline } from '@classess/motion';
import { type ComponentType, useEffect, useState } from 'react';
import type { ActiveAnnotation, ActiveHighlight, ActiveNote, AnnotationKind } from './actions';
import { useVidyaBus } from './context-bus';

const MARK: Record<
  AnnotationKind,
  ComponentType<{ width?: number; height?: number; color?: string }>
> = {
  underline: Underline,
  circle: Circle,
  arrow: Arrow,
  bracket: Bracket,
  check: Check,
  crossOut: CrossOut,
  lookHere: LookHere,
};

const DEFAULT_TTL = 6000;
const FADE = 500;
/** Handwriting speed for Vidya's notes — a natural ~22 chars/sec. */
const MS_PER_CHAR = 45;

/** Keep marks glued to their moving targets AND drive the fade/typing clock: re-measure every frame. */
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

/**
 * VidyaOverlay — the visible half of "every page is a canvas she's plugged into". She points at the
 * learner's actual elements: highlights appear, hand-drawn marks stroke themselves on, and her notes
 * are written on letter by letter in Caveat. Every mark is TRANSIENT — it lives for the ttl Vidya chose
 * and then fades. The overlay never intercepts pointer events and casts no shadow.
 */
export function VidyaOverlay() {
  const bus = useVidyaBus();
  const active = bus.highlights.length + bus.annotations.length + bus.notes.length > 0;
  useLiveTick(active);

  if (!active) return null;

  const age = performance.now() - bus.marksBornAt;
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
        return (
          <div
            key={`hl-${h.targetId}-${h.level}`}
            style={{
              position: 'absolute',
              left: rect.left - pad,
              top: rect.top - pad,
              width: rect.width + pad * 2,
              height: rect.height + pad * 2,
              border: `2px solid ${color}`,
              borderRadius: radius.md,
              background: `${color}14`, // ~8% tint; depth is the mark itself, never a shadow
              opacity,
              transition: 'opacity 120ms linear',
            }}
          />
        );
      })}

      {bus.annotations.map((a: ActiveAnnotation) => {
        const rect = rectOf(a.targetId);
        if (!rect) return null;
        const opacity = fadeOpacity(age, a.ttl ?? DEFAULT_TTL);
        if (opacity <= 0) return null;
        const Mark = MARK[a.mark];
        return (
          <div
            key={`an-${a.targetId}-${a.mark}-${a.level}`}
            style={{
              position: 'absolute',
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
              opacity,
            }}
          >
            {/* The mark strokes itself on (pathLength 0->1) the first time it mounts. */}
            <Mark width={rect.width} height={rect.height} color={vidyaHighlight[a.level]} />
          </div>
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
        return (
          <div
            key={`nt-${n.targetId}-${n.level}`}
            style={{
              position: 'absolute',
              left: rect.left,
              top: rect.bottom + 6,
              maxWidth: Math.max(rect.width, 220),
              fontFamily: fontFamily.handwritten,
              fontSize: '1.5rem',
              lineHeight: 1.25,
              color: vidyaHighlight[n.level],
              opacity,
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
