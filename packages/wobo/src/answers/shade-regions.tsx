'use client';

/**
 * Shade regions — "colour a half of the shape".
 *
 * Tap a part, or press and drag across several. The figure is drawn as its real shape, so a pie
 * slice is a pie slice to a finger and not a bounding box; over it sits one invisible checkbox per
 * part, so the keyboard and the screen reader answer the identical question rather than a text
 * stand-in.
 */

import type { AnswerCheck, AnswerSpecOf, AnswerStateOf } from '@wobo/contracts';
import { type ReactNode, useRef, useState } from 'react';
import { shadeAria } from './a11y';
import { FigureFrame, FigureRule } from './figure';
import { FIGURE_BOX, figureParts, partAt, partCount } from './geometry';
import { figureColumns, type KeyPress, rove, shadeKey } from './keyboard';
import { toggleShade } from './state';
import { AnswerCanvas, BoxRing, highlightsOf, svgPoint, targetStyle } from './ui';

/** A wedge's own box overlaps its neighbours' at the centre, so its target is a stud on its middle. */
const WEDGE_TARGET = 22;

export interface ShadeRegionsProps {
  spec: AnswerSpecOf<'shade_regions'>;
  state: AnswerStateOf<'shade_regions'>;
  onChange: (next: AnswerStateOf<'shade_regions'>) => void;
  result?: AnswerCheck | null;
  disabled?: boolean;
}

export function ShadeRegions({
  spec,
  state,
  onChange,
  result,
  disabled,
}: ShadeRegionsProps): ReactNode {
  const total = partCount(spec.figure);
  const parts = figureParts(spec.figure, FIGURE_BOX);
  const [focus, setFocus] = useState(0);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const targets = useRef<(HTMLButtonElement | null)[]>([]);
  // A drag paints; the part it started on decides whether the drag shades or unshades, so a finger
  // dragged back over its own trail does not flicker the parts on and off.
  const painting = useRef<{ on: boolean; touched: Set<number> } | null>(null);
  const rings = highlightsOf(result, 'part');

  const apply = (index: number, on: boolean): void => {
    if (disabled) return;
    if (state.shaded.includes(index) === on) return;
    onChange(toggleShade(spec, state, index));
  };

  const at = (e: { clientX: number; clientY: number }): number | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    return partAt(spec.figure, svgPoint(svg, e, FIGURE_BOX), FIGURE_BOX);
  };

  const onKeyDown = (press: KeyPress, index: number, prevent: () => void): void => {
    if (disabled) return;
    const next = shadeKey(spec, state, index, press);
    if (next) {
      prevent();
      onChange(next);
      return;
    }
    const moved = rove(total, index, press, figureColumns(spec));
    if (moved !== null) {
      prevent();
      setFocus(moved);
      // A roving tabstop has to MOVE the focus, not merely re-index it: without this the arrows
      // relabel which part is tabbable while the caret stays where it was.
      targets.current[moved]?.focus();
    }
  };

  return (
    <AnswerCanvas
      maxWidth={420}
      targets={parts.map((p) => (
        <button
          key={p.index}
          type="button"
          ref={(el) => {
            targets.current[p.index] = el;
          }}
          className="wobo-answer-target"
          style={targetStyle(
            spec.figure.shape === 'pie'
              ? [
                  p.center[0] - WEDGE_TARGET / 2,
                  p.center[1] - WEDGE_TARGET / 2,
                  WEDGE_TARGET,
                  WEDGE_TARGET,
                ]
              : p.box,
            FIGURE_BOX,
          )}
          tabIndex={disabled ? -1 : p.index === focus ? 0 : -1}
          {...shadeAria(spec, state, p.index)}
          aria-disabled={disabled || undefined}
          onFocus={() => setFocus(p.index)}
          onClick={() => apply(p.index, !state.shaded.includes(p.index))}
          onKeyDown={(e) => onKeyDown(e, p.index, () => e.preventDefault())}
        />
      ))}
    >
      <svg
        ref={svgRef}
        viewBox="0 0 100 100"
        style={{ aspectRatio: '1 / 1' }}
        aria-label={spec.prompt ?? `shade ${spec.want} of ${total} parts`}
        onPointerDown={(e) => {
          if (disabled) return;
          const index = at(e);
          if (index === null) return;
          e.currentTarget.setPointerCapture?.(e.pointerId);
          const on = !state.shaded.includes(index);
          painting.current = { on, touched: new Set([index]) };
          apply(index, on);
          setFocus(index);
        }}
        onPointerMove={(e) => {
          const paint = painting.current;
          if (!paint) return;
          const index = at(e);
          if (index === null || paint.touched.has(index)) return;
          paint.touched.add(index);
          apply(index, paint.on);
        }}
        onPointerUp={() => {
          painting.current = null;
        }}
        onPointerCancel={() => {
          painting.current = null;
        }}
      >
        <title>{spec.prompt ?? 'shade the parts'}</title>
        <FigureFrame figure={spec.figure} />
        <FigureRule figure={spec.figure} />
        {parts.map((p) => (
          <path
            key={p.index}
            className="wobo-answer-part"
            d={p.d}
            data-on={state.shaded.includes(p.index)}
          />
        ))}
        {rings.map((r) => {
          const box = parts[r.index]?.box;
          return box ? (
            <BoxRing key={`ring-${r.index}`} box={box} seed={`shade-${r.index}`} />
          ) : null;
        })}
      </svg>
    </AnswerCanvas>
  );
}
