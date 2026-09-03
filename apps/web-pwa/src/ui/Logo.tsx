'use client';

/**
 * The Wobo wordmark — inline SVG so it inherits the surface's ink via currentColor
 * (light and dark for free) and stays crisp at any size. One hit of pigment: the
 * ultramarine spark at the top-right of the final o — "ignite at rest" (DESIGN.md §2).
 */

const SPARK =
  'M232 10 C233.4 18.6 236.4 21.6 245 23 C236.4 24.4 233.4 27.4 232 36 C230.6 27.4 227.6 24.4 219 23 C227.6 21.6 230.6 18.6 232 10 Z';

export function WoboLogo({ height = 22 }: { height?: number }) {
  return (
    <svg
      viewBox="0 0 250 100"
      height={height * 1.5}
      width={height * 1.5 * 2.5}
      role="img"
      aria-label="Wobo"
      style={{ display: 'block', userSelect: 'none', flexShrink: 0 }}
    >
      <text
        x="4"
        y="78"
        fontSize="82"
        fontWeight={800}
        letterSpacing="-0.045em"
        fill="currentColor"
        textLength="212"
        lengthAdjust="spacingAndGlyphs"
      >
        Wobo
      </text>
      {/* the spark rides the ultramarine token, so it lightens for contrast on graphite */}
      <path fill="var(--wobo-ultramarine, #1F35E0)" d={SPARK} />
    </svg>
  );
}
