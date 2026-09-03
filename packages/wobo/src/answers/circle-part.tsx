'use client';

/**
 * Circle the part — lasso the piece of the figure being asked about.
 *
 * The loop is the answer, and `check` reads it by which parts it encloses. The keyboard names the
 * parts instead — one invisible checkbox per part — and the hull of the chosen ones becomes the
 * same loop, so both paths hand the checker one shape and cannot disagree about what "circled"
 * means.
 */

import type { AnswerBox, AnswerCheck, AnswerSpecOf, AnswerStateOf } from '@wobo/contracts';
import { type ReactNode, useRef } from 'react';
import { smoothPath } from '../board/pen';
import { lassoPartAria } from './a11y';
import { boxCenter } from './geometry';
import { isActivate } from './keyboard';
import { extendLasso, lassoed, lassoParts } from './state';
import { AnswerCanvas, BoxRing, highlightsOf, svgPoint, targetStyle } from './ui';

type Spec = AnswerSpecOf<'circle_part'>;

export const DEFAULT_VIEW: AnswerBox = [0, 0, 1000, 600];

export interface CirclePartProps {
  spec: Spec;
  state: AnswerStateOf<'circle_part'>;
  onChange: (next: AnswerStateOf<'circle_part'>) => void;
  result?: AnswerCheck | null;
  disabled?: boolean;
  /** The figure being circled, drawn underneath the lasso. */
  backdrop?: ReactNode;
}

export function CirclePart({
  spec,
  state,
  onChange,
  result,
  disabled,
  backdrop,
}: CirclePartProps): ReactNode {
  const view = spec.view ?? DEFAULT_VIEW;
  const drawing = useRef(false);
  const inside = lassoed(spec, state);
  const ringed = new Set(highlightsOf(result, 'region').map((h) => h.id));

  const toggle = (id: string): void => {
    if (disabled) return;
    const next = inside.includes(id) ? inside.filter((x) => x !== id) : [...inside, id];
    onChange(lassoParts(spec, next));
  };

  return (
    <AnswerCanvas
      targets={spec.parts.map((part) => (
        <button
          key={part.id}
          type="button"
          className="wobo-answer-target"
          style={targetStyle(part.box, view)}
          tabIndex={disabled ? -1 : 0}
          {...lassoPartAria(part.label, inside.includes(part.id))}
          aria-disabled={disabled || undefined}
          onClick={() => toggle(part.id)}
          onKeyDown={(e) => {
            if (!isActivate(e)) return;
            e.preventDefault();
            toggle(part.id);
          }}
        />
      ))}
    >
      <svg
        viewBox={`${view[0]} ${view[1]} ${view[2]} ${view[3]}`}
        style={{ aspectRatio: `${view[2]} / ${view[3]}` }}
        aria-label={spec.prompt ?? 'circle the part'}
        onPointerDown={(e) => {
          if (disabled) return;
          drawing.current = true;
          e.currentTarget.setPointerCapture?.(e.pointerId);
          onChange({ kind: 'circle_part', lasso: [svgPoint(e.currentTarget, e, view)] });
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          onChange(extendLasso(state, svgPoint(e.currentTarget, e, view)));
        }}
        onPointerUp={() => {
          drawing.current = false;
        }}
        onPointerCancel={() => {
          drawing.current = false;
        }}
      >
        <title>{spec.prompt ?? 'circle the part'}</title>
        {backdrop}
        {spec.parts.map((part) => {
          const [x, y, w, h] = part.box;
          return (
            <g key={part.id}>
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx={3}
                fill={inside.includes(part.id) ? 'var(--wa-soft-wash)' : 'transparent'}
                stroke="var(--wa-line)"
                strokeWidth={1}
              />
              <text
                className="wobo-answer-label"
                x={boxCenter(part.box)[0]}
                y={y + h + view[3] * 0.045}
                fontSize={view[3] * 0.04}
                textAnchor="middle"
              >
                {part.label}
              </text>
              {ringed.has(part.id) ? <BoxRing box={part.box} seed={`part-${part.id}`} /> : null}
            </g>
          );
        })}
        {state.lasso.length > 1 ? (
          <path
            className="wobo-answer-learner"
            d={`${smoothPath(state.lasso.slice())} Z`}
            strokeWidth={4}
            fill="var(--wa-soft-wash)"
          />
        ) : null}
      </svg>
    </AnswerCanvas>
  );
}
