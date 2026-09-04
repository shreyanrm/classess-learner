/**
 * The kit's few drawn marks, from the prototype: the four rail icons (24px grid, 2.4 stroke, round
 * caps and joins, currentColor), the microphone, and the wordmark.
 */

import type { SVGProps } from 'react';

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

export type NavIconName = 'home' | 'learn' | 'practice' | 'you';

export function NavIcon({ name, ...rest }: { name: NavIconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...rest}>
      {name === 'home' && <path d="M4 11 L12 4 L20 11 V20 H4 Z" />}
      {name === 'learn' && <path d="M4 6 h16 v12 H4 z M8 10 h8 M8 14 h5" />}
      {name === 'practice' && <path d="M5 5 h14 v14 H5 z M5 12 h14 M12 5 v14" />}
      {name === 'you' && (
        <>
          <circle cx="12" cy="9" r="4" />
          <path d="M4 20 c2 -5 14 -5 16 0" />
        </>
      )}
    </svg>
  );
}

/** The microphone in the ask box — Wobo blue, 20px. */
export function MicIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="var(--pig)"
      strokeWidth={2.4}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M6 11 a6 6 0 0 0 12 0 M12 17 v4" />
    </svg>
  );
}

/**
 * The wordmark. Re-exported from the one file that holds the artwork, so a surface can never
 * again ship the product name set in a typeface and pass for the logo.
 */
export { WORDMARK_RATIO, Wordmark } from './Wordmark';
