'use client';

/**
 * Links on the public site, and the one list of where the public site goes.
 *
 * A link here is a real `<a href>` with a real address, because these are pages people bookmark,
 * share, open in a new tab and hand to a crawler — and a `<button>` styled as a link is none of
 * those things. A plain left click is taken over by the app's router so the navigation costs no
 * reload; a middle click, a modified click, or a right click is left to the browser, which is the
 * visitor asking for a tab and getting one.
 *
 * `PUBLIC_LINKS` is the single list every public header and footer draws. There used to be two
 * headers with disjoint link sets — /about and /help could not reach /plans, and /plans could not
 * reach /help — which meant the site a visitor could see depended on which page they landed on.
 */

import type { MouseEvent, ReactNode } from 'react';
import { pathToRoute, type Route, routeToPath, useRouter } from '../../shell/router';

/** True where a click is the browser's to handle rather than the router's. */
export function browserOwnsClick(event: {
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  button: number;
}): boolean {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

/**
 * The route an in-app path addresses. `/` is the landing page rather than the home screen: on the
 * public site the wordmark goes to the front door, not into a signed-in learner's app.
 */
export function hrefRoute(href: string): Route | null {
  if (!href.startsWith('/')) return null;
  const clean = href.split('#')[0] ?? '/';
  if (clean === '/' || clean === '') return { name: 'landing' };
  return pathToRoute(clean);
}

/** The section of the public site a page belongs to, for `aria-current`. */
export type SiteSection = 'about' | 'help' | 'plans' | 'gift' | 'legal' | 'contact';

export interface PublicLink {
  label: string;
  href: string;
  section: SiteSection;
}

/**
 * Every public page, in the order the header lists them: what Wobo is, how to use it, what it
 * costs, how to give it, what we promise in writing, and how to reach a person.
 */
export const PUBLIC_LINKS: readonly PublicLink[] = [
  { label: 'About', href: '/about', section: 'about' },
  { label: 'Help centre', href: '/help', section: 'help' },
  { label: 'Plans', href: '/plans', section: 'plans' },
  { label: 'Gift', href: '/gift', section: 'gift' },
  { label: 'Legal', href: '/legal', section: 'legal' },
  { label: 'Contact', href: '/contact', section: 'contact' },
];

export function SiteLink({
  to,
  href,
  children,
  className,
  current,
  onNavigate,
  ...rest
}: {
  /** A route, or a path string — both end up at the same address. */
  to?: Route;
  href?: string;
  children: ReactNode;
  className?: string;
  /** Marks this link as the page being read. */
  current?: boolean;
  /** Runs after the router moves — scrolling a fresh document back to its top, for instance. */
  onNavigate?: () => void;
  'aria-label'?: string;
}) {
  const router = useRouter();
  const address = to ? routeToPath(to) : (href ?? '/');
  const target = to ?? hrefRoute(address);
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || browserOwnsClick(event)) return;
    if (!target) return;
    event.preventDefault();
    onNavigate?.();
    router.navigate(target);
  };
  return (
    <a
      href={address}
      onClick={onClick}
      {...(className ? { className } : {})}
      {...(current ? { 'aria-current': 'page' as const } : {})}
      {...rest}
    >
      {children}
    </a>
  );
}
