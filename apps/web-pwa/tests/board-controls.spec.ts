/**
 * The two loops that close the board (docs/BOARD.md §8, §9), driven through the real hand in a real
 * browser — both were wired and dead before this file existed.
 *
 * **Bidirectional (§8).** "Moving Wobo's tangent updates the numbers." The tangent golden now
 * carries a slider bound to `a` and six objects that declare `depends: ["a"]`. Dragging the handle
 * asks the brain (here the golden's own generator, in mock mode — no gateway, no network) and the
 * dependants come back as ink frames. What is asserted is what a learner would see: the numbers
 * change to the derivative and the height at the new point, and the tangent itself moves.
 *
 * **The scrub (§9).** "The hand can scrub back in time." The scrubber's handle used to move its own
 * value while the board went on showing the live present. What is asserted is that dragging it
 * shows the board as it was — ink that had not been drawn yet is simply not there — and that
 * letting go hands the board back to the present.
 */

import { expect, type Page, test } from '@playwright/test';

/** Open the bench on a board, with the full board's own chrome, and wait for the plan to land. */
async function bench(page: Page, name: string, extra = ''): Promise<void> {
  await page.goto(`/board-bench.html#board-bench/${name}/chrome${extra}`);
  await expect(page.getByTestId('board-bench')).toHaveAttribute('data-board', name);
  await page.waitForFunction(() => window.__woboBench?.ready === true, undefined, {
    timeout: 30_000,
  });
}

/** What one object says about itself — its accessible name, and where it is. */
async function objectAt(page: Page, id: string) {
  return page.evaluate((wanted) => {
    const el = [...document.querySelectorAll('[data-wobo-object]')].find(
      (node) => (node.getAttribute('data-wobo-object') ?? '').split('#')[0] === wanted,
    );
    if (!el) return null;
    const box = (el as SVGGraphicsElement).getBoundingClientRect();
    return { label: el.getAttribute('aria-label'), x: box.x, y: box.y };
  }, id);
}

test.describe('a control on the board', () => {
  test('moving the handle moves the tangent, and the numbers under it', async ({ page }) => {
    await bench(page, 'tangent-parabola', '/instant');

    // The control is a real control: a native range with a name, reachable by the keyboard.
    const handle = page.getByRole('slider', { name: 'x' });
    await expect(handle).toHaveCount(1);
    await expect(handle).toHaveValue('1.5');

    const before = {
      slope: await objectAt(page, 'slope-value'),
      height: await objectAt(page, 'point-value'),
      line: await objectAt(page, 'tangent-line'),
    };
    expect(before.slope?.label).toContain('3'); // f'(1.5)
    expect(before.height?.label).toContain('2.25'); // f(1.5)

    // Ten steps of 0.1 to the right: x = 2.5, where the slope is 5 and the curve is at 6.25.
    await handle.focus();
    for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight');
    await expect(handle).toHaveValue('2.5');

    // The numbers are recomputed — not interpolated, not the ones Wobo first drew.
    await expect
      .poll(async () => (await objectAt(page, 'slope-value'))?.label)
      .toContain('slope = 5');
    await expect.poll(async () => (await objectAt(page, 'point-value'))?.label).toContain('6.25');

    // …and the tangent itself moved on the board.
    const after = await objectAt(page, 'tangent-line');
    expect(after).not.toBeNull();
    const moved = Math.hypot(
      (after?.x ?? 0) - (before.line?.x ?? 0),
      (after?.y ?? 0) - (before.line?.y ?? 0),
    );
    expect(moved, 'the tangent stayed exactly where it was drawn').toBeGreaterThan(4);
  });
});

test.describe('scrubbing the board back in time', () => {
  test('the handle shows the board as it was, and "live" hands it back', async ({ page }) => {
    // Played at its own pace, not landed instantly: a scrub is only meaningful over a real timeline.
    await bench(page, 'pythagoras');
    const scrubber = page.getByRole('slider', { name: "scrub the board's history" });
    await expect(scrubber).toHaveCount(1);

    const everything = await page.evaluate(
      () => (window.__woboBench?.ledger() ?? []).map((r) => r.id).length,
    );
    expect(everything).toBeGreaterThan(4);

    const live = Number(await scrubber.inputValue());

    // Drag the handle back near the start of the board's own clock — a real pointer on the real
    // track, which is how a learner scrubs.
    const track = await scrubber.boundingBox();
    expect(track).not.toBeNull();
    const bar = track as { x: number; y: number; width: number; height: number };
    await page.mouse.move(bar.x + bar.width * 0.5, bar.y + bar.height / 2);
    await page.mouse.down();
    await page.mouse.move(bar.x + bar.width * 0.08, bar.y + bar.height / 2, { steps: 8 });
    await page.mouse.up();
    await expect.poll(async () => Number(await scrubber.inputValue())).toBeLessThan(live);

    // The board is what it was at that instant — the last strokes had not been drawn yet.
    await expect
      .poll(async () => page.evaluate(() => document.querySelectorAll('[data-wobo-object]').length))
      .toBeLessThan(everything);

    // Letting go — "live" — gives the board back to the present, whole.
    await page.getByRole('button', { name: 'return to the live board' }).click();
    await expect
      .poll(async () => page.evaluate(() => document.querySelectorAll('[data-wobo-object]').length))
      .toBe(everything);
  });
});
