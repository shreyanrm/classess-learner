/**
 * Pure fallback selection. The whole library honours `prefers-reduced-motion` by choosing a calm
 * variant in place of the full one — this is the single decision point, kept pure so it is testable
 * without a DOM.
 */

/** Return the calm value when motion is reduced, otherwise the full value. */
export function selectMotion<T>(reduced: boolean, full: T, calm: T): T {
  return reduced ? calm : full;
}
