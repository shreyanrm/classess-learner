'use client';

/**
 * Match — pair the left column to the right one, with the connectors drawn by hand.
 *
 * The wires are laid out from the buttons' own boxes rather than from a fixed grid, so they stay
 * attached through a reflow, a font swap and a phone rotation. Pointer: press a left item, release
 * on a right one. Keyboard: Enter picks a left item up, Enter on a right item joins them, Escape
 * puts it back down.
 */

import type { AnswerCheck, AnswerSpecOf, AnswerStateOf } from '@wobo/contracts';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { penRng, penStroke } from '../board/pen';
import { matchLeftAria, matchRightAria } from './a11y';
import { matchKey } from './keyboard';
import { toggleLink } from './state';
import { highlightsOf } from './ui';

type Spec = AnswerSpecOf<'match'>;

interface Anchor {
  x: number;
  y: number;
}

export interface MatchProps {
  spec: Spec;
  state: AnswerStateOf<'match'>;
  onChange: (next: AnswerStateOf<'match'>) => void;
  result?: AnswerCheck | null;
  disabled?: boolean;
}

export function Match({ spec, state, onChange, result, disabled }: MatchProps): ReactNode {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const nodes = useRef(new Map<string, HTMLElement>());
  const [anchors, setAnchors] = useState<Record<string, Anchor>>({});
  const [picked, setPicked] = useState<string | null>(null);
  const ringed = new Set(highlightsOf(result, 'pair').map((h) => `${h.left} ${h.right}`));

  /** Where each column entry's connector leaves it, in the host's own coordinates. */
  const measure = useCallback(() => {
    const host = hostRef.current;
    if (!host) return;
    const base = host.getBoundingClientRect();
    const next: Record<string, Anchor> = {};
    for (const [key, el] of nodes.current) {
      const r = el.getBoundingClientRect();
      const left = key.startsWith('L:');
      next[key] = {
        x: (left ? r.right : r.left) - base.left,
        y: r.top + r.height / 2 - base.top,
      };
    }
    setAnchors(next);
  }, []);

  useEffect(() => {
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    const host = hostRef.current;
    if (host) observer.observe(host);
    for (const el of nodes.current.values()) observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);

  const register = (key: string) => (el: HTMLElement | null) => {
    if (el) nodes.current.set(key, el);
    else nodes.current.delete(key);
  };

  const join = (left: string, right: string): void => {
    if (disabled) return;
    onChange(toggleLink(spec, state, left, right));
  };

  const size = hostRef.current?.getBoundingClientRect();

  return (
    <div className="wobo-answer-columns" ref={hostRef}>
      <svg
        className="wobo-answer-wires"
        aria-hidden="true"
        viewBox={`0 0 ${Math.max(1, size?.width ?? 1)} ${Math.max(1, size?.height ?? 1)}`}
        preserveAspectRatio="none"
      >
        {state.links.map((link) => {
          const a = anchors[`L:${link.left}`];
          const b = anchors[`R:${link.right}`];
          if (!a || !b) return null;
          const key = `${link.left} ${link.right}`;
          const stroke = penStroke(
            [
              [a.x, a.y],
              [b.x, b.y],
            ],
            penRng(key),
            { wobble: 1.6, spacing: 18 },
          );
          return (
            <path
              key={key}
              className={ringed.has(key) ? 'wobo-answer-ring' : 'wobo-answer-learner'}
              d={stroke.d}
            />
          );
        })}
      </svg>

      <div className="wobo-answer-column">
        {spec.left.map((item) => (
          <button
            key={item.id}
            type="button"
            ref={register(`L:${item.id}`)}
            className="wobo-answer-btn"
            {...matchLeftAria(spec, state, item.id, item.label, picked)}
            aria-disabled={disabled || undefined}
            onClick={() => {
              if (disabled) return;
              setPicked((now) => (now === item.id ? null : item.id));
            }}
            onKeyDown={(e) => {
              const next = matchKey(e, picked, { side: 'left', id: item.id });
              if (!next) return;
              e.preventDefault();
              setPicked(next.picked);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="wobo-answer-column">
        {spec.right.map((item) => (
          <button
            key={item.id}
            type="button"
            ref={register(`R:${item.id}`)}
            className="wobo-answer-btn"
            {...matchRightAria(item.label, picked)}
            data-on={state.links.some((l) => l.right === item.id)}
            onClick={() => {
              if (picked === null) return;
              join(picked, item.id);
              setPicked(null);
            }}
            onKeyDown={(e) => {
              const next = matchKey(e, picked, { side: 'right', id: item.id });
              if (!next) return;
              e.preventDefault();
              setPicked(next.picked);
              if (next.join) join(next.join.left, next.join.right);
            }}
            onPointerUp={() => {
              if (picked === null) return;
              join(picked, item.id);
              setPicked(null);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
