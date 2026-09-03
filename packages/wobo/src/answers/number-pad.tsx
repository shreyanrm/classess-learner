'use client';

/**
 * Number pad — digits, a minus, a decimal point and a fraction bar, with the value typeset above
 * the keys as it is built.
 *
 * The display is written in Wobo's hand and, when the entry is a fraction, it is set as a fraction:
 * a numerator over a bar over a denominator, not `3/4` on one line. A learner answering "three
 * quarters" should see three quarters.
 */

import type { AnswerCheck, AnswerSpecOf, AnswerStateOf } from '@wobo/contracts';
import type { ReactNode } from 'react';
import { padDisplayAria, padKeyAria } from './a11y';
import { HandValue } from './hand';
import { padKey } from './keyboard';
import { pressPad } from './state';
import { BoxRing, highlightsOf } from './ui';

type Spec = AnswerSpecOf<'number_pad'>;

/** The entry as TeX, so a fraction is set as a fraction and everything else is set as it reads. */
export function padTex(entry: string): string {
  const bar = entry.indexOf('/');
  if (bar < 0) return entry;
  const head = entry.slice(0, bar);
  const tail = entry.slice(bar + 1);
  const negative = head.startsWith('-');
  const numerator = negative ? head.slice(1) : head;
  return `${negative ? '-' : ''}\\frac{${numerator || ' '}}{${tail || ' '}}`;
}

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export interface NumberPadProps {
  spec: Spec;
  state: AnswerStateOf<'number_pad'>;
  onChange: (next: AnswerStateOf<'number_pad'>) => void;
  result?: AnswerCheck | null;
  disabled?: boolean;
}

export function NumberPad({ spec, state, onChange, result, disabled }: NumberPadProps): ReactNode {
  const keys = spec.keys ?? {};
  const extra = [
    keys.minus ? '-' : null,
    keys.decimal ? '.' : null,
    keys.fraction ? '/' : null,
  ].filter((k): k is string => k !== null);
  const ringed = highlightsOf(result, 'entry').length > 0;
  const press = (key: string): void => {
    if (disabled) return;
    onChange(pressPad(state, key));
  };

  return (
    // A fieldset, not a div: the pad IS a group of controls, and the browser already says so. The
    // key handler sits here so a press anywhere inside the pad reaches the display.
    <fieldset
      className="wobo-answer-set"
      onKeyDown={(e) => {
        if (disabled) return;
        const next = padKey(state, e);
        if (next) {
          e.preventDefault();
          onChange(next);
        }
      }}
    >
      <legend className="wobo-answer-sr">{spec.prompt ?? 'number pad'}</legend>
      <div className="wobo-answer-display">
        <svg
          viewBox="0 0 200 56"
          style={{ aspectRatio: '200 / 56', width: '100%', maxWidth: 260 }}
          aria-hidden="true"
        >
          <title>your answer so far</title>
          {state.entry === '' ? (
            <text className="wobo-answer-label" x={4} y={34} fontSize={16}>
              your answer
            </text>
          ) : (
            <HandValue
              text={padTex(state.entry)}
              origin={[8, 8]}
              size={28}
              tex
              className="wobo-answer-mark"
            />
          )}
          {ringed ? <BoxRing box={[4, 4, 192, 48]} seed={`pad-${spec.id}`} /> : null}
        </svg>
        {spec.unit ? <span className="wobo-answer-readout">{spec.unit}</span> : null}
        <span className="wobo-answer-sr" {...padDisplayAria(spec, state)} aria-live="polite" />
      </div>

      <div className="wobo-answer-pad">
        {DIGITS.map((d) => (
          <button
            key={d}
            type="button"
            className="wobo-answer-btn"
            {...padKeyAria(d)}
            aria-disabled={disabled || undefined}
            onClick={() => press(d)}
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          className="wobo-answer-btn"
          {...padKeyAria('0')}
          aria-disabled={disabled || undefined}
          onClick={() => press('0')}
        >
          0
        </button>
        {extra.map((k) => (
          <button
            key={k}
            type="button"
            className="wobo-answer-btn"
            {...padKeyAria(k)}
            aria-disabled={disabled || undefined}
            onClick={() => press(k)}
          >
            {k === '/' ? 'a/b' : k}
          </button>
        ))}
        <button
          type="button"
          className="wobo-answer-btn"
          {...padKeyAria('back')}
          aria-disabled={disabled || undefined}
          onClick={() => press('back')}
        >
          back
        </button>
      </div>
    </fieldset>
  );
}
