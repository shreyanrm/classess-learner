/**
 * 60 fps with 2,000 strokes on screen (docs/BOARD.md §10).
 *
 * The budget existed and nothing exercised it: no board in the repo has ever held more than 21
 * objects and no spec had ever measured a frame rate. Under that cover, a single screen-anchored
 * mark — Wobo's commonest turn — took the board from 60 fps to 29 on a throttled machine, because the
 * rAF loop it starts advanced a dependency of the geometry memo and so re-anchored, re-signed and
 * re-elemented all 2,000 objects sixty times a second.
 *
 * The measurement is the hand alone, on the hermetic bench: no network, no brain, no lesson. The
 * budget in BOARD.md is a cheap Android on 4G; CI is neither, so the CPU is throttled 4x and the
 * bar is held at 55 fps, which is the strict reading — a laptop pretending to be slow must still
 * clear what a phone is asked to clear.
 */

import { expect, test } from '@playwright/test';

// The bench API is declared once, where it is implemented (`src/wobo/board-bench.tsx`
// exports `BenchApi` and declares `window.__woboBench`). Re-declaring a narrower shape
// here made the two definitions conflict the moment the specs were type-checked.

/** BOARD.md §10's number, less the slack a throttled CI machine is allowed. */
const FPS_FLOOR = 55;
const STROKES = 2000;
/** How slow the machine is asked to pretend to be. */
const THROTTLE = 4;

interface Frames {
  fps: number;
  p95: number;
  janky: number;
}

/** Frame times over a real second of animation, measured in the page's own rAF loop. */
async function measure(page: import('@playwright/test').Page, ms = 1600): Promise<Frames> {
  return page.evaluate(async (duration) => {
    const gaps: number[] = [];
    await new Promise<void>((resolve) => {
      let last = performance.now();
      const started = last;
      const step = () => {
        const now = performance.now();
        gaps.push(now - last);
        last = now;
        if (now - started >= duration) resolve();
        else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    // The first gap includes whatever was happening when the loop opened.
    const times = gaps.slice(1).sort((a, b) => a - b);
    const total = times.reduce((s, t) => s + t, 0);
    return {
      fps: times.length > 0 ? 1000 / (total / times.length) : 0,
      p95: times[Math.floor(times.length * 0.95)] ?? 0,
      janky: times.filter((t) => t > 33).length,
    };
  }, ms);
}

async function openBench(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/board-bench.html#board-bench/timeline');
  await expect(page.getByTestId('board-bench')).toBeVisible();
  await page.waitForFunction(() => typeof window.__woboBench?.stress === 'function');
}

test.describe('the frame rate at the budget', () => {
  test.slow();

  test('holds 2,000 strokes AND a mark on the screen at 55 fps on a 4x slower machine', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'CPU throttling is a chromium capability');
    await openBench(page);
    const cdp = await page.context().newCDPSession(page);

    await page.evaluate((n) => window.__woboBench?.stress(n, { screenAnchor: true }), STROKES);
    // The mark really is anchored to a registered target, not quietly dropped to board space —
    // otherwise this measures the easy case and proves nothing.
    const ledger = await page.evaluate(() => window.__woboBench?.ledger() ?? []);
    expect(ledger.length).toBeGreaterThanOrEqual(STROKES);
    expect(ledger.some((row) => row.anchor === 'target')).toBe(true);

    await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });
    const frames = await measure(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });

    console.log(
      `2,000 strokes + one screen mark at ${THROTTLE}x: ${frames.fps.toFixed(1)} fps, ` +
        `p95 ${frames.p95.toFixed(1)} ms, ${frames.janky} frames over 33 ms`,
    );
    expect(frames.fps, `${frames.fps.toFixed(1)} fps at the 2,000-stroke budget`).toBeGreaterThan(
      FPS_FLOOR,
    );
    expect(frames.p95).toBeLessThan(33);
  });

  test('holds 2,000 board-anchored strokes at 55 fps on a 4x slower machine', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'CPU throttling is a chromium capability');
    await openBench(page);
    const cdp = await page.context().newCDPSession(page);
    await page.evaluate((n) => window.__woboBench?.stress(n), STROKES);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });
    const frames = await measure(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    console.log(`2,000 strokes at ${THROTTLE}x: ${frames.fps.toFixed(1)} fps`);
    expect(frames.fps).toBeGreaterThan(FPS_FLOOR);
  });
});
