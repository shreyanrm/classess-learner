import { duration, easing } from '@classess/config';
import { parseCubicBezier } from './internal/ease';

/**
 * Motion tokens, translated from @classess/config into framer-motion's units. Never hardcode a
 * duration or easing in a primitive — derive it here so the design system stays the source of truth.
 */

/** Config durations are milliseconds; framer-motion transitions are in seconds. */
export const SEC = {
  micro: duration.micro / 1000,
  standard: duration.standard / 1000,
  signature: duration.signature / 1000,
} as const;

/** Config easings are CSS cubic-bezier strings; framer-motion wants `[x1, y1, x2, y2]`. */
export const EASE = {
  standard: parseCubicBezier(easing.standard),
  emphasized: parseCubicBezier(easing.emphasized),
  decelerate: parseCubicBezier(easing.decelerate),
  accelerate: parseCubicBezier(easing.accelerate),
} as const;
