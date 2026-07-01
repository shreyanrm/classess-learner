/**
 * Pure easing helpers. No runtime imports so this stays trivially testable and free of the
 * React/framer-motion graph.
 *
 * @classess/config publishes easings as CSS `cubic-bezier(...)` strings; framer-motion's JS engine
 * wants `[x1, y1, x2, y2]`. We parse rather than re-declare so the tokens never drift.
 */

export type CubicBezier = [number, number, number, number];

/** Parse a CSS `cubic-bezier(x1, y1, x2, y2)` string into the 4-tuple framer-motion expects. */
export function parseCubicBezier(css: string): CubicBezier {
  const match = css.match(/cubic-bezier\(([^)]+)\)/);
  if (!match?.[1]) {
    throw new Error(`not a cubic-bezier easing: ${css}`);
  }
  const parts = match[1].split(',').map((p) => Number(p.trim()));
  const [a, b, c, d] = parts;
  if (
    parts.length !== 4 ||
    a === undefined ||
    b === undefined ||
    c === undefined ||
    d === undefined ||
    Number.isNaN(a) ||
    Number.isNaN(b) ||
    Number.isNaN(c) ||
    Number.isNaN(d)
  ) {
    throw new Error(`invalid cubic-bezier easing: ${css}`);
  }
  return [a, b, c, d];
}
