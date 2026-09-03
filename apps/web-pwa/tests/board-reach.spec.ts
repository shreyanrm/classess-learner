/**
 * The board is reachable — by a screen reader, and by a keyboard (docs/BOARD.md §8, DESIGN.md §12).
 *
 * Two halves of the same law were missing:
 *
 *  · the surface was `svg[role="img"]`, which is atomic to assistive technology. The renderer writes
 *    an `aria-label` for every object it draws and NONE of them reached the accessibility tree; the
 *    whole board announced itself as one image, and nothing said a word when new ink landed.
 *  · the learner's own ink — the half that makes the board bidirectional — was pointer-only. A
 *    keyboard learner could never draw on her board or circle anything on it, and the plane's own
 *    resize handle was a focusable, labelled button with no key handler at all.
 */

import { expect, type Page, test } from '@playwright/test';

declare global {
  interface Window {
    __woboBench?: {
      ready: boolean;
      play(name: string, options?: { instant?: boolean }): void;
      ledger(): { id: string; kind: string; anchor: string }[];
    };
  }
}

async function playInstantly(page: Page, name: string): Promise<void> {
  await page.goto(`/board-bench.html#board-bench/${name}/instant`);
  await expect(page.getByTestId('board-bench')).toHaveAttribute('data-board', name);
  await page.waitForFunction(() => window.__woboBench?.ready === true, undefined, {
    timeout: 15_000,
  });
}

test.describe('what a screen reader is told', () => {
  test('the board is not one image, so everything she writes on it is exposed', async ({
    page,
  }) => {
    await playInstantly(page, 'timeline');
    const surface = page.locator('[data-wobo-surface]').first();
    // Anything but `role="img"`: that role seals the tree and is what made the board silent.
    expect(await surface.getAttribute('role')).toBeNull();

    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Accessibility.enable');
    const { nodes } = (await cdp.send('Accessibility.getFullAXTree')) as {
      nodes: { name?: { value?: string }; ignored?: boolean }[];
    };
    const names = nodes
      .filter((n) => !n.ignored)
      .map((n) => String(n.name?.value ?? ''))
      .filter(Boolean);
    const spoken = names.join(' | ');
    // The dates and the events she wrote on the freedom-struggle board, in the tree rather than
    // sealed inside one image node.
    for (const said of ['1857', 'the first revolt', '1947', 'independence']) {
      expect(spoken, `"${said}" is not in the accessibility tree`).toContain(said);
    }
  });

  test('new ink is announced as it lands', async ({ page }) => {
    await playInstantly(page, 'timeline');
    const live = page.locator('[data-wobo-ink-log]').first();
    await expect(live).toHaveAttribute('aria-live', 'polite');
    await expect(live).toContainText('1857');
  });
});

test.describe('the keyboard can draw', () => {
  test('arrows move the pen, space puts it down and lifts it', async ({ page }) => {
    // The plane is the surface the learner draws on, so that is where the pen must reach.
    await page.goto('/board-bench.html#board-bench/pythagoras/instant');
    await expect(page.getByTestId('board-bench')).toBeVisible();
    await page.getByTestId('bench-plane').click();
    const plane = page.locator('section[role="dialog"]');
    await expect(plane).toBeVisible();

    const surface = plane.locator('[data-wobo-surface]').first();
    await expect(surface).toHaveAttribute('tabindex', '0');
    await surface.focus();

    // Down, four moves, up: a stroke of the learner's own ink, with no pointer anywhere.
    await page.keyboard.press('Space');
    for (const key of ['ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowLeft']) {
      await page.keyboard.press(key);
    }
    await page.keyboard.press('Space');

    const learnerInk = await page.evaluate(
      () => document.querySelectorAll('[data-wobo-object^="learner-"]').length,
    );
    expect(learnerInk).toBeGreaterThan(0);
  });

  test('the resize handle actually resizes from the keyboard', async ({ page }) => {
    await page.goto('/board-bench.html#board-bench/pythagoras/instant');
    await expect(page.getByTestId('board-bench')).toBeVisible();
    await page.getByTestId('bench-plane').click();
    const plane = page.locator('section[role="dialog"]');
    await expect(plane).toBeVisible();

    const before = await plane.boundingBox();
    const handle = page.getByRole('button', { name: /resize the board/ });
    await handle.focus();
    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowDown');
    const after = await plane.boundingBox();

    expect(before && after).toBeTruthy();
    expect((after as { width: number }).width).toBeGreaterThan((before as { width: number }).width);
    expect((after as { height: number }).height).toBeGreaterThan(
      (before as { height: number }).height,
    );
  });
});
