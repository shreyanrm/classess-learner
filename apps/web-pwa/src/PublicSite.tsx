'use client';

/**
 * The public site, standing on its own.
 *
 * A stranger opening the landing page, a parent following a link to /security, a learner reading
 * a help article — none of them have an account yet, and none of them should pay for the app:
 * this host renders the site's own screens and mounts nothing else. No identity layer, no Supabase
 * session, no board, no answer library, no docked Wobo, no command palette.
 *
 * The moment the visitor walks through a door (any address that is not a public one) `App.tsx`
 * swaps this host for the app runtime — which is usually already there, because the root fetches
 * it at the first sign of a real person on the page.
 */

import { Component, lazy, type ReactNode, Suspense } from 'react';
import { reportFailure } from './screens/states/select';
import type { Route } from './shell/router';
import { preloadPublicScreen, publicScreen } from './site/PublicRoutes';

// The SDK scope, one chunk, fetched beside the page that needs it. The landing renders outside it.
const PublicScope = lazy(() =>
  import('./site/PublicScope').then((m) => ({ default: m.PublicScope })),
);

/**
 * What sits in the frame while a page's chunk arrives. Deliberately empty: full height so the page
 * does not collapse and bounce the scroll position, and no spinner — the product has one loader
 * and it is the boot scene, which is not what a document page is waiting on.
 */
const PagePending = () => <div aria-busy="true" style={{ minHeight: '60vh' }} />;

/**
 * A public page that threw. The seven state pages (offline, a spent day, planned work, an expired
 * link, this) belong to the app runtime and are far too heavy to keep on the site, so the failure
 * is reported and the runtime is asked for — it mounts the layer that reads the report and shows
 * the page the owner drew.
 */
class PublicFailure extends Component<
  { children: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override componentDidCatch(error: unknown): void {
    // The console keeps the real error for whoever is debugging; the visitor never sees it.
    console.error('a public page failed to render', error);
    reportFailure({ kind: 'server' });
    this.props.onFailure();
  }

  override render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}

export function PublicSite({ route, onFailure }: { route: Route; onFailure: () => void }) {
  // The page's own chunk is asked for HERE, beside the scope's, rather than a round trip behind it
  // (React would not ask until it rendered the element, which is after the scope has landed).
  preloadPublicScreen(route);
  const screen = publicScreen(route);
  // The front door talks to nothing: no ask box, no allowance, no door that needs a session. Every
  // other public page has one of those, so it renders inside the scope that provides them.
  const scoped = route.name !== 'landing';
  return (
    <PublicFailure onFailure={onFailure}>
      <Suspense fallback={<PagePending />}>
        {scoped ? <PublicScope>{screen}</PublicScope> : screen}
      </Suspense>
    </PublicFailure>
  );
}
