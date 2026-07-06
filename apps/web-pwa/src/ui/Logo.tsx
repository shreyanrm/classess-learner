'use client';

/**
 * The Classess wordmark — heavy ink letterforms with the four-colour sparkle cluster at the C.
 * Recreated from the brand mark; swap in the licensed asset at public/logo.svg any time.
 */

export function ClassessLogo({ height = 22 }: { height?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 2, userSelect: 'none' }}>
      <span style={{ position: 'relative', display: 'inline-block' }}>
        {/* the sparkle cluster */}
        <svg
          aria-hidden
          width={height * 0.62}
          height={height * 0.62}
          viewBox="0 0 20 20"
          style={{ position: 'absolute', top: -height * 0.28, right: -height * 0.18 }}
        >
          <path
            d="M6 1 L6.9 4.1 L10 5 L6.9 5.9 L6 9 L5.1 5.9 L2 5 L5.1 4.1 Z"
            fill="#EA4335"
            transform="scale(0.62) translate(2 0)"
          />
          <path
            d="M6 1 L6.9 4.1 L10 5 L6.9 5.9 L6 9 L5.1 5.9 L2 5 L5.1 4.1 Z"
            fill="#4285F4"
            transform="translate(6 7)"
          />
          <path
            d="M6 1 L6.9 4.1 L10 5 L6.9 5.9 L6 9 L5.1 5.9 L2 5 L5.1 4.1 Z"
            fill="#FBBC05"
            transform="scale(0.5) translate(26 22)"
          />
          <path
            d="M6 1 L6.9 4.1 L10 5 L6.9 5.9 L6 9 L5.1 5.9 L2 5 L5.1 4.1 Z"
            fill="#34A853"
            transform="scale(0.42) translate(4 34)"
          />
        </svg>
        <span
          style={{
            fontWeight: 800,
            fontSize: height,
            lineHeight: 1,
            letterSpacing: '-0.04em',
            color: 'var(--clss-ink-900)',
          }}
        >
          Classess
        </span>
      </span>
    </span>
  );
}
