'use client';

/**
 * Draw on the board — answer by drawing the line, the angle or the shape itself.
 *
 * The stroke is captured in board units, so it is the same coordinate space the rest of Wobo's hand
 * works in and `check` can measure it with the board's own geometry. A learner with no pointer
 * presses Enter for a figure of the right shape and moves its corners with the arrow keys: the
 * state that reaches `check` is indistinguishable from a drawn one.
 */

import type { AnswerBox, AnswerCheck, AnswerSpecOf, AnswerStateOf } from '@wobo/contracts';
import { type ReactNode, useRef, useState } from 'react';
import { smoothPath } from '../board/pen';
import { drawAria } from './a11y';
import { isActivate, nudgeVertex } from './keyboard';
import { extendPath, seedPath, setPath } from './state';
import { AnswerCanvas, highlightsOf, keyed, PointRing, pointTargetStyle, svgPoint } from './ui';

type Spec = AnswerSpecOf<'draw'>;

/** The stretch of board this item is drawn on when the spec does not say. */
export const DEFAULT_VIEW: AnswerBox = [0, 0, 1000, 600];
/** How many points a stroke may have and still offer every one of them as a handle. */
const HANDLE_LIMIT = 12;

export interface DrawAnswerProps {
  spec: Spec;
  state: AnswerStateOf<'draw'>;
  onChange: (next: AnswerStateOf<'draw'>) => void;
  result?: AnswerCheck | null;
  disabled?: boolean;
  /** Ink already on the board, drawn underneath: the figure the answer is about. */
  backdrop?: ReactNode;
}

export function DrawAnswer({
  spec,
  state,
  onChange,
  result,
  disabled,
  backdrop,
}: DrawAnswerProps): ReactNode {
  const view = spec.view ?? DEFAULT_VIEW;
  const drawing = useRef(false);
  const [handles, setHandles] = useState(false);
  const rings = keyed(highlightsOf(result, 'point'), (h) => `ring-${h.at[0]},${h.at[1]}`);

  // Only the corners are handles: a hundred-point freehand stroke would be a hundred tab stops.
  const corners = keyed(
    state.path.length <= HANDLE_LIMIT
      ? state.path
      : [state.path[0], state.path[state.path.length - 1]].filter((p) => p !== undefined),
    (p) => `${p[0]},${p[1]}`,
  );
  const handleIndex = (order: number): number =>
    state.path.length <= HANDLE_LIMIT ? order : order === 0 ? 0 : state.path.length - 1;

  return (
    <AnswerCanvas
      targets={
        handles
          ? corners.map((corner) => (
              <button
                key={corner.key}
                type="button"
                className="wobo-answer-target"
                style={pointTargetStyle(corner.value, 40, view)}
                tabIndex={disabled ? -1 : 0}
                aria-label={`corner ${corner.index + 1} of ${corners.length}`}
                aria-disabled={disabled || undefined}
                onKeyDown={(e) => {
                  if (disabled) return;
                  const next = nudgeVertex(
                    state,
                    handleIndex(corner.index),
                    e,
                    Math.max(4, view[2] / 100),
                  );
                  if (next) {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange(next);
                  }
                }}
              />
            ))
          : null
      }
    >
      <svg
        viewBox={`${view[0]} ${view[1]} ${view[2]} ${view[3]}`}
        style={{ aspectRatio: `${view[2]} / ${view[3]}` }}
        tabIndex={disabled ? -1 : 0}
        {...drawAria(spec)}
        aria-disabled={disabled || undefined}
        onKeyDown={(e) => {
          if (disabled || !isActivate(e)) return;
          e.preventDefault();
          if (state.path.length === 0) {
            onChange(setPath(seedPath(spec)));
            setHandles(true);
          } else {
            setHandles((on) => !on);
          }
        }}
        onPointerDown={(e) => {
          if (disabled) return;
          drawing.current = true;
          setHandles(false);
          e.currentTarget.setPointerCapture?.(e.pointerId);
          // A fresh gesture replaces the last one: one stroke is one answer.
          onChange(setPath([svgPoint(e.currentTarget, e, view)]));
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          onChange(extendPath(state, svgPoint(e.currentTarget, e, view)));
        }}
        onPointerUp={() => {
          drawing.current = false;
        }}
        onPointerCancel={() => {
          drawing.current = false;
        }}
      >
        <title>{spec.prompt ?? 'draw your answer'}</title>
        <rect
          x={view[0]}
          y={view[1]}
          width={view[2]}
          height={view[3]}
          fill="transparent"
          stroke="var(--wa-line)"
          strokeWidth={1}
        />
        {backdrop}
        {state.path.length > 1 ? (
          <path
            className="wobo-answer-learner"
            d={smoothPath(state.path.slice())}
            strokeWidth={4}
          />
        ) : null}
        {handles
          ? corners.map((corner) => (
              <circle
                key={corner.key}
                cx={corner.value[0]}
                cy={corner.value[1]}
                r={14}
                fill="var(--wa-wash)"
                stroke="var(--wa-mark)"
                strokeWidth={2}
              />
            ))
          : null}
        {rings.map((ring) => (
          <PointRing key={ring.key} at={ring.value.at} radius={20} seed={`draw-${ring.key}`} />
        ))}
      </svg>
    </AnswerCanvas>
  );
}
