'use client';

import { radius, vidyaHighlight, zIndex } from '@classess/config';
import { Arrow, Bracket, Check, Circle, CrossOut, LookHere, Underline } from '@classess/motion';
import { motion } from 'framer-motion';
import { type ComponentType, useEffect, useState } from 'react';
import type { ActiveAnnotation, ActiveHighlight, AnnotationKind } from './actions';
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

/** Keep marks glued to their moving targets: re-measure every frame while any mark is active. */
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

/**
 * VidyaOverlay — draws Vidya's highlights and hand-drawn annotation marks directly onto the page, over
 * the elements the current surface registered. This is the visible half of "every page is a canvas she
 * is plugged into": she points at the learner's actual working in Molten (primary), Acid (secondary),
 * and Ultramarine (tertiary). The overlay never intercepts pointer events and casts no shadow.
 */
export function VidyaOverlay() {
  const bus = useVidyaBus();
  const active = bus.highlights.length + bus.annotations.length > 0;
  useLiveTick(active);

  if (!active) return null;

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
        const color = vidyaHighlight[h.level];
        const pad = 6;
        return (
          <motion.div
            key={`hl-${h.targetId}-${h.level}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 1.4, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              left: rect.left - pad,
              top: rect.top - pad,
              width: rect.width + pad * 2,
              height: rect.height + pad * 2,
              border: `2px solid ${color}`,
              borderRadius: radius.md,
              background: `${color}14`, // ~8% tint; depth is the mark itself, never a shadow
            }}
          />
        );
      })}

      {bus.annotations.map((a: ActiveAnnotation) => {
        const rect = rectOf(a.targetId);
        if (!rect) return null;
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
            }}
          >
            <Mark width={rect.width} height={rect.height} color={vidyaHighlight[a.level]} />
          </div>
        );
      })}
    </div>
  );
}
