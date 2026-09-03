/**
 * Answer kinds — the interactive answers of WOBO-PLAN.md §16, "answering is doing".
 *
 * `check.ts` is the seam: one pure `check(spec, state)` the app runs for instant feedback and the
 * brain runs again for evidence. `state.ts` and `keyboard.ts` hold every legal move as a pure
 * function, so a drag and an arrow key produce the same state. `a11y.ts` states the roles as data.
 * The components are thin: they draw, they call, they never decide.
 *
 * The spec, state and check shapes live in `@wobo/contracts`; nothing here re-declares them.
 */

export * from './a11y';
export { ANGLE_TOLERANCE, check, DRAW_TOLERANCE, STRAIGHT_LIMIT, sliderTolerance } from './check';
export { ChooseVisual, type ChooseVisualProps } from './choose-visual';
export { CirclePart, type CirclePartProps } from './circle-part';
export { AnswerControl, type AnswerControlProps } from './control';
export { DrawAnswer, type DrawAnswerProps } from './draw';
export { Expression, type ExpressionProps } from './expression';
export { FigurePicture, FigureRule, VisualPicture } from './figure';
export * from './geometry';
export { type HandProps, HandValue, plainOf } from './hand';
export * from './keyboard';
export { Match, type MatchProps } from './match';
export { NumberPad, type NumberPadProps, padTex } from './number-pad';
export { Order, type OrderProps } from './order';
export { fromSvg, PlacePoints, type PlacePointsProps, toSvg } from './place-points';
export * from './samples';
export { ShadeRegions, type ShadeRegionsProps } from './shade-regions';
export { Slider, type SliderProps, trackValue, trackX } from './slider';
export * from './state';
export {
  ANSWER_CSS,
  AnswerCanvas,
  AnswerFrame,
  type AnswerFrameProps,
  BoxRing,
  highlightsOf,
  type Keyed,
  keyed,
  PointRing,
  pointTargetStyle,
  ringAt,
  ringPath,
  svgPoint,
  targetStyle,
} from './ui';
export * from './value';
