/**
 * The sitemap and the responsive proof must walk the same public site.
 *
 * Two lists exist and both are right to exist: `PUBLIC_ROUTES` is what a crawler is told about, and
 * `PUBLIC_ROUTE_CASES` is what the device-agnostic proof opens and measures. They drift the moment
 * somebody adds a page to one of them, and the way that drift shows up is the worst kind — a page
 * that is advertised to the world and has never been opened at 360px by anything.
 *
 * So: every fixed public address is proved, and every address the proof opens is one the router
 * answers. The two parameterised families are represented by one instance each, which is why this
 * compares by family rather than one-for-one.
 */

import { describe, expect, it } from 'bun:test';
import { APP_ROUTES, PUBLIC_ROUTE_CASES } from '../../../tests/helpers/proof';
import { pathToRoute } from '../../shell/router';
import { PUBLIC_ROUTES } from './routes';

/** `/help/wobo-basics/what-is-wobo` and `/help` are the same family; `/plans/checkout` is its own. */
function family(path: string): string {
  if (path.startsWith('/help/')) return '/help/*';
  if (path.startsWith('/legal/')) return '/legal/*';
  return path;
}

describe('the public site the proof walks', () => {
  // `/` is walked by the app's own `home` case: an onboarded learner opening the front door is
  // shown their home screen, and that IS what the address renders for them.
  const proved = new Set([...APP_ROUTES, ...PUBLIC_ROUTE_CASES].map((c) => family(c.path)));

  it('opens every address the sitemap advertises', () => {
    for (const route of PUBLIC_ROUTES) {
      expect([route.path, proved.has(family(route.path))]).toEqual([route.path, true]);
    }
  });

  it('opens the two families the sitemap expands into, at least once each', () => {
    expect(proved.has('/help/*')).toBe(true);
    expect(proved.has('/legal/*')).toBe(true);
  });

  it('opens a 404, which is public and which nobody advertises', () => {
    const notFound = PUBLIC_ROUTE_CASES.find((c) => c.id === 'not-found');
    expect(notFound).toBeDefined();
    expect(PUBLIC_ROUTES.some((r) => r.path === notFound?.path)).toBe(false);
  });

  it('only opens addresses the router answers, or the one it deliberately does not', () => {
    for (const c of PUBLIC_ROUTE_CASES) {
      if (c.id === 'not-found') {
        expect(pathToRoute(c.path)).toBeNull();
        continue;
      }
      expect([c.path, pathToRoute(c.path)]).not.toEqual([c.path, null]);
    }
  });

  it('names each case once', () => {
    const ids = PUBLIC_ROUTE_CASES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
