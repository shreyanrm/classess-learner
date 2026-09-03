'use client';

/**
 * The board Wobo draws the proof on — the same one twice: looping inside the hero's demo card, and
 * scrubbed by the reader's scroll inside the night chapter.
 *
 * The component renders the marks and the pen and hands their elements back through refs. It does
 * not animate anything: the drawing engine (`../engine/demo.ts`) walks `[data-s]` in document order,
 * measures each path once, and moves the pen along whichever mark is mid-draw. Keeping the two
 * apart is what lets the same board be driven by a clock in one place and by scroll in the other.
 */

import type { Ref } from 'react';
import { BOARD_VIEWBOX, LESSON, strokeClass } from './lesson';

export function Lesson({
  lessonRef,
  penRef,
  className,
}: {
  lessonRef: Ref<SVGGElement>;
  penRef: Ref<SVGGElement>;
  className: string;
}) {
  return (
    <svg className={className} viewBox={BOARD_VIEWBOX} aria-hidden="true" focusable="false">
      <g ref={lessonRef}>
        {LESSON.map((stroke) =>
          stroke.kind === 'path' ? (
            <path
              key={`${stroke.s}-${stroke.d.slice(0, 12)}`}
              className={strokeClass(stroke)}
              data-s={stroke.s}
              data-e={stroke.e}
              d={stroke.d}
            />
          ) : (
            <text
              key={`${stroke.s}-${stroke.text}`}
              className={strokeClass(stroke)}
              data-s={stroke.s}
              data-e={stroke.e}
              x={stroke.x}
              y={stroke.y}
              fontSize={stroke.size}
            >
              {stroke.text}
            </text>
          ),
        )}
      </g>
      {/* The pen: an ultramarine nib and the barrel above it, held at a writing angle. */}
      <g ref={penRef} opacity="0">
        <path className="penTip" d="M0 0 l-5 -22 l4 -2 l5 22 z" />
        <rect
          x="-4"
          y="-84"
          width="7"
          height="62"
          rx="2"
          fill="var(--ink)"
          transform="rotate(-9)"
        />
      </g>
    </svg>
  );
}
