/**
 * The router's ADDRESS seam, end to end.
 *
 * src/shell/router.tsx mirrors its navigation stack into the History API so a route can be
 * linked, bookmarked and reloaded, and so the browser's own back button (and the Android system
 * back gesture, which is the same event) pops a screen instead of leaving the app. Unit tests in
 * src/shell/router.test.ts cover the pure parts — routeToPath, pathToRoute, applyPop. Only a real
 * browser can prove the two claims that matter to a learner:
 *
 *   · a back press pops the stack WITHOUT reloading the document, and
 *   · a cold deep link boots straight onto the addressed screen.
 *
 * The no-reload proof is a sentinel planted on `window` before the back press: only a full
 * document load clears it. The deep-link case re-checks the sentinel is ABSENT on a fresh page,
 * so the sentinel is a genuine reload detector and not a constant that always passes.
 */
import { expect, test } from '@playwright/test';
import { assertNoErrors, seedOnboarded, watchConsole } from './helpers';

const SENTINEL = '__routerLiveDocument';

type Win = Record<string, unknown>;

/** Plant a marker on the live document. Survives in-app navigation; a page load wipes it. */
async function plantSentinel(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate((key) => {
    (window as unknown as Win)[key] = 'alive';
  }, SENTINEL);
}

async function readSentinel(page: import('@playwright/test').Page): Promise<unknown> {
  return page.evaluate((key) => (window as unknown as Win)[key], SENTINEL);
}

function pathname(page: import('@playwright/test').Page): string {
  return new URL(page.url()).pathname;
}

test('a UI navigation writes an address, browser back pops it without reloading', async ({
  page,
}, info) => {
  const errors = watchConsole(page);
  await seedOnboarded(page);
  await page.goto('/');

  const learnDoor = page.getByRole('button', { name: 'Learn', exact: true });
  const practiceDoor = page.getByRole('button', { name: 'Practice', exact: true });
  await expect(learnDoor).toBeVisible();
  await expect(practiceDoor).toBeVisible();
  expect(pathname(page)).toBe('/');

  await plantSentinel(page);
  expect(await readSentinel(page)).toBe('alive');

  // Through the UI, not through the URL bar — the door is what a learner actually presses.
  await learnDoor.click();
  await expect(page.getByText('Your subjects')).toBeVisible();
  expect(pathname(page)).toBe('/learn');
  expect(await readSentinel(page), 'a UI navigation must not reload the document').toBe('alive');

  // The browser's own back button — the same event the Android system gesture fires.
  await page.goBack();
  await expect(learnDoor).toBeVisible();
  await expect(practiceDoor).toBeVisible();
  expect(pathname(page)).toBe('/');
  expect(await readSentinel(page), 'back must pop the stack, not reload the app').toBe('alive');

  assertNoErrors(errors, info);
});

test('a cold deep link boots straight onto the addressed screen', async ({ page }, info) => {
  const errors = watchConsole(page);
  await seedOnboarded(page);

  await page.goto('/learn');
  await expect(page.getByText('Your subjects')).toBeVisible();
  expect(pathname(page)).toBe('/learn');

  // A fresh document carries no sentinel — which is what makes the no-reload assertion above real.
  expect(await readSentinel(page)).toBeUndefined();

  // Back off a cold deep link never dead-ends: the screen's own back affordance lands home. Its
  // label is the arrow's accessible name ("Back — Home"); the arrow alone is what shows on screen.
  await page.getByRole('button', { name: /^Back — Home$/ }).click();
  await expect(page.getByRole('button', { name: 'Practice', exact: true })).toBeVisible();
  expect(pathname(page)).toBe('/');

  assertNoErrors(errors, info);
});
