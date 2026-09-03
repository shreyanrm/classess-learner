/**
 * The same budget, on a phone rather than on CI's desktop (docs/BOARD.md §10, WOBO-PLAN §2).
 *
 * `board-latency.spec.ts` holds the hand to one second on an unthrottled machine, which catches a
 * regression but does not prove the law: BOARD.md's budget is a cheap Android on 4G, and CI is
 * neither. This spec is that machine, approximated the only honest way a browser can — through CDP,
 * with both throttles on before the page is ever opened:
 *
 *   * `Emulation.setCPUThrottlingRate` at 4x, the DevTools "mid-tier mobile" setting;
 *   * `Network.emulateNetworkConditions` at the DevTools "Slow 4G" preset (the profile Chrome used
 *     to call Fast 3G): 180 kB/s down, 84.4 kB/s up, 562.5 ms of round-trip latency.
 *
 * The measured run is the board's own first play on a cold document — never a replay, which would
 * read a warm surface, warm geometry and a warm module graph and flatter every number.
 *
 * Two numbers are reported, whatever the verdict, because a budget nobody reads is a budget nobody
 * defends:
 *
 *   * **first stroke < 1 000 ms** — from the start of the utterance to the first path in the DOM.
 *   * **first syllable < 1 500 ms** — from the same instant to the first audio of Wobo's voice, in
 *     mock mode (the e2e dev server runs `VITE_LLM_MODE=mock` with no gateway, so nothing here
 *     touches a network service). The bench does not publish that number yet; the moment it does,
 *     the assertion runs. An absent field never reads as a pass — that test skips with the reason,
 *     so the day the seam lands the budget starts biting.
 *
 * The page load itself is not part of either budget: Vite's dev server ships the app as several
 * hundred unbundled modules, so a throttled cold load measures Vite, not Wobo. It is still done
 * under the full throttle (that is what the long `beforeAll` timeout is for), so the measured play
 * starts from a genuinely cold, genuinely throttled browser.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const HERE = dirname(fileURLToPath(import.meta.url));
const GOLDENS = join(HERE, '../src/wobo/goldens');

/** BOARD.md §10. One second, and the pen has to be moving. */
const FIRST_STROKE_BUDGET_MS = 1000;
/** BOARD.md §7 / WOBO-PLAN §2: Wobo's voice starts on a short first clip, inside a second and a half. */
const FIRST_SYLLABLE_BUDGET_MS = 1500;

/** DevTools "mid-tier mobile". */
const CPU_THROTTLE_RATE = 4;
/** DevTools "Slow 4G" (formerly "Fast 3G"), in the units CDP wants: bytes/s and ms. */
const SLOW_4G = {
  offline: false,
  downloadThroughput: ((1.6 * 1000 * 1000) / 8) * 0.9,
  uploadThroughput: ((750 * 1000) / 8) * 0.9,
  latency: 150 * 3.75,
};

const manifest: { name: string; objects: number }[] = JSON.parse(
  readFileSync(join(GOLDENS, 'manifest.json'), 'utf8'),
) as { name: string; objects: number }[];

/** The board with the most objects — the worst case for the first geometry pass. */
const heaviest = [...manifest].sort((a, b) => b.objects - a.objects)[0] as { name: string };

/** The bench's voice seam, which Wave 5.9 adds; read defensively until it exists. */
type BenchWithVoice = NonNullable<(typeof window)['__woboBench']> & {
  firstSyllableMs?: number | null;
};

type Timings = { firstStrokeMs: number; firstSyllableMs: number | null };

test.describe(`throttled: CPU ${CPU_THROTTLE_RATE}x, network Slow 4G`, () => {
  // Both tests read one measurement, so the expensive throttled load happens once.
  test.describe.configure({ mode: 'serial' });

  let timings: Timings;

  test.beforeAll(async ({ browser }) => {
    // A cold throttled load of a dev-server module graph is minutes-scale in the worst case; the
    // budgets being measured are not, and neither is the real (bundled) app.
    test.setTimeout(300_000);

    const page = await browser.newPage();
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_THROTTLE_RATE });
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', SLOW_4G);

    await page.goto(`/board-bench.html?throttled=1#board-bench/${heaviest.name}`, {
      timeout: 240_000,
    });
    await expect(page.getByTestId('board-bench')).toHaveAttribute('data-board', heaviest.name, {
      timeout: 60_000,
    });
    await page.waitForFunction(
      () => typeof window.__woboBench?.firstStrokeMs === 'number',
      undefined,
      { timeout: 120_000 },
    );

    timings = await page.evaluate(() => {
      const api = window.__woboBench as BenchWithVoice | undefined;
      const syllable = api?.firstSyllableMs;
      return {
        firstStrokeMs: api?.firstStrokeMs ?? Number.NaN,
        firstSyllableMs: typeof syllable === 'number' ? syllable : null,
      };
    });

    console.log(
      `throttled (${heaviest.name}, CPU ${CPU_THROTTLE_RATE}x + Slow 4G): ` +
        `first stroke ${Math.round(timings.firstStrokeMs)}ms / ${FIRST_STROKE_BUDGET_MS}ms · ` +
        `first syllable ${
          timings.firstSyllableMs === null
            ? 'not published by the bench'
            : `${Math.round(timings.firstSyllableMs)}ms / ${FIRST_SYLLABLE_BUDGET_MS}ms`
        }`,
    );

    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await page.close();
  });

  test('the pen starts within a second', async () => {
    expect(Number.isFinite(timings.firstStrokeMs)).toBe(true);
    expect(
      timings.firstStrokeMs,
      `${heaviest.name} took ${Math.round(timings.firstStrokeMs)} ms to the first stroke under ` +
        `CPU ${CPU_THROTTLE_RATE}x and Slow 4G`,
    ).toBeLessThan(FIRST_STROKE_BUDGET_MS);
  });

  test('the voice starts within a second and a half, in mock mode', async () => {
    // Asserted the moment the bench publishes the number, and never before: an absent field must
    // not read as a pass.
    test.skip(
      timings.firstSyllableMs === null,
      'the bench does not publish `__woboBench.firstSyllableMs` yet (voice seam, Wave 5.9)',
    );
    expect(
      timings.firstSyllableMs as number,
      `${heaviest.name} took ${Math.round(timings.firstSyllableMs ?? Number.NaN)} ms to the ` +
        `first syllable under CPU ${CPU_THROTTLE_RATE}x and Slow 4G`,
    ).toBeLessThan(FIRST_SYLLABLE_BUDGET_MS);
  });
});
