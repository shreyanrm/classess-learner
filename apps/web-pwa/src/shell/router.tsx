'use client';

/**
 * A dependency-free router for the walkable prototype. Routes are a discriminated union; navigation
 * keeps a stack so `back` is real. ponytail: no react-router — a handful of screens don't need a
 * routing library, and this keeps the whole app one bundle with no URL coupling.
 */

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';

export type OnboardingStep = 'door' | 'age' | 'goal' | 'diagnostic';

export type Route =
  | { name: 'onboarding'; step: OnboardingStep }
  | { name: 'today' }
  | { name: 'learn'; nodeId: string }
  | { name: 'practice'; nodeId: string }
  | { name: 'create' }
  | { name: 'progress' }
  | { name: 'settings' }
  | { name: 'parent' }
  | { name: 'plans' };

export type TabName = 'today' | 'progress' | 'create';

export interface Router {
  route: Route;
  navigate: (route: Route) => void;
  replace: (route: Route) => void;
  back: () => void;
  canGoBack: boolean;
}

const RouterContext = createContext<Router | null>(null);

export function useRouter(): Router {
  const r = useContext(RouterContext);
  if (!r) throw new Error('useRouter must be used within a <RouterProvider>');
  return r;
}

export function RouterProvider({ initial, children }: { initial: Route; children: ReactNode }) {
  const [stack, setStack] = useState<Route[]>([initial]);

  const navigate = useCallback((route: Route) => setStack((s) => [...s, route]), []);
  const replace = useCallback((route: Route) => setStack((s) => [...s.slice(0, -1), route]), []);
  const back = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);

  const router = useMemo<Router>(
    () => ({
      route: stack[stack.length - 1] as Route,
      navigate,
      replace,
      back,
      canGoBack: stack.length > 1,
    }),
    [stack, navigate, replace, back],
  );

  return <RouterContext.Provider value={router}>{children}</RouterContext.Provider>;
}
