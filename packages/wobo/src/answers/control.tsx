'use client';

/**
 * `AnswerControl` — one component the host renders for any answer kind.
 *
 * The host owns the spec, the state and the single Check button (WOBO-PLAN.md §16: one primary
 * control per screen). This component owns the frame, "start over", the live readout, and the
 * dispatch to the right kind. A state of the wrong kind renders nothing rather than throwing —
 * specs arrive over a network, and a mismatch is bad data, not a crash on a learner's screen.
 */

import type { AnswerCheck, AnswerSpec, AnswerState } from '@wobo/contracts';
import type { ReactNode } from 'react';
import { stateReadout } from './a11y';
import { ChooseVisual } from './choose-visual';
import { CirclePart } from './circle-part';
import { DrawAnswer } from './draw';
import { Expression } from './expression';
import { Match } from './match';
import { NumberPad } from './number-pad';
import { Order } from './order';
import { PlacePoints } from './place-points';
import { ShadeRegions } from './shade-regions';
import { Slider } from './slider';
import { isEmptyState, resetState } from './state';
import { AnswerFrame } from './ui';

export interface AnswerControlProps {
  spec: AnswerSpec;
  state: AnswerState;
  onChange: (next: AnswerState) => void;
  /** The last result of `check`, so the control can ring exactly what Wobo is about to point at. */
  result?: AnswerCheck | null;
  disabled?: boolean;
  /** Ink already on the board, for the two kinds that answer over a figure. */
  backdrop?: ReactNode;
}

/** The interactive half of an item, with its frame. The Check button belongs to the host. */
export function AnswerControl({
  spec,
  state,
  onChange,
  result,
  disabled,
  backdrop,
}: AnswerControlProps): ReactNode {
  if (spec.kind !== state.kind) return null;
  const shared = { result, disabled } as const;
  const body = ((): ReactNode => {
    switch (spec.kind) {
      case 'shade_regions':
        return state.kind === 'shade_regions' ? (
          <ShadeRegions spec={spec} state={state} onChange={onChange} {...shared} />
        ) : null;
      case 'place_points':
        return state.kind === 'place_points' ? (
          <PlacePoints spec={spec} state={state} onChange={onChange} {...shared} />
        ) : null;
      case 'slider':
        return state.kind === 'slider' ? (
          <Slider spec={spec} state={state} onChange={onChange} {...shared} />
        ) : null;
      case 'order':
        return state.kind === 'order' ? (
          <Order spec={spec} state={state} onChange={onChange} {...shared} />
        ) : null;
      case 'match':
        return state.kind === 'match' ? (
          <Match spec={spec} state={state} onChange={onChange} {...shared} />
        ) : null;
      case 'number_pad':
        return state.kind === 'number_pad' ? (
          <NumberPad spec={spec} state={state} onChange={onChange} {...shared} />
        ) : null;
      case 'expression':
        return state.kind === 'expression' ? (
          <Expression spec={spec} state={state} onChange={onChange} {...shared} />
        ) : null;
      case 'draw':
        return state.kind === 'draw' ? (
          <DrawAnswer
            spec={spec}
            state={state}
            onChange={onChange}
            backdrop={backdrop}
            {...shared}
          />
        ) : null;
      case 'circle_part':
        return state.kind === 'circle_part' ? (
          <CirclePart
            spec={spec}
            state={state}
            onChange={onChange}
            backdrop={backdrop}
            {...shared}
          />
        ) : null;
      case 'choose_visual':
        return state.kind === 'choose_visual' ? (
          <ChooseVisual spec={spec} state={state} onChange={onChange} {...shared} />
        ) : null;
    }
  })();

  return (
    <AnswerFrame
      prompt={spec.prompt}
      readout={stateReadout(spec, state)}
      canReset={!disabled && !isEmptyState(spec, state)}
      onReset={() => onChange(resetState(spec))}
    >
      {body}
    </AnswerFrame>
  );
}
