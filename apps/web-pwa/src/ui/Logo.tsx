'use client';

/** The Classess wordmark — the real brand asset, served from public/. */

export function ClassessLogo({ height = 22 }: { height?: number }) {
  return (
    <img
      src="/classess-logo.png"
      alt="Classess"
      style={{
        height: height * 1.5,
        width: 'auto',
        display: 'block',
        userSelect: 'none',
        filter: 'var(--clss-logo-filter)',
      }}
      draggable={false}
    />
  );
}
