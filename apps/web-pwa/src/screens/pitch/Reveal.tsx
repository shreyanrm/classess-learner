'use client';

/**
 * Reveal on scroll, as the pitch prototypes do it — the site shell's reveal plus the second class
 * the six pitch pages need.
 *
 * The prototypes set two things on a `.reveal` block: `pre` (faded, 18px low) while it is still
 * below the fold, taken off when a fifth of it scrolls into view, and `on` the moment it has been
 * seen. `on` is what draws the drawings: every `.draw` stroke inside a seen block runs its
 * dashoffset to zero, the highlighter under a chapter's key word sweeps in, the security page's
 * data-flow diagram draws its arrows. Here those are `st-pre` (the shell's own name, so the two
 * reveals share one transition) and `pt-on`.
 *
 * Visible at rest, as the shell's is: nothing is ever hidden from a reader who has scrolled past
 * it, from a print, or from a crawler. Reduced motion never sets anything back and marks every
 * block seen at once, and the sheet finishes every drawing for it.
 */

import { useReducedMotion } from '@wobo/motion';
import {
  type CSSProperties,
  createElement,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';

export function Reveal({
  children,
  as = 'div',
  className,
  id,
  style,
}: {
  children: ReactNode;
  as?: 'div' | 'section' | 'article';
  className?: string;
  id?: string;
  style?: CSSProperties;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement | null>(null);
  const [pre, setPre] = useState(false);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced || typeof IntersectionObserver === 'undefined') {
      setOn(true);
      return;
    }
    if (el.getBoundingClientRect().top > window.innerHeight) setPre(true);
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setPre(false);
            setOn(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.18 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);
  const cls = ['st-reveal', pre && 'st-pre', on && 'pt-on', className].filter(Boolean).join(' ');
  return createElement(as, { ref, id, className: cls, style }, children);
}
