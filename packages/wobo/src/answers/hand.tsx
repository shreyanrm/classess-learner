'use client';

/**
 * Values written in Wobo's hand.
 *
 * When the board's Caveat outlines have been parsed, a number or an expression is laid out with the
 * board's own `writeText` / `layoutTex` and drawn as real glyph outlines — the same hand that
 * writes on the board writes the learner's answer back to them. Until then (and wherever the font
 * never loads) the same string is typeset in the Caveat face with an SVG `<text>`: identical
 * content, identical position, no layout shift and nothing missing.
 *
 * Nothing here is hidden from assistive technology on its own. The value is announced by the
 * control that owns it — a live region on the pad, `aria-valuetext` on the slider — and the SVG it
 * sits in is where that decision belongs, not on the ink.
 */

import { fontFamily } from '@wobo/config';
import type { AnswerPoint } from '@wobo/contracts';
import type { ReactNode } from 'react';
import { type HandGlyph, handFont, layoutTex, writeText } from '../board/handwriting';
import type { Stroke } from '../board/pen';

/** How a written value is placed: `origin` is the top-left of the block, as on the board. */
export interface HandProps {
  text: string;
  origin: AnswerPoint;
  size: number;
  /** Read the string as TeX (fractions, powers, roots) rather than as a plain line. */
  tex?: boolean;
  /** Centre the block on `origin.x` instead of starting at it. */
  centred?: boolean;
  className?: string;
}

/**
 * Glyphs as SVG nodes. A glyph Caveat carries is a filled outline; a symbol Wobo draws by hand is
 * its pen trace. Keys come from the path data, which is unique because it is absolute coordinates.
 */
function glyphNodes(glyphs: readonly HandGlyph[], size: number): ReactNode[] {
  const nodes: ReactNode[] = [];
  for (const glyph of glyphs) {
    if (glyph.fill && !glyph.drawn) {
      nodes.push(<path key={glyph.fill} d={glyph.fill} fill="currentColor" />);
      continue;
    }
    for (const trace of glyph.trace) nodes.push(strokeNode(trace, size));
  }
  return nodes;
}

function strokeNode(stroke: Pick<Stroke, 'd'>, size: number): ReactNode {
  return (
    <path
      key={stroke.d}
      d={stroke.d}
      fill="none"
      stroke="currentColor"
      strokeWidth={size * 0.07}
      strokeLinecap="round"
    />
  );
}

/** The written ink, or null when the hand has not been loaded and the fallback must carry it. */
function drawn(props: HandProps): ReactNode[] | null {
  const font = handFont();
  if (!font) return null;
  const { text, origin, size, tex } = props;
  // Two calls rather than one branch on a union: a TeX layout also carries ruled bars (fraction
  // bars, radical overbars), and a written line does not.
  const laid = tex ? layoutTex(font, text, origin, size) : null;
  const written = laid ? null : writeText(font, text, origin, { size });
  const glyphs = laid ? laid.glyphs : (written?.glyphs ?? []);
  const rules: Stroke[] = laid ? laid.rules : [];
  const width = laid ? laid.width : (written?.width ?? 0);
  const shift = props.centred ? -width / 2 : 0;
  return [
    <g key="ink" transform={`translate(${shift} 0)`}>
      {glyphNodes(glyphs, size)}
      {rules.map((rule) => strokeNode(rule, size))}
    </g>,
  ];
}

/** A value written in Wobo's hand inside an SVG, with a typeset fallback carrying the same string. */
export function HandValue(props: HandProps): ReactNode {
  const ink = drawn(props);
  if (ink) return <g className={props.className}>{ink}</g>;
  const [x, y] = props.origin;
  return (
    <text
      className={props.className}
      x={x}
      y={y + props.size * 0.78}
      textAnchor={props.centred ? 'middle' : 'start'}
      fontFamily={fontFamily.handwritten}
      fontSize={props.size}
      fill="currentColor"
    >
      {props.tex ? plainOf(props.text) : props.text}
    </text>
  );
}

/**
 * A piece of a flattened expression, bracketed only when it needs to be. A half-typed slot is
 * still blank rather than a pair of empty brackets, so `3/` reads as `3/` while it is being typed.
 */
const ATOM = /^[A-Za-z0-9.π√]+$/;
function wrap(part: string): string {
  const bare = part.trim();
  return bare === '' || ATOM.test(bare) ? bare : `(${bare})`;
}

/**
 * TeX read as a flat line, for the fallback: `\frac{1}{2}` becomes `1/2`, `x^{2}` becomes `x^2`,
 * and only a compound part earns brackets — `\frac{x+1}{2}` becomes `(x+1)/2`. Never a raw
 * backslash on a learner's screen.
 */
export function plainOf(tex: string): string {
  let out = tex;
  for (let i = 0; i < 6; i++) {
    const next = out
      .replace(
        /\\frac\{([^{}]*)\}\{([^{}]*)\}/g,
        (_, a: string, b: string) => `${wrap(a)}/${wrap(b)}`,
      )
      .replace(/\\sqrt\{([^{}]*)\}/g, (_, a: string) => `\u221A${wrap(a)}`)
      .replace(/\^\{([^{}]*)\}/g, '^$1')
      .replace(/_\{([^{}]*)\}/g, '_$1');
    if (next === out) break;
    out = next;
  }
  return out
    .replaceAll('\\times', '\u00D7')
    .replaceAll('\\div', '\u00F7')
    .replaceAll('\\pi', '\u03C0')
    .replace(/\\([a-zA-Z]+)/g, '$1')
    .replaceAll('{', '(')
    .replaceAll('}', ')');
}
