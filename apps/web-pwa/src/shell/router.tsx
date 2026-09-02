'use client';

/**
 * A dependency-free router. Routes are a discriminated union; navigation keeps a stack so `back`
 * is real. ponytail: no react-router — a handful of intentions don't need a routing library.
 *
 * Navigation is intention-first (DESIGN.md §6): the home has two doors (learn, practice), the
 * command palette reaches everything, and Wobo reaches everything by name.
 *
 * Every route also has an ADDRESS. The stack is mirrored into the History API, so:
 *   · the Android system back gesture pops a screen instead of quitting the installed PWA,
 *   · a course, a subject or the twin can be linked, bookmarked and reloaded,
 *   · the browser's own back/forward buttons drive the same stack.
 * The API above is untouched — every caller (the palette, the header, Wobo's nav, every "back"
 * affordance) still just calls navigate/replace/back, and gets history for free.
 */

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export type Route =
  | { name: 'onboarding' }
  | { name: 'building' }
  | { name: 'home' }
  | { name: 'chat' }
  | { name: 'learn' }
  | { name: 'practice' }
  | { name: 'subject'; subjectId: string; intent: 'learn' | 'practice' }
  | { name: 'course'; topicId: string }
  | { name: 'sandbox'; topicId?: string }
  | { name: 'progress' }
  | { name: 'you' }
  | { name: 'concept'; which: 'a' | 'b' | 'c' | 'engines' };

const HOME: Route = { name: 'home' };

// --- the address of a route ---------------------------------------------------------------------

/** The URL path a route lives at. Every named route round-trips through pathToRoute. */
export function routeToPath(route: Route): string {
  switch (route.name) {
    case 'home':
      return '/';
    case 'subject':
      return `/subject/${encodeURIComponent(route.subjectId)}/${route.intent}`;
    case 'course':
      return `/course/${encodeURIComponent(route.topicId)}`;
    case 'sandbox':
      return route.topicId ? `/sandbox/${encodeURIComponent(route.topicId)}` : '/sandbox';
    case 'concept':
      return `/concept/${route.which}`;
    default:
      return `/${route.name}`;
  }
}

const PLAIN_ROUTES = new Set([
  'onboarding',
  'building',
  'chat',
  'learn',
  'practice',
  'progress',
  'you',
]);

const INTENTS = new Set(['learn', 'practice']);
const CONCEPTS = new Set(['a', 'b', 'c', 'engines']);

/** The route a path addresses, or null when the path is not one of ours. */
export function pathToRoute(path: string): Route | null {
  const [head, ...rest] = path.split('?')[0]?.split('#')[0]?.split('/').filter(Boolean) ?? [];
  if (!head) return HOME;
  const decode = (s: string | undefined): string => {
    if (!s) return '';
    try {
      return decodeURIComponent(s);
    } catch {
      return s; // a malformed escape is not worth a dead end; take the raw segment
    }
  };
  if (PLAIN_ROUTES.has(head) && rest.length === 0) return { name: head } as Route;
  if (head === 'subject') {
    const subjectId = decode(rest[0]);
    const intent = rest[1];
    if (!subjectId || !intent || !INTENTS.has(intent)) return null;
    return { name: 'subject', subjectId, intent: intent as 'learn' | 'practice' };
  }
  if (head === 'course') {
    const topicId = decode(rest[0]);
    return topicId && rest.length === 1 ? { name: 'course', topicId } : null;
  }
  if (head === 'sandbox') {
    if (rest.length === 0) return { name: 'sandbox' };
    const topicId = decode(rest[0]);
    return topicId && rest.length === 1 ? { name: 'sandbox', topicId } : null;
  }
  if (head === 'concept') {
    const which = rest[0];
    if (!which || rest.length !== 1 || !CONCEPTS.has(which)) return null;
    return { name: 'concept', which: which as 'a' | 'b' | 'c' | 'engines' };
  }
  return null;
}

/** The route a path addresses — an address we don't recognise lands home, never on nothing. */
export function routeFromPath(path: string): Route {
  return pathToRoute(path) ?? HOME;
}

/**
 * The stack after the browser moved through history. Back (the system gesture, the hardware key,
 * the browser button) lands on the entry below the top, so it pops; anything else — a forward, a
 * jump — is entered as a new top so the transition still reads in the right direction.
 */
export function applyPop(stack: Route[], path: string): Route[] {
  const next = routeFromPath(path);
  const top = stack[stack.length - 1];
  if (top && routeToPath(top) === routeToPath(next)) return stack;
  const below = stack[stack.length - 2];
  if (below && routeToPath(below) === routeToPath(next)) return stack.slice(0, -1);
  return [...stack, next];
}

// --- the History API seam (a no-op wherever there is no window) ----------------------------------

interface HistoryMark {
  /** How deep the stack was when this entry was written — tells our entries from anyone else's. */
  woboDepth?: number;
}

function hasHistory(): boolean {
  return typeof window !== 'undefined' && typeof window.history !== 'undefined';
}

function currentDepth(): number {
  if (!hasHistory()) return 0;
  return (window.history.state as HistoryMark | null)?.woboDepth ?? 0;
}

function writePath(path: string, depth: number, mode: 'push' | 'replace'): void {
  if (!hasHistory()) return;
  const mark: HistoryMark = { woboDepth: depth };
  if (mode === 'push') window.history.pushState(mark, '', path);
  else window.history.replaceState(mark, '', path);
}

/** The route this load addresses. A bare '/' carries no intention — the app's own initial wins. */
function bootRoute(initial: Route): Route {
  if (typeof window === 'undefined') return initial;
  const path = window.location.pathname;
  if (path === '/' || path === '') return initial;
  return pathToRoute(path) ?? initial;
}

// --- the provider --------------------------------------------------------------------------------

export interface Router {
  route: Route;
  navigate: (route: Route) => void;
  replace: (route: Route) => void;
  back: () => void;
  canGoBack: boolean;
  /** Stack depth — the route-transition layer reads it to tell forward from back (MOTION.md §2). */
  depth: number;
}

const RouterContext = createContext<Router | null>(null);

export function useRouter(): Router {
  const r = useContext(RouterContext);
  if (!r) throw new Error('useRouter must be used within a <RouterProvider>');
  return r;
}

export function RouterProvider({ initial, children }: { initial: Route; children: ReactNode }) {
  const [stack, setStack] = useState<Route[]>(() => [bootRoute(initial)]);

  // How deep the history entry we last wrote is. A ref, not state: writing history is a side
  // effect of the ACTION, never of a render — a setState updater must stay pure (React may run it
  // twice, and two pushState calls would take two backs to undo).
  const depth = useRef(1);

  // The address of the first screen, written once: a deep link keeps its URL, and a boot that
  // ignored the path (a bare '/', an onboarding lock) corrects the bar to what is actually shown.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the boot entry is written once, on mount
  useEffect(() => {
    writePath(routeToPath(stack[0] as Route), 1, 'replace');
  }, []);

  // The browser (or Android) moved through history — the stack follows it, never the other way.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPop = () => {
      depth.current = currentDepth() || 1;
      setStack((s) => applyPop(s, window.location.pathname));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((route: Route) => {
    const path = routeToPath(route);
    // Already here (the header's own tab, a palette entry for this screen): minting an entry would
    // spend one press of the system back button on going nowhere. Nothing changes, so do nothing.
    if (typeof window !== 'undefined' && window.location.pathname === path) return;
    depth.current += 1;
    writePath(path, depth.current, 'push');
    setStack((s) => [...s, route]);
  }, []);

  const replace = useCallback((route: Route) => {
    writePath(routeToPath(route), depth.current, 'replace');
    setStack((s) => [...s.slice(0, -1), route]);
  }, []);

  // Back never dead-ends. With an entry of ours behind us the browser owns the move (so the system
  // gesture and this button are the same action); on a cold deep link there is nothing to pop, and
  // home is the honest destination.
  const back = useCallback(() => {
    if (currentDepth() > 1) {
      window.history.back();
      return;
    }
    depth.current = 1;
    writePath(routeToPath(HOME), 1, 'replace');
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : [HOME]));
  }, []);

  const router = useMemo<Router>(
    () => ({
      route: stack[stack.length - 1] as Route,
      navigate,
      replace,
      back,
      canGoBack: stack.length > 1,
      depth: stack.length,
    }),
    [stack, navigate, replace, back],
  );

  return <RouterContext.Provider value={router}>{children}</RouterContext.Provider>;
}
