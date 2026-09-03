'use client';

/**
 * Every link on this page, and the one rule they follow: an anchor stays on the page, an address
 * goes through the app's own router.
 *
 * The prototype is a single static document, so every href in it is a `#hash`. Inside the app, half
 * of those names are real routes (`/plans`, `/help`, the legal set) and half are sections of this
 * page. `PageLink` tells them apart by the first character, and — this is the point — it keeps the
 * href on the anchor either way, so the link still copies, still opens in a new tab, and still
 * reads as a link to a screen reader and to a crawler. Only the plain left-click is intercepted.
 */

import type { ReactNode } from 'react';
import { pathToRoute, useRouter } from '../../../shell/router';

/** Scroll to a section of this page, honouring the reader's motion preference. */
export function scrollToAnchor(hash: string): void {
  if (typeof document === 'undefined') return;
  const el = document.getElementById(hash.replace(/^#/, ''));
  if (!el) return;
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
}

/** A left-click with no modifier and no middle button — the only one we take over. */
function isPlainClick(e: React.MouseEvent): boolean {
  return !e.defaultPrevented && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button === 0;
}

export function PageLink({
  href,
  className,
  children,
  ...rest
}: {
  href: string;
  className?: string;
  children: ReactNode;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  const router = useRouter();
  return (
    <a
      href={href}
      className={className}
      onClick={(e) => {
        if (!isPlainClick(e)) return;
        if (href.startsWith('#')) {
          e.preventDefault();
          scrollToAnchor(href);
          return;
        }
        const route = pathToRoute(href);
        // A path we do not recognise is left to the browser rather than swallowed into a 404 the
        // app invented — the address bar should show what the reader actually followed.
        if (!route) return;
        e.preventDefault();
        router.navigate(route);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
