'use client';

/**
 * Expression keyboard — fractions, powers, roots, pi and the trig functions, with the expression
 * previewed in Wobo's hand as it is built.
 *
 * The state is one LaTeX-ish string, which is what the brain grades and what an item author writes.
 * Empty slots are a literal `\square`, and the hand already draws an unknown glyph as a small
 * hollow box, so a half-built expression looks like a half-built expression rather than a gap.
 */

import type { AnswerCheck, AnswerSpecOf, AnswerStateOf } from '@wobo/contracts';
import type { ReactNode } from 'react';
import { expressionKeyAria } from './a11y';
import { HandValue } from './hand';
import { expressionKey } from './keyboard';
import { pressExpression, previewTex } from './state';
import { BoxRing, highlightsOf } from './ui';

type Spec = AnswerSpecOf<'expression'>;

/** The face each key shows. The name it is announced by lives in `a11y.ts`. */
const FACE: Record<string, string> = {
  fraction: 'a/b',
  power: 'x²',
  root: '√',
  pi: 'π',
  sin: 'sin',
  cos: 'cos',
  tan: 'tan',
  times: '×',
  divide: '÷',
  plus: '+',
  minus: '−',
  equals: '=',
  paren: '( )',
  variable: 'x',
};

export interface ExpressionProps {
  spec: Spec;
  state: AnswerStateOf<'expression'>;
  onChange: (next: AnswerStateOf<'expression'>) => void;
  result?: AnswerCheck | null;
  disabled?: boolean;
}

export function Expression({
  spec,
  state,
  onChange,
  result,
  disabled,
}: ExpressionProps): ReactNode {
  const ringed = highlightsOf(result, 'entry').length > 0;
  const press = (key: string): void => {
    if (disabled) return;
    onChange(pressExpression(state, key));
  };
  // A `variable` key stands for whatever letters this item needs; with none named it is `x`.
  const letters = spec.variables ?? ['x'];
  const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    // A fieldset, not a div: the keyboard IS a group of controls. The key handler sits here so a
    // press anywhere inside it reaches the preview.
    <fieldset
      className="wobo-answer-set"
      onKeyDown={(e) => {
        if (disabled) return;
        const next = expressionKey(state, e);
        if (next) {
          e.preventDefault();
          onChange(next);
        }
      }}
    >
      <legend className="wobo-answer-sr">{spec.prompt ?? 'maths keyboard'}</legend>
      <div className="wobo-answer-display">
        <svg
          viewBox="0 0 320 64"
          style={{ aspectRatio: '320 / 64', width: '100%', maxWidth: 420 }}
          aria-hidden="true"
        >
          <title>your expression so far</title>
          {state.latex === '' ? (
            <text className="wobo-answer-label" x={4} y={38} fontSize={18}>
              your expression
            </text>
          ) : (
            <HandValue
              text={previewTex(state.latex)}
              origin={[8, 10]}
              size={30}
              tex
              className="wobo-answer-mark"
            />
          )}
          {ringed ? <BoxRing box={[4, 4, 312, 56]} seed={`expr-${spec.id}`} /> : null}
        </svg>
        <span className="wobo-answer-sr" role="status" aria-live="polite">
          {state.latex === '' ? 'empty' : state.latex}
        </span>
      </div>

      <div className="wobo-answer-keys">
        {spec.keys.map((key) =>
          key === 'variable' ? (
            letters.map((letter) => (
              <button
                key={`v-${letter}`}
                type="button"
                className="wobo-answer-btn"
                {...expressionKeyAria(letter)}
                aria-disabled={disabled || undefined}
                onClick={() => press(letter)}
              >
                {letter}
              </button>
            ))
          ) : (
            <button
              key={key}
              type="button"
              className="wobo-answer-btn"
              {...expressionKeyAria(key)}
              aria-disabled={disabled || undefined}
              onClick={() => press(key)}
            >
              {FACE[key] ?? key}
            </button>
          ),
        )}
        {digits.map((d) => (
          <button
            key={d}
            type="button"
            className="wobo-answer-btn"
            {...expressionKeyAria(d)}
            aria-disabled={disabled || undefined}
            onClick={() => press(d)}
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          className="wobo-answer-btn"
          {...expressionKeyAria('back')}
          aria-disabled={disabled || undefined}
          onClick={() => press('back')}
        >
          back
        </button>
      </div>
    </fieldset>
  );
}
