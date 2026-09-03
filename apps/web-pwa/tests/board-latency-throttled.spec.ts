/**
 * The same latency law as `board-latency.spec.ts`, measured on the machine the law actually names.
 *
 * BOARD.md §10 and WOBO-PLAN §5.3 write the budget against **a cheap Android phone on 4G**: the pen
 * moving inside 1 000 ms, the voice speaking inside 1 500 ms. The sibling spec holds the hand to
 * those numbers on a fast desktop, which is the strict reading but not the stated one — a desktop
 * that clears a phone's budget with eight cores idle has proved very little about the phone.
 *
 * So this spec puts the profile in: the CPU is throttled 4x and the network is put on Chrome's
 * "Slow 4G" preset through CDP, both applied before the page is opened, so module fetching, mount,
 * measure, geometry and paint all happen on the slow machine. Then the two numbers the law names
 * are read and BOTH are reported, every run, pass or fail:
 *
 *   · **first stroke** — from the start of the utterance to the first mark in the DOM. Asserted
 *     against 1 000 ms. Owned entirely by the hand, so it is measured here today.
 *   · **first syllable** — from the same instant to the first audible syllable in mock mode.
 *     Asserted against 1 500 ms as soon as the bench exposes `firstSyllableMs`; until the voice
 *     seam publishes it, the test reports that it is unmeasured and skips rather than passing
 *     silently on a number nobody took.
 *
 * Nothing here is allowed to soften the desktop budget: the numbers are the same 1 000 / 1 500 ms.
 * The machine got slower, not the law.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

// The bench API is declared once, where it is implemented (`src/wobo/board-bench.tsx` exports
// `BenchApi` and declares `window.__woboBench`). `firstSyllableMs` is read through a widening cast
// below rather than re-declared here, so the two definitions can never conflict.

const HERE = dirname(fileURLToPath(import.meta.url));
const GOLDENS = join(HERE, '../src/wobo/goldens');

/** BOARD.md §10. One second, and the pen has to be moving. Unchanged by the throttle. */
const FIRST_STROKE_BUDGET_MS = 1000;
/** BOARD.md §10 / WOBO-PLAN §5.3. A second and a half to the first syllable. */
const FIRST_SYLLABLE_BUDGET_MS = 1500;

/** How slow the machine is asked to pretend to be — the same 4x the frame-rate spec uses. */
const CPU_THROTTLE = 4;

/**
 * Chrome DevTools' "Slow 4G" preset, verbatim: 1.6 Mbit/s down, 750 kbit/s up, 150 ms of RTT
 * multiplied by DevTools' own 3.75 fudge factor, with the 0.9 throughput factor DevTools applies.
 * Written out rather than named because CDP has no named profiles.
 */
const SLOW_4G = {
  offline: false,
  downloadThroughput: ((1.6 * 1024 * 1024) / 8) * 0.9,
  uploadThroughput: ((750 * 1024) / 8) * 0.9,
  latency: 150 * 3.75,
};

const manifest: { name: string; objects: number }[] = JSON.parse(
  readFileSync(join(GOLDENS, 'manifest.json'), 'utf8'),
) as { name: string; objects: number }[];

/** The board with the most objects — the worst case for the first geometry pass. */
const heaviest = [...manifest].sort((a, b) => b.objects - a.objects)[0] as {
  name: string;
  objects: number;
};

/**
 * Put the page on a cheap phone: 4x CPU, Slow 4G. Called before the first navigation so the load
 * itself is throttled too, which is the whole point — a warm page on a fast pipe is the desktop
 * measurement again.
 */
async function throttle(page: import('@playwright/test').Page): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', SLOW_4G);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_THROTTLE });
}

/**
 * Open the bench on a genuinely fresh document. Two URLs differing only in their hash are the same
 * document to the browser, so the counter in the query string forces a real load every time.
 */
let load = 0;
async function open(page: import('@playwright/test').Page, name: string): Promise<void> {
  await page.goto(`/board-bench.html?load=${++load}#board-bench/${name}`, { timeout: 120_000 });
}

interface Reading {
  /** ms from the start of the utterance to the first mark in the DOM. */
  stroke: number;
  /** ms from the same instant to the first syllable, or null while the bench does not expose it. */
  syllable: number | null;
}

/** Play a board at its real pace on the throttled profile and read both budgeted numbers. */
async function read(page: import('@playwright/test').Page, name: string): Promise<Reading> {
  // No `instant`: the plan streams on its own clock, exactly as it arrives from the brain.
  await open(page, name);
  await expect(page.getByTestId('board-bench')).toHaveAttribute('data-board', name, {
    timeout: 60_000,
  });
  await page.waitForFunction(
    () => typeof window.__woboBench?.firstStrokeMs === 'number',
    undefined,
    { timeout: 60_000 },
  );
  return page.evaluate(() => {
    const api = window.__woboBench as
      | ({ firstStrokeMs: number | null } & { firstSyllableMs?: number | null })
      | undefined;
    const syllable = api?.firstSyllableMs;
    return {
      stroke: api?.firstStrokeMs ?? Number.NaN,
      syllable: typeof syllable === 'number' ? syllable : null,
    };
  });
}

/** One line in the log, every run, carrying both of the law's numbers. */
function report(name: string, reading: Reading): void {
  const syllable =
    reading.syllable === null
      ? 'first syllable: not exposed by the bench yet'
      : `first syllable ${Math.round(reading.syllable)} ms`;
  console.log(
    `[${CPU_THROTTLE}x CPU · Slow 4G] ${name}: first stroke ${Math.round(reading.stroke)} ms, ${syllable}`,
  );
}

test.describe('the budget on the machine the law names — 4x CPU, Slow 4G', () => {
  test.slow();

  test('the pen still starts within a second on the heaviest board', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'CPU and network throttling are chromium capabilities');
    await throttle(page);
    const reading = await read(page, heaviest.name);
    report(heaviest.name, reading);
    expect(Number.isFinite(reading.stroke)).toBe(true);
    expect(
      reading.stroke,
      `${heaviest.name} (${heaviest.objects} objects) took ${Math.round(reading.stroke)} ms ` +
        `to the first stroke on a ${CPU_THROTTLE}x CPU over Slow 4G`,
    ).toBeLessThan(FIRST_STROKE_BUDGET_MS);
  });

  test('the voice speaks within a second and a half in mock mode', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'CPU and network throttling are chromium capabilities');
    await throttle(page);
    const reading = await read(page, heaviest.name);
    report(heaviest.name, reading);
    // Both numbers are reported above whatever happens next, so a run always carries the pair.
    test.skip(
      reading.syllable === null,
      'the bench does not expose `firstSyllableMs` yet — the voice seam has not published it, ' +
        'and a spec that passed on a number nobody took would be worse than one that says so',
    );
    expect(
      reading.syllable as number,
      `${heaviest.name} took ${Math.round(reading.syllable ?? Number.NaN)} ms to the first ` +
        `syllable on a ${CPU_THROTTLE}x CPU over Slow 4G`,
    ).toBeLessThan(FIRST_SYLLABLE_BUDGET_MS);
  });

  test('and holds across every golden board, not just the heaviest', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'CPU and network throttling are chromium capabilities');
    // Twelve cold loads of the whole module graph over a 1.44 Mbit/s pipe. The BUDGET is untouched
    // — every board is still held to the same 1 000 ms — but the WALL CLOCK for the sweep is not a
    // budget, it is the cost of pretending to be a phone twelve times, and Playwright's default
    // per-test deadline (even doubled by `test.slow()`) is shorter than that cost. Fifteen minutes
    // is the room the sweep needs; shortening the sweep instead would be shortening the coverage.
    test.setTimeout(15 * 60_000);
    await throttle(page);
    const readings: [string, Reading][] = [];
    for (const entry of manifest) {
      const reading = await read(page, entry.name);
      readings.push([entry.name, reading]);
      report(entry.name, reading);
    }
    for (const [name, reading] of readings) {
      expect(
        reading.stroke,
        `${name} took ${Math.round(reading.stroke)} ms to the first stroke on a ` +
          `${CPU_THROTTLE}x CPU over Slow 4G`,
      ).toBeLessThan(FIRST_STROKE_BUDGET_MS);
      if (reading.syllable !== null) {
        expect(
          reading.syllable,
          `${name} took ${Math.round(reading.syllable)} ms to the first syllable`,
        ).toBeLessThan(FIRST_SYLLABLE_BUDGET_MS);
      }
    }
  });
});
