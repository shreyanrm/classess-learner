'use client';

/**
 * Place points — drop and drag points on a coordinate plane or a number line.
 *
 * Dragging snaps to the item's own step, and the coordinate is written beside the point rather than
 * hidden in a tooltip, so the answer is visible while it is being made. The keyboard drives a
 * crosshair with the arrows and drops with Enter, and every dropped point is a real button that can
 * be tabbed to and nudged: the same state, reached without a pointer.
 */

import type {
  AnswerBox,
  AnswerCheck,
  AnswerPoint,
  AnswerSpecOf,
  AnswerStateOf,
} from '@wobo/contracts';
import { type ReactNode, useRef, useState } from 'react';
import { planeAria, pointAria, speakPoint } from './a11y';
import { clamp } from './geometry';
import { dragPointKey, type KeyPress, moveCursor, placeKey } from './keyboard';
import { addPoint, movePoint, pointBudget, settlePoint } from './state';
import { AnswerCanvas, highlightsOf, keyed, PointRing, pointTargetStyle, svgPoint } from './ui';

type Spec = AnswerSpecOf<'place_points'>;

/** The drawn plane, in SVG units, with room for the axis labels outside it. */
const PAD = 12;
const SIZE = 100;
const VIEW: AnswerBox = [0, 0, SIZE, SIZE];
/** How near a press must land to count as grabbing a point rather than dropping a new one. */
const GRAB = 6;
/** Text size in the plane's own units — 100 wide, so this is about eleven pixels once drawn. */
const LABEL = 3.6;

/** Axis units to SVG units. Y grows upwards on a plane, as a plane's y does. */
export function toSvg(spec: Spec, at: AnswerPoint): AnswerPoint {
  const span = SIZE - PAD * 2;
  const x = PAD + ((at[0] - spec.min[0]) / (spec.max[0] - spec.min[0] || 1)) * span;
  if (spec.space === 'line') return [x, SIZE / 2];
  const y = SIZE - PAD - ((at[1] - spec.min[1]) / (spec.max[1] - spec.min[1] || 1)) * span;
  return [x, y];
}

/** SVG units back to axis units. */
export function fromSvg(spec: Spec, p: AnswerPoint): AnswerPoint {
  const span = SIZE - PAD * 2;
  const x = spec.min[0] + ((p[0] - PAD) / span) * (spec.max[0] - spec.min[0] || 1);
  if (spec.space === 'line') return [x, 0];
  const y = spec.min[1] + ((SIZE - PAD - p[1]) / span) * (spec.max[1] - spec.min[1] || 1);
  return [x, y];
}

function ticks(min: number, max: number, step: number): number[] {
  const gap = step > 0 ? step : (max - min) / 10 || 1;
  const count = Math.min(40, Math.max(1, Math.round((max - min) / gap)));
  return Array.from({ length: count + 1 }, (_, i) => min + i * ((max - min) / count));
}

export interface PlacePointsProps {
  spec: Spec;
  state: AnswerStateOf<'place_points'>;
  onChange: (next: AnswerStateOf<'place_points'>) => void;
  result?: AnswerCheck | null;
  disabled?: boolean;
}

export function PlacePoints({
  spec,
  state,
  onChange,
  result,
  disabled,
}: PlacePointsProps): ReactNode {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragging = useRef<number | null>(null);
  const [cursor, setCursor] = useState<AnswerPoint>(() =>
    settlePoint(spec, [(spec.min[0] + spec.max[0]) / 2, (spec.min[1] + spec.max[1]) / 2]),
  );
  const onLine = spec.space === 'line';
  const rings = keyed(highlightsOf(result, 'point'), (h) => `ring-${h.at[0]},${h.at[1]}`);
  const marks = keyed(state.points, (p) => `${p[0]},${p[1]}`);
  const full = state.points.length >= pointBudget(spec);

  const axisAt = (e: { clientX: number; clientY: number }): AnswerPoint | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const raw = fromSvg(spec, svgPoint(svg, e, VIEW));
    return [
      clamp(raw[0], spec.min[0], spec.max[0]),
      onLine ? 0 : clamp(raw[1], spec.min[1], spec.max[1]),
    ];
  };

  /** How far, in drawn units, a press landed from a point already on the plane. */
  const gapTo = (point: AnswerPoint, at: AnswerPoint): number => {
    const a = toSvg(spec, point);
    const b = toSvg(spec, at);
    return Math.hypot(a[0] - b[0], a[1] - b[1]);
  };

  const onSurfaceKey = (press: KeyPress, prevent: () => void): void => {
    if (disabled) return;
    const moved = moveCursor(spec, cursor, press);
    if (moved) {
      prevent();
      setCursor(moved);
      return;
    }
    const next = placeKey(spec, state, cursor, press);
    if (next) {
      prevent();
      onChange(next);
    }
  };

  const xTicks = ticks(spec.min[0], spec.max[0], spec.step[0]);
  const yTicks = onLine ? [] : ticks(spec.min[1], spec.max[1], spec.step[1]);
  const zero = toSvg(spec, [
    clamp(0, spec.min[0], spec.max[0]),
    onLine ? 0 : clamp(0, spec.min[1], spec.max[1]),
  ]);
  const cursorAt = toSvg(spec, cursor);

  return (
    <AnswerCanvas
      maxWidth={460}
      targets={marks.map((mark) => (
        <button
          key={mark.key}
          type="button"
          className="wobo-answer-target"
          style={pointTargetStyle(toSvg(spec, mark.value), 12, VIEW)}
          tabIndex={disabled ? -1 : 0}
          {...pointAria(spec, mark.value, mark.index, marks.length)}
          aria-disabled={disabled || undefined}
          onKeyDown={(e) => {
            if (disabled) return;
            const next = dragPointKey(spec, state, mark.index, e);
            if (next) {
              e.preventDefault();
              e.stopPropagation();
              onChange(next);
            }
          }}
        />
      ))}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{ aspectRatio: onLine ? '3 / 1' : '1 / 1' }}
        tabIndex={disabled ? -1 : 0}
        {...planeAria(spec)}
        onKeyDown={(e) => onSurfaceKey(e, () => e.preventDefault())}
        onPointerDown={(e) => {
          if (disabled) return;
          const at = axisAt(e);
          if (!at) return;
          e.currentTarget.setPointerCapture?.(e.pointerId);
          // Land on a point and the gesture drags it; land in free space and it drops a new one —
          // until the budget is used up, when the nearest point comes to the finger instead.
          const near = state.points.findIndex((p) => gapTo(p, at) < GRAB);
          if (near >= 0) {
            dragging.current = near;
            setCursor(settlePoint(spec, at));
            return;
          }
          if (full) {
            let nearest = -1;
            let best = Number.POSITIVE_INFINITY;
            state.points.forEach((p, i) => {
              const gap = gapTo(p, at);
              if (gap < best) {
                best = gap;
                nearest = i;
              }
            });
            dragging.current = nearest;
            if (nearest >= 0) onChange(movePoint(spec, state, nearest, at));
            return;
          }
          dragging.current = state.points.length;
          onChange(addPoint(spec, state, at));
          setCursor(settlePoint(spec, at));
        }}
        onPointerMove={(e) => {
          const index = dragging.current;
          if (index === null || index < 0) return;
          const at = axisAt(e);
          if (!at) return;
          onChange(movePoint(spec, state, index, at));
          setCursor(settlePoint(spec, at));
        }}
        onPointerUp={() => {
          dragging.current = null;
        }}
        onPointerCancel={() => {
          dragging.current = null;
        }}
      >
        <title>{spec.prompt ?? (onLine ? 'number line' : 'coordinate plane')}</title>
        {!onLine
          ? xTicks.map((v) => (
              <path
                key={`gx${v}`}
                className="wobo-answer-grid"
                d={`M ${toSvg(spec, [v, spec.min[1]])[0]} ${PAD} V ${SIZE - PAD}`}
              />
            ))
          : null}
        {yTicks.map((v) => (
          <path
            key={`gy${v}`}
            className="wobo-answer-grid"
            d={`M ${PAD} ${toSvg(spec, [spec.min[0], v])[1]} H ${SIZE - PAD}`}
          />
        ))}
        <path className="wobo-answer-rule" d={`M ${PAD} ${zero[1]} H ${SIZE - PAD}`} />
        {!onLine ? (
          <path className="wobo-answer-rule" d={`M ${zero[0]} ${PAD} V ${SIZE - PAD}`} />
        ) : null}
        {onLine
          ? xTicks.map((v) => {
              const p = toSvg(spec, [v, 0]);
              return (
                <g key={`t${v}`}>
                  <path className="wobo-answer-rule" d={`M ${p[0]} ${p[1] - 3} V ${p[1] + 3}`} />
                  <text
                    className="wobo-answer-label"
                    x={p[0]}
                    y={p[1] + 9}
                    fontSize={LABEL}
                    textAnchor="middle"
                  >
                    {Number(v.toFixed(4))}
                  </text>
                </g>
              );
            })
          : null}
        {spec.axisLabels ? (
          <g>
            <text
              className="wobo-answer-label"
              x={SIZE - PAD}
              y={zero[1] - 2}
              fontSize={LABEL}
              textAnchor="end"
            >
              {spec.axisLabels[0]}
            </text>
            {!onLine ? (
              <text
                className="wobo-answer-label"
                x={zero[0] + 2}
                y={PAD}
                fontSize={LABEL}
                textAnchor="start"
              >
                {spec.axisLabels[1]}
              </text>
            ) : null}
          </g>
        ) : null}

        {/* The keyboard crosshair: where Enter would drop the next point. */}
        <g className="wobo-answer-cursor">
          <path className="wobo-answer-grid" d={`M ${cursorAt[0]} ${PAD} V ${SIZE - PAD}`} />
          {!onLine ? (
            <path className="wobo-answer-grid" d={`M ${PAD} ${cursorAt[1]} H ${SIZE - PAD}`} />
          ) : null}
        </g>

        {marks.map((mark) => {
          const at = toSvg(spec, mark.value);
          return (
            <g key={mark.key}>
              <circle className="wobo-answer-mark" cx={at[0]} cy={at[1]} r={2.6} />
              <text className="wobo-answer-label" x={at[0] + 3} y={at[1] - 3} fontSize={LABEL}>
                {speakPoint(mark.value, onLine)}
              </text>
            </g>
          );
        })}
        {rings.map((ring) => (
          <PointRing
            key={ring.key}
            at={toSvg(spec, ring.value.at)}
            radius={5}
            seed={`point-${ring.key}`}
          />
        ))}
      </svg>
    </AnswerCanvas>
  );
}
