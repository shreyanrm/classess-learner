'use client';

/**
 * Reveal on scroll, as the site prototypes do it.
 *
 * Visible at rest: a block is only set back (`st-pre`: faded, 18px low) when it is still below the
 * fold at the moment it mounts, and it settles the moment a fifth of it scrolls into view. Nothing
 * is ever hidden from a reader who has already scrolled past it, from a print, or from a crawler.
 * Reduced motion never sets anything back, so there is no transition and nothing to wait for.
 */

import { useReducedMotion } from '@wobo/motion';
import { createElement, type ReactNode, useEffect, useRef, useState } from 'react';

export function Reveal({
  children,
  as = 'div',
  className,
  id,
}: {
  children: ReactNode;
  as?: 'div' | 'section' | 'article';
  className?: string;
  id?: string;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement | null>(null);
  const [pre, setPre] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced || typeof IntersectionObserver === 'undefined') return;
    if (el.getBoundingClientRect().top <= window.innerHeight) return;
    setPre(true);
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setPre(false);
            io.disconnect();
          }
        }
      },
      { threshold: 0.18 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);
  const cls = ['st-reveal', pre && 'st-pre', className].filter(Boolean).join(' ');
  return createElement(as, { ref, id, className: cls }, children);
}
