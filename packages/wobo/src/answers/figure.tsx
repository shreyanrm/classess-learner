'use client';

/**
 * A partitioned figure, drawn: the grid, the pie, the bar and the number line that "colour a half"
 * is asked on, and that a drawn option in a "choose among visuals" item is made of.
 *
 * The parts come from `figureParts`, the same function the checker counts with, so what a learner
 * taps and what `check` reads can never be two different figures.
 */

import type { AnswerBox, AnswerFigure, AnswerVisual } from '@wobo/contracts';
import type { ReactNode } from 'react';
import { FIGURE_BOX, figureParts, GRID_CORNER } from './geometry';

/**
 * The ink ground a grid's cells sit on: a rounded frame whose outer edge is one gutter beyond the
 * cells, so the tile reads as the prototype draws it. Nothing for any other shape.
 */
export function FigureFrame({
  figure,
  box = FIGURE_BOX,
}: {
  figure: AnswerFigure;
  box?: AnswerBox;
}): ReactNode {
  if (figure.shape !== 'grid') return null;
  const [bx, by, bw, bh] = box;
  const corner = Math.min(bw / figure.cols, bh / figure.rows) * GRID_CORNER;
  return (
    <rect className="wobo-answer-frame" x={bx} y={by} width={bw} height={bh} rx={corner + 1} />
  );
}

/**
 * The rule, ticks and end labels a number line needs under its intervals. Drawn for the number-line
 * figure and nothing else, because nothing else has an axis.
 */
export function FigureRule({
  figure,
  box = FIGURE_BOX,
}: {
  figure: AnswerFigure;
  box?: AnswerBox;
}): ReactNode {
  if (figure.shape !== 'number_line') return null;
  const [bx, by, bw, bh] = box;
  const y = by + bh / 2;
  return (
    <g>
      <path className="wobo-answer-rule" d={`M ${bx} ${y} H ${bx + bw}`} />
      {Array.from({ length: figure.parts + 1 }, (_, i) => {
        const x = bx + (i / figure.parts) * bw;
        const value = figure.min + ((figure.max - figure.min) * i) / figure.parts;
        const end = i === 0 || i === figure.parts;
        return (
          <g key={x}>
            <path className="wobo-answer-rule" d={`M ${x} ${y - bh * 0.06} V ${y + bh * 0.06}`} />
            {end ? (
              <text
                className="wobo-answer-label"
                x={x}
                y={y + bh * 0.24}
                fontSize={bw * 0.05}
                textAnchor="middle"
              >
                {Number(value.toFixed(4))}
              </text>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

/** The figure as a picture: no hit targets, no focus, nothing to press. */
export function FigurePicture({
  figure,
  box = FIGURE_BOX,
  shaded,
}: {
  figure: AnswerFigure;
  box?: AnswerBox;
  shaded: readonly number[];
}): ReactNode {
  return (
    <g>
      <FigureFrame figure={figure} box={box} />
      <FigureRule figure={figure} box={box} />
      {figureParts(figure, box).map((p) => (
        <path
          key={p.index}
          className="wobo-answer-part"
          d={p.d}
          data-on={shaded.includes(p.index)}
        />
      ))}
    </g>
  );
}

/** A drawn option: either a partitioned figure with some parts filled, or free strokes. */
export function VisualPicture({
  visual,
  box = FIGURE_BOX,
}: {
  visual: AnswerVisual;
  box?: AnswerBox;
}): ReactNode {
  if (visual.of === 'partition') {
    return <FigurePicture figure={visual.figure} box={box} shaded={visual.shaded} />;
  }
  const [bx, by, bw, bh] = box;
  return (
    <g>
      {visual.strokes.map((stroke) => {
        const d = stroke
          .map(([x, y], i) => `${i ? 'L' : 'M'} ${bx + (x / 100) * bw} ${by + (y / 100) * bh}`)
          .join(' ');
        return <path key={d} className="wobo-answer-stroke" d={visual.closed ? `${d} Z` : d} />;
      })}
    </g>
  );
}
