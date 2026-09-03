'use client';

/**
 * Order — drag the cards or the steps into the right sequence.
 *
 * Dragging is a pointer nicety; the answer is reachable without one. Alt with an arrow key CARRIES
 * the focused card past its neighbour, which is the gesture a drag has that a plain list does not,
 * and the reason the keyboard path here is a real path rather than an apology.
 */

import type { AnswerCheck, AnswerSpecOf, AnswerStateOf } from '@wobo/contracts';
import { type ReactNode, useRef, useState } from 'react';
import { orderItemAria, orderListAria } from './a11y';
import { orderKey } from './keyboard';
import { moveCard } from './state';
import { highlightsOf } from './ui';

type Spec = AnswerSpecOf<'order'>;

export interface OrderProps {
  spec: Spec;
  state: AnswerStateOf<'order'>;
  onChange: (next: AnswerStateOf<'order'>) => void;
  result?: AnswerCheck | null;
  disabled?: boolean;
}

export function Order({ spec, state, onChange, result, disabled }: OrderProps): ReactNode {
  const [focus, setFocus] = useState(0);
  const [dragging, setDragging] = useState<number | null>(null);
  const cards = useRef<(HTMLLIElement | null)[]>([]);
  const axis = spec.axis ?? 'vertical';
  const ringed = new Set(highlightsOf(result, 'item').map((h) => h.id));
  const labelOf = (id: string): string => spec.items.find((i) => i.id === id)?.label ?? id;

  /** The index the pointer is currently over, from the cards' own boxes. */
  const indexAt = (clientX: number, clientY: number): number | null => {
    for (let i = 0; i < cards.current.length; i++) {
      const el = cards.current[i];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
        return i;
      }
    }
    return null;
  };

  return (
    <ul
      className="wobo-answer-cards"
      data-axis={axis}
      {...orderListAria(spec)}
      aria-disabled={disabled || undefined}
    >
      {state.order.map((id, index) => (
        <li
          key={id}
          ref={(el) => {
            cards.current[index] = el;
          }}
          className="wobo-answer-card"
          data-dragging={dragging === index}
          data-ringed={ringed.has(id)}
          tabIndex={disabled ? -1 : index === focus ? 0 : -1}
          {...orderItemAria(labelOf(id), index, state.order.length, index === focus)}
          onFocus={() => setFocus(index)}
          onKeyDown={(e) => {
            if (disabled) return;
            const next = orderKey(state, index, e, axis);
            if (!next) return;
            e.preventDefault();
            setFocus(next.index);
            if (next.state !== state) onChange(next.state);
            // Focus follows the card it was carrying, so a run of presses keeps moving one card.
            queueMicrotask(() => cards.current[next.index]?.focus());
          }}
          onPointerDown={(e) => {
            if (disabled) return;
            setDragging(index);
            setFocus(index);
            (e.target as Element).setPointerCapture?.(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (dragging === null || dragging !== index) return;
            const over = indexAt(e.clientX, e.clientY);
            if (over === null || over === index) return;
            onChange(moveCard(state, index, over));
            setDragging(over);
            setFocus(over);
          }}
          onPointerUp={() => setDragging(null)}
          onPointerCancel={() => setDragging(null)}
        >
          <span className="wobo-answer-rank" aria-hidden="true">
            {index + 1}
          </span>
          <span>{labelOf(id)}</span>
        </li>
      ))}
    </ul>
  );
}
