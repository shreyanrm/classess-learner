/**
 * @classess/motion — the named, shared motion language (docs/02-DESIGN/01-motion-system.md).
 *
 * GPU-friendly primitives (transform/opacity; filter only where it IS the meaning). Every motion
 * carries meaning; timing and easing come from @classess/config; no drop shadows anywhere. Every
 * primitive honours `prefers-reduced-motion` via `useReducedMotion` and ships a calm equivalent.
 */

// Annotation kit
export {
  type AnnotationProps,
  Arrow,
  Bracket,
  Check,
  Circle,
  CrossOut,
  LookHere,
  type LookHereProps,
  Underline,
} from './annotation';
export {
  ConstellationIgnite,
  type ConstellationIgniteProps,
  type ConstellationNode,
} from './constellation-ignite';
// Data
export { CountUp, type CountUpProps, SpringBar, type SpringBarProps } from './data';
// Entrance
export {
  BlurIn,
  type BlurInProps,
  Reveal,
  type RevealProps,
  Stagger,
  StaggerItem,
  type StaggerItemProps,
  type StaggerProps,
} from './entrance';
// Focus
export {
  Spotlight,
  type SpotlightProps,
  SpotlightTilt,
  type SpotlightTiltProps,
  Tilt3D,
  type Tilt3DProps,
} from './focus';
// Signature motions
export { Ignite, type IgniteProps } from './ignite';
// Interaction
export { Magnetic, type MagneticProps, Ripple, type RippleProps } from './interaction';
export {
  type ConstellationEdge,
  type ConstellationRank,
  constellationOrder,
} from './internal/constellation';
export { countUpValue, type FormatNumberOptions, formatNumber } from './internal/count-up';
// Pure helpers (also unit-tested)
export { type CubicBezier, parseCubicBezier } from './internal/ease';
export { selectMotion } from './internal/reduced-motion';
// Tokens + reduced-motion plumbing
export { EASE, SEC } from './motion-tokens';
export type { MotionBaseProps } from './types';
export { useReducedMotion } from './use-reduced-motion';
