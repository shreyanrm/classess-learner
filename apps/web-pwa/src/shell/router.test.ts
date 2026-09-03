import { describe, expect, it } from 'bun:test';
import { applyPop, pathToRoute, type Route, routeFromPath, routeToPath } from './router';

/** One of every named route, including the ones that carry parameters. */
const EVERY_ROUTE: Route[] = [
  { name: 'onboarding' },
  { name: 'building' },
  { name: 'home' },
  { name: 'chat' },
  { name: 'learn' },
  { name: 'practice' },
  { name: 'subject', subjectId: 'math', intent: 'learn' },
  { name: 'subject', subjectId: 'science', intent: 'practice' },
  { name: 'course', topicId: 'm2-1' },
  { name: 'course', topicId: 'custom:why the sky is blue' },
  { name: 'sandbox' },
  { name: 'sandbox', topicId: 'm2-1' },
  { name: 'progress' },
  { name: 'you' },
  { name: 'concept', which: 'engines' },
];

describe('routes have addresses', () => {
  it('every named route round-trips through its path', () => {
    for (const route of EVERY_ROUTE) {
      expect(pathToRoute(routeToPath(route))).toEqual(route);
    }
  });

  it('gives each route a distinct address', () => {
    const paths = EVERY_ROUTE.map(routeToPath);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('carries a free-text course id through the URL intact', () => {
    const route: Route = { name: 'course', topicId: 'custom:photosynthesis, step by step' };
    const path = routeToPath(route);
    expect(path).not.toContain(' ');
    expect(pathToRoute(path)).toEqual(route);
  });

  it('reads the root and ignores a query or hash', () => {
    expect(pathToRoute('/')).toEqual({ name: 'home' });
    expect(pathToRoute('/course/m2-1?utm=x')).toEqual({ name: 'course', topicId: 'm2-1' });
    expect(pathToRoute('/you#top')).toEqual({ name: 'you' });
  });

  it('refuses an address that is not ours, and lands it home rather than nowhere', () => {
    for (const path of [
      '/nonsense',
      '/course', // a course with no topic
      '/course/m2-1/extra',
      '/subject/math', // no intent
      '/subject/math/dance', // not an intent
      '/concept/z',
      '/concept/a', // the deleted design prototypes — an old bookmark lands home, not on nothing
      '/concept/b',
      '/concept/c',
      '/you/settings',
    ]) {
      expect(pathToRoute(path)).toBeNull();
      expect(routeFromPath(path)).toEqual({ name: 'home' });
    }
  });
});

describe('popstate — the system back gesture drives the stack', () => {
  const home: Route = { name: 'home' };
  const learn: Route = { name: 'learn' };
  const course: Route = { name: 'course', topicId: 'm2-1' };

  it('pops when the browser lands on the entry below the top', () => {
    const stack = [home, learn, course];
    expect(applyPop(stack, '/learn')).toEqual([home, learn]);
    // …and again: back out of learn to home, one screen per gesture (never straight out of the app)
    expect(applyPop([home, learn], '/')).toEqual([home]);
  });

  it('is a no-op when the address already matches the top', () => {
    const stack = [home, learn];
    expect(applyPop(stack, '/learn')).toBe(stack);
  });

  it('enters anything else as a new top, so forward still reads as forward', () => {
    expect(applyPop([home], '/course/m2-1')).toEqual([home, course]);
  });

  it('lands an unknown address home instead of on a blank screen', () => {
    expect(applyPop([learn, course], '/gone')).toEqual([learn, course, home]);
    // …and when home is the entry underneath, that unknown address is simply the pop it looks like
    expect(applyPop([home, learn], '/gone')).toEqual([home]);
  });
});
