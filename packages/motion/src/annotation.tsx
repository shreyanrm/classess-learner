'use client';

import { fontFamily, ink } from '@classess/config';
import { motion } from 'framer-motion';
import type { CSSProperties, ReactNode } from 'react';
import { EASE, SEC } from './motion-tokens';
import { useReducedMotion } from './use-reduced-motion';

/**
 * Annotation kit — hand-drawn marks Wobo and the system draw onto the canvas. Each is an SVG
 * path-draw (`pathLength` 0 -> 1), so it appears as if drawn by hand. Text uses Caveat.
 *
 * Calm equivalent (prefers-reduced-motion): the mark appears already drawn, with a quiet fade — no
 * travelling stroke.
 */

export interface AnnotationProps {
  width?: number;
  height?: number;
  /** Stroke color. Defaults to ink (marks are monochrome unless a surface earned color). */
  color?: string;
  strokeWidth?: number;
  durationMs?: number;
  delayMs?: number;
  /** Plays when true; defaults to true. */
  draw?: boolean;
  className?: string;
  style?: CSSProperties;
}

interface StrokeProps {
  d: string;
  color: string;
  strokeWidth: number;
  reduced: boolean;
  durationMs: number;
  delaySec: number;
}

function Stroke({ d, color, strokeWidth, reduced, durationMs, delaySec }: StrokeProps) {
  const sec = durationMs / 1000;
  return (
    <motion.path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ pathLength: reduced ? 1 : 0, opacity: reduced ? 0 : 1 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={
        reduced
          ? { opacity: { duration: SEC.micro, delay: delaySec } }
          : { pathLength: { duration: sec, ease: EASE.standard, delay: delaySec } }
      }
    />
  );
}

function DrawSvg({
  viewBox,
  width,
  height,
  className,
  style,
  children,
}: {
  viewBox: string;
  width: number;
  height: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox={viewBox}
      width={width}
      height={height}
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
      className={className}
      style={{ display: 'inline-block', overflow: 'visible', ...style }}
    >
      {children}
    </svg>
  );
}

function useAnnotation(props: AnnotationProps) {
  const reduced = useReducedMotion();
  return {
    reduced,
    color: props.color ?? ink[900],
    strokeWidth: props.strokeWidth ?? 2.5,
    durationMs: props.durationMs ?? (props.draw === false ? 0 : 360),
    delaySec: (props.delayMs ?? 0) / 1000,
  };
}

/** A wavy hand-drawn underline. */
export function Underline({ width = 120, height = 18, ...rest }: AnnotationProps) {
  const a = useAnnotation(rest);
  return (
    <DrawSvg
      viewBox="0 0 120 18"
      width={width}
      height={height}
      className={rest.className}
      style={rest.style}
    >
      <Stroke
        d="M4 12 C 24 6, 44 14, 64 9 S 104 5, 116 11"
        color={a.color}
        strokeWidth={a.strokeWidth}
        reduced={a.reduced}
        durationMs={a.durationMs}
        delaySec={a.delaySec}
      />
    </DrawSvg>
  );
}

/** A loose hand-drawn circle (slight overshoot, like a real pen loop). */
export function Circle({ width = 100, height = 100, ...rest }: AnnotationProps) {
  const a = useAnnotation(rest);
  return (
    <DrawSvg
      viewBox="0 0 100 100"
      width={width}
      height={height}
      className={rest.className}
      style={rest.style}
    >
      <Stroke
        d="M76 20 C 96 36, 92 74, 58 84 C 26 92, 8 70, 14 42 C 20 18, 54 6, 82 18 C 86 20, 88 22, 90 26"
        color={a.color}
        strokeWidth={a.strokeWidth}
        reduced={a.reduced}
        durationMs={a.durationMs}
        delaySec={a.delaySec}
      />
    </DrawSvg>
  );
}

/** A hand-drawn arrow: shaft, then head. */
export function Arrow({ width = 100, height = 60, ...rest }: AnnotationProps) {
  const a = useAnnotation(rest);
  const head = a.durationMs * 0.65;
  return (
    <DrawSvg
      viewBox="0 0 100 60"
      width={width}
      height={height}
      className={rest.className}
      style={rest.style}
    >
      <Stroke
        d="M6 30 C 30 24, 58 36, 86 30"
        color={a.color}
        strokeWidth={a.strokeWidth}
        reduced={a.reduced}
        durationMs={head}
        delaySec={a.delaySec}
      />
      <Stroke
        d="M74 18 L 88 30 L 74 42"
        color={a.color}
        strokeWidth={a.strokeWidth}
        reduced={a.reduced}
        durationMs={a.durationMs - head}
        delaySec={a.delaySec + head / 1000}
      />
    </DrawSvg>
  );
}

/** A hand-drawn vertical bracket (grouping a span of content). */
export function Bracket({ width = 40, height = 100, ...rest }: AnnotationProps) {
  const a = useAnnotation(rest);
  return (
    <DrawSvg
      viewBox="0 0 40 100"
      width={width}
      height={height}
      className={rest.className}
      style={rest.style}
    >
      <Stroke
        d="M30 6 C 16 8, 13 14, 13 28 L 13 44 C 13 49, 11 50, 6 50 C 11 50, 13 51, 13 56 L 13 72 C 13 86, 16 92, 30 94"
        color={a.color}
        strokeWidth={a.strokeWidth}
        reduced={a.reduced}
        durationMs={a.durationMs}
        delaySec={a.delaySec}
      />
    </DrawSvg>
  );
}

/** A hand-drawn check mark. */
export function Check({ width = 60, height = 60, ...rest }: AnnotationProps) {
  const a = useAnnotation(rest);
  return (
    <DrawSvg
      viewBox="0 0 60 60"
      width={width}
      height={height}
      className={rest.className}
      style={rest.style}
    >
      <Stroke
        d="M8 32 C 14 38, 20 46, 26 50 C 34 36, 44 20, 54 10"
        color={a.color}
        strokeWidth={a.strokeWidth}
        reduced={a.reduced}
        durationMs={a.durationMs}
        delaySec={a.delaySec}
      />
    </DrawSvg>
  );
}

/** A hand-drawn cross-out (two strokes through content). */
export function CrossOut({ width = 100, height = 40, ...rest }: AnnotationProps) {
  const a = useAnnotation(rest);
  const first = a.durationMs * 0.5;
  return (
    <DrawSvg
      viewBox="0 0 100 40"
      width={width}
      height={height}
      className={rest.className}
      style={rest.style}
    >
      <Stroke
        d="M4 10 C 30 18, 62 24, 96 30"
        color={a.color}
        strokeWidth={a.strokeWidth}
        reduced={a.reduced}
        durationMs={first}
        delaySec={a.delaySec}
      />
      <Stroke
        d="M6 30 C 34 22, 66 16, 94 8"
        color={a.color}
        strokeWidth={a.strokeWidth}
        reduced={a.reduced}
        durationMs={a.durationMs - first}
        delaySec={a.delaySec + first / 1000}
      />
    </DrawSvg>
  );
}

export interface LookHereProps extends AnnotationProps {
  /** Optional Caveat note drawn beside the tick. */
  label?: string;
}

/** A "look here" tick — a small hand-drawn arrow with an optional Caveat note. */
export function LookHere({ width = 80, height = 60, label, ...rest }: LookHereProps) {
  const a = useAnnotation(rest);
  const head = a.durationMs * 0.65;
  return (
    <span
      className={rest.className}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, ...rest.style }}
    >
      <DrawSvg viewBox="0 0 80 60" width={width} height={height}>
        <Stroke
          d="M10 10 C 24 16, 36 30, 44 44"
          color={a.color}
          strokeWidth={a.strokeWidth}
          reduced={a.reduced}
          durationMs={head}
          delaySec={a.delaySec}
        />
        <Stroke
          d="M30 44 L 46 48 L 44 30"
          color={a.color}
          strokeWidth={a.strokeWidth}
          reduced={a.reduced}
          durationMs={a.durationMs - head}
          delaySec={a.delaySec + head / 1000}
        />
      </DrawSvg>
      {label && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: SEC.standard, ease: EASE.standard, delay: a.delaySec + 0.12 }}
          style={{
            fontFamily: fontFamily.handwritten,
            color: a.color,
            fontSize: '1.25rem',
            lineHeight: 1,
          }}
        >
          {label}
        </motion.span>
      )}
    </span>
  );
}
