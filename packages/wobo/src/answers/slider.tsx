'use client';

/**
 * Slider — one value on a track, continuous or stepped, with the number written live above the
 * thumb in Wobo's hand.
 *
 * The label is the point: a slider whose value only appears in a tooltip is a slider a learner is
 * guessing with. `role="slider"` is used exactly as specified, so the arrows, the page keys and
 * Home / End all behave the way the platform already taught the learner.
 */

import type { AnswerCheck, AnswerSpecOf, AnswerStateOf } from '@wobo/contracts';
import { type ReactNode, useRef } from 'react';
import { sliderAria } from './a11y';
import { clamp } from './geometry';
import { HandValue } from './hand';
import { sliderKey } from './keyboard';
import { setSlider, sliderShown } from './state';
import { highlightsOf, PointRing, svgPoint } from './ui';

type Spec = AnswerSpecOf<'slider'>;

const PAD = 10;
const W = 100;
const H = 34;
const TRACK_Y = 24;

/** Where a value sits on the drawn track. */
export function trackX(spec: Spec, value: number): number {
  const t = (value - spec.min) / (spec.max - spec.min || 1);
  return PAD + clamp(t, 0, 1) * (W - PAD * 2);
}

/** The value under a position on the drawn track. */
export function trackValue(spec: Spec, x: number): number {
  const t = (x - PAD) / (W - PAD * 2 || 1);
  return spec.min + clamp(t, 0, 1) * (spec.max - spec.min);
}

export interface SliderProps {
  spec: Spec;
  state: AnswerStateOf<'slider'>;
  onChange: (next: AnswerStateOf<'slider'>) => void;
  result?: AnswerCheck | null;
  disabled?: boolean;
}

export function Slider({ spec, state, onChange, result, disabled }: SliderProps): ReactNode {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragging = useRef(false);
  const value = sliderShown(spec, state);
  const x = trackX(spec, value);
  const step = spec.step ?? 0;
  const precision =
    spec.precision ?? (step > 0 && step < 1 ? (String(step).split('.')[1]?.length ?? 0) : 0);
  const label = `${Number(value.toFixed(precision))}${spec.unit ? ` ${spec.unit}` : ''}`;
  const rings = highlightsOf(result, 'track');

  const setFrom = (e: { clientX: number; clientY: number }): void => {
    const svg = svgRef.current;
    if (!svg || disabled) return;
    onChange(setSlider(spec, trackValue(spec, svgPoint(svg, e, [0, 0, W, H])[0])));
  };

  // Ticks only when they can be told apart: past a couple of dozen the track reads as a rule.
  const stops =
    step > 0 && (spec.max - spec.min) / step <= 24
      ? Array.from(
          { length: Math.round((spec.max - spec.min) / step) + 1 },
          (_, i) => spec.min + i * step,
        )
      : [];

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      style={{ aspectRatio: `${W} / ${H}`, maxWidth: 520, margin: '0 auto' }}
      tabIndex={disabled ? -1 : 0}
      {...sliderAria(spec, state)}
      aria-disabled={disabled || undefined}
      onKeyDown={(e) => {
        if (disabled) return;
        const next = sliderKey(spec, state, e);
        if (next) {
          e.preventDefault();
          onChange(next);
        }
      }}
      onPointerDown={(e) => {
        if (disabled) return;
        dragging.current = true;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        setFrom(e);
      }}
      onPointerMove={(e) => {
        if (dragging.current) setFrom(e);
      }}
      onPointerUp={(e) => {
        dragging.current = false;
        e.currentTarget.releasePointerCapture?.(e.pointerId);
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
    >
      <title>{spec.prompt ?? 'drag the slider'}</title>
      <path className="wobo-answer-rule" d={`M ${PAD} ${TRACK_Y} H ${W - PAD}`} />
      {stops.map((v) => (
        <path
          key={v}
          className="wobo-answer-grid"
          d={`M ${trackX(spec, v)} ${TRACK_Y - 2.5} V ${TRACK_Y + 2.5}`}
        />
      ))}
      {/* The travelled part of the track is the learner's own mark, so it carries the pigment. */}
      <path
        className="wobo-answer-learner"
        d={`M ${PAD} ${TRACK_Y} H ${x}`}
        strokeWidth={1}
        opacity={state.value === null ? 0.35 : 1}
      />
      <HandValue
        text={label}
        origin={[x, 1]}
        size={11}
        centred
        className={state.value === null ? 'wobo-answer-label' : 'wobo-answer-mark'}
      />
      <circle
        className="wobo-answer-mark"
        cx={x}
        cy={TRACK_Y}
        r={2.8}
        opacity={state.value === null ? 0.4 : 1}
      />
      {rings.map((r) => (
        <PointRing
          key={`ring-${r.value}`}
          at={[trackX(spec, r.value), TRACK_Y]}
          radius={7}
          seed="slider"
        />
      ))}
    </svg>
  );
}
