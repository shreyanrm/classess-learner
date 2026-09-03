'use client';

/**
 * Choose among visuals — two to six drawn options, one answer or several.
 *
 * The options are drawings, not sentences, which is the whole reason this kind exists: "which one
 * shows three quarters" is a question about a picture. Each option still carries a real label, so
 * the screen-reader path is the same question and not a lesser one.
 */

import type { AnswerCheck, AnswerSpecOf, AnswerStateOf } from '@wobo/contracts';
import type { ReactNode } from 'react';
import { visualGroupAria, visualOptionAria } from './a11y';
import { VisualPicture } from './figure';
import { isActivate } from './keyboard';
import { toggleOption } from './state';
import { BoxRing, highlightsOf } from './ui';

type Spec = AnswerSpecOf<'choose_visual'>;

export interface ChooseVisualProps {
  spec: Spec;
  state: AnswerStateOf<'choose_visual'>;
  onChange: (next: AnswerStateOf<'choose_visual'>) => void;
  result?: AnswerCheck | null;
  disabled?: boolean;
}

export function ChooseVisual({
  spec,
  state,
  onChange,
  result,
  disabled,
}: ChooseVisualProps): ReactNode {
  const ringed = new Set(highlightsOf(result, 'option').map((h) => h.id));
  const pick = (id: string): void => {
    if (disabled) return;
    onChange(toggleOption(spec, state, id));
  };

  const group = visualGroupAria(spec);
  return (
    // A fieldset: a set of options IS what the element is for, and a radiogroup is the one role it
    // does not already carry, so that is the only role ever spelled out.
    <fieldset
      className="wobo-answer-options"
      aria-label={group['aria-label']}
      {...(spec.multi ? { 'aria-multiselectable': true } : { role: 'radiogroup' as const })}
    >
      <legend className="wobo-answer-sr">{group['aria-label']}</legend>
      {spec.options.map((option) => (
        <button
          key={option.id}
          type="button"
          className="wobo-answer-btn wobo-answer-option"
          {...visualOptionAria(spec, state, option.id, option.label)}
          aria-disabled={disabled || undefined}
          onClick={() => pick(option.id)}
          onKeyDown={(e) => {
            if (!isActivate(e)) return;
            e.preventDefault();
            pick(option.id);
          }}
        >
          <svg
            viewBox="-6 -6 112 112"
            style={{ aspectRatio: '1 / 1', width: '100%' }}
            aria-hidden="true"
          >
            <title>{option.label}</title>
            <VisualPicture visual={option.visual} />
            {ringed.has(option.id) ? (
              <BoxRing box={[0, 0, 100, 100]} seed={`opt-${option.id}`} />
            ) : null}
          </svg>
          <span className="wobo-answer-option-name">{option.label}</span>
        </button>
      ))}
    </fieldset>
  );
}
