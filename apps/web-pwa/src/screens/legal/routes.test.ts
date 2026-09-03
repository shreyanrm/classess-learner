/**
 * The addresses this workflow adds to the router. Every one of them round-trips: what a page links
 * to is what the router reads back on a reload, a share or the system back gesture.
 */

import { describe, expect, it } from 'bun:test';
import { pathToRoute, routeToPath } from '../../shell/router';

describe('the public addresses', () => {
  const cases: [string, ReturnType<typeof pathToRoute>][] = [
    ['/legal', { name: 'legal' }],
    ['/legal/privacy-policy', { name: 'legal', slug: 'privacy-policy' }],
    ['/plans', { name: 'plans' }],
    ['/plans/checkout', { name: 'plans', checkout: true }],
    ['/gift', { name: 'gift' }],
  ];

  for (const [path, route] of cases) {
    it(`reads ${path}`, () => {
      expect(pathToRoute(path)).toEqual(route);
    });

    it(`writes ${path} back`, () => {
      expect(routeToPath(route as Parameters<typeof routeToPath>[0])).toBe(path);
    });
  }

  it('keeps a deep address out of the plans page', () => {
    expect(pathToRoute('/plans/pay/now')).toBe(null);
    expect(pathToRoute('/legal/terms/2')).toBe(null);
  });

  it('carries a document slug with characters that need escaping', () => {
    expect(routeToPath({ name: 'legal', slug: 'children and privacy' })).toBe(
      '/legal/children%20and%20privacy',
    );
    expect(pathToRoute('/legal/children%20and%20privacy')).toEqual({
      name: 'legal',
      slug: 'children and privacy',
    });
  });
});
