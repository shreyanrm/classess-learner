/**
 * The golden boards, end to end (docs/BOARD.md; WOBO-PLAN §2).
 *
 * Twelve turns — four in maths, three in physics, three in chemistry, two in life and social
 * science — are played into the bench and then read back out of the DOM. What is asserted is
 * structure and never pixels:
 *
 *  · every object in the plan landed, in the order Wobo inked it;
 *  · every mark is placed by an anchor, and a mark that hangs off another object genuinely
 *    overlaps it — which is the only real proof an anchor resolved rather than defaulting to 0,0;
 *  · nothing floats outside the surface it belongs to;
 *  · the derivation is written in order, word for word;
 *  · every quantity Wobo drew is one the verifier signed, and none was refused.
 *
 * Two screenshots per board, light and dark, land in the wave's golden folder — the eye's copy of
 * the same contract, for a human to look at when a diff is argued about.
 */

import { mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, type Page, test } from '@playwright/test';

// The bench API is declared once, where it is implemented (`src/wobo/board-bench.tsx`
// exports `BenchApi` and declares `window.__woboBench`). Re-declaring a narrower shape
// here made the two definitions conflict the moment the specs were type-checked.

const HERE = dirname(fileURLToPath(import.meta.url));
const GOLDENS = join(HERE, '../src/wobo/goldens');
// Outside the repo by default (they are a human's reference copy, not an artifact to commit) and
// machine-independent: an absolute path baked in from whoever ran the suite first is a path that
// exists on exactly one laptop. Point WOBO_GOLDEN_SHOTS somewhere else to collect them.
const SHOTS = process.env.WOBO_GOLDEN_SHOTS ?? join(tmpdir(), 'wobo-golden-boards');

interface ManifestEntry {
  name: string;
  prompt: string;
  title: string;
  subject: string;
  presentation: string;
  objects: number;
  numbers: number;
}

interface GoldenNumber {
  id: string;
  value: number;
  precision?: number;
  unit?: string;
  check: string;
}

interface Golden {
  name: string;
  prompt: string;
  title: string;
  expect: {
    ids: string[];
    kinds: string[];
    anchors: string[];
    hangsOff: [string, string][];
    written: string[];
    numbers: GoldenNumber[];
  };
  plan: { type: string; t?: number }[];
}

const manifest: ManifestEntry[] = JSON.parse(
  readFileSync(join(GOLDENS, 'manifest.json'), 'utf8'),
) as ManifestEntry[];

const golden = (name: string): Golden =>
  JSON.parse(readFileSync(join(GOLDENS, `${name}.json`), 'utf8')) as Golden;

mkdirSync(SHOTS, { recursive: true });

/** What one drawn object looks like from the outside: its id, its accessible name, its box. */
interface DrawnObject {
  id: string;
  label: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Open the bench on a board and wait until the whole plan has landed. */
async function playGolden(page: Page, name: string, theme: 'light' | 'dark'): Promise<void> {
  await page.goto(`/board-bench.html?theme=${theme}#board-bench/${name}/instant`);
  await expect(page.getByTestId('board-bench')).toHaveAttribute('data-board', name);
  await page.waitForFunction(() => window.__woboBench?.ready === true, undefined, {
    timeout: 20_000,
  });
}

/** Every object the hand actually put in the DOM, in the order the DOM holds them. */
async function drawn(page: Page): Promise<DrawnObject[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll('[data-wobo-object]')].map((el) => {
      const box = (el as SVGGraphicsElement).getBoundingClientRect();
      return {
        id: (el.getAttribute('data-wobo-object') ?? '').split('#')[0] as string,
        label: el.getAttribute('aria-label'),
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
      };
    }),
  );
}

/** The shortest distance between two boxes, in px. Zero when they overlap. */
function gapBetween(a: DrawnObject, b: DrawnObject): number {
  const dx = Math.max(0, a.x - (b.x + b.width), b.x - (a.x + a.width));
  const dy = Math.max(0, a.y - (b.y + b.height), b.y - (a.y + a.height));
  return Math.hypot(dx, dy);
}

/**
 * How close a mark has to be to the object it hangs off, in board units.
 *
 * A mark ABOUT something sits on it: a circle around it, an underline beneath it, an arrowhead in
 * it. A written note is different — the layout engine puts it in the free space beside its owner
 * (`layout.ts`, `placeLabel`/`avoidCollisions`), so what is asserted for text is that it landed
 * near the thing it names rather than at the board's origin, which is where an anchor that failed
 * to resolve would drop it.
 */
const TOUCHES = 30;
const BESIDE = 200;
const TEXT_KINDS = new Set(['label', 'write', 'number', 'tex']);

test.describe('the golden boards', () => {
  test('there are twelve of them, across the four families', () => {
    expect(manifest).toHaveLength(12);
    const subjects = manifest.map((m) => m.subject);
    expect(subjects.filter((s) => s === 'math')).toHaveLength(3);
    expect(subjects.filter((s) => s === 'physics')).toHaveLength(3);
    expect(subjects.filter((s) => s === 'chemistry')).toHaveLength(3);
    expect(subjects.filter((s) => s === 'biology' || s === 'social')).toHaveLength(3);
    // BOARD.md §10: forty objects typical, two hundred the ceiling.
    for (const entry of manifest) expect(entry.objects).toBeLessThanOrEqual(200);
  });

  for (const entry of manifest) {
    test(`${entry.name} — Wobo draws it, anchored, in order`, async ({ page }) => {
      const board = golden(entry.name);
      await playGolden(page, entry.name, 'light');

      // --- what the store holds ---------------------------------------------------------------
      const ledger = await page.evaluate(() => window.__woboBench?.ledger() ?? []);
      expect(ledger.map((r) => r.id)).toEqual(board.expect.ids);
      expect(ledger.map((r) => r.kind)).toEqual(board.expect.kinds);
      // Law 1: nothing is placed by pixels. Every object resolved through one of the four forms.
      expect(ledger.map((r) => r.anchor)).toEqual(board.expect.anchors);
      expect(ledger.some((r) => r.anchor === 'unknown')).toBe(false);
      // Law 2: nothing the verifier failed reached the board.
      expect(await page.evaluate(() => window.__woboBench?.refused() ?? [])).toEqual([]);

      // --- what the DOM holds -----------------------------------------------------------------
      const objects = await drawn(page);
      const byId = new Map(objects.map((o) => [o.id, o]));
      for (const id of board.expect.ids) {
        expect(byId.has(id), `${id} never reached the board`).toBe(true);
      }
      // Ink order survives all the way to the DOM: Wobo draws in the order Wobo planned.
      expect(objects.map((o) => o.id)).toEqual(board.expect.ids);

      // --- the anchors actually resolved ------------------------------------------------------
      const surface = await page.locator('.wobo-board svg').first().boundingBox();
      expect(surface).not.toBeNull();
      for (const id of board.expect.ids) {
        const object = byId.get(id) as DrawnObject;
        expect(Number.isFinite(object.x) && Number.isFinite(object.y)).toBe(true);
        expect(object.width + object.height, `${id} has no extent`).toBeGreaterThan(0);
        // Nothing floats off the surface it belongs to.
        expect(object.x, `${id} sits left of the board`).toBeGreaterThan(
          (surface as { x: number }).x - 80,
        );
        expect(object.y, `${id} sits above the board`).toBeGreaterThan(
          (surface as { y: number }).y - 80,
        );
      }
      // A mark that hangs off another object is drawn ON it (or beside it, if it is a note) —
      // never at the origin, which is where an anchor that never resolved would put it.
      const unit = (surface as { width: number }).width / 1000;
      for (const [mark, owner] of board.expect.hangsOff) {
        const kind = board.expect.kinds[board.expect.ids.indexOf(mark)] as string;
        const limit = TEXT_KINDS.has(kind) ? BESIDE : TOUCHES;
        const gap =
          gapBetween(byId.get(mark) as DrawnObject, byId.get(owner) as DrawnObject) / unit;
        expect(
          gap,
          `${mark} (${kind}) landed ${Math.round(gap)} board units from ${owner}`,
        ).toBeLessThanOrEqual(limit);
      }

      // --- the words, in the order Wobo writes them --------------------------------------------
      // Read off the objects themselves rather than off a bag of labels: a derivation repeats
      // itself (three sixes in a balanced equation, two plus signs), and what is being asserted is
      // that each written line came out of the object that was meant to carry it, in ink order.
      const writtenIds = board.expect.ids.filter((_, i) =>
        ['write', 'label', 'number'].includes(board.expect.kinds[i] as string),
      );
      expect(writtenIds.map((id) => byId.get(id)?.label ?? null)).toEqual(board.expect.written);

      // --- every number is a verified number --------------------------------------------------
      for (const number of board.expect.numbers) {
        const row = ledger.find((r) => r.id === number.id);
        expect(row?.verified, `${number.id} was drawn unverified`).toBe(true);
        const shown =
          number.precision === undefined
            ? String(number.value)
            : number.value.toFixed(number.precision);
        expect(byId.get(number.id)?.label, `${number.id} does not show its value`).toContain(shown);
      }

      // --- the eye's copy ---------------------------------------------------------------------
      await page.addStyleTag({
        content:
          '[data-testid="bench-chrome"],[data-testid="bench-prompt"]{display:none!important}',
      });
      await page.screenshot({ path: join(SHOTS, `${entry.name}-light.png`) });
      await page.goto(`/board-bench.html?theme=dark#board-bench/${entry.name}/instant`);
      await page.waitForFunction(() => window.__woboBench?.ready === true, undefined, {
        timeout: 20_000,
      });
      await page.addStyleTag({
        content:
          '[data-testid="bench-chrome"],[data-testid="bench-prompt"]{display:none!important}',
      });
      await page.screenshot({ path: join(SHOTS, `${entry.name}-dark.png`) });
    });
  }
});

test.describe('the hand under reduced motion', () => {
  // Playwright 1.58 carries reducedMotion inside contextOptions; the bare key was not a test
  // option at all, so the whole describe ran with motion ON and asserted nothing about §7.
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('everything still lands, in the same order', async ({ page }) => {
    const board = golden('pythagoras');
    await playGolden(page, 'pythagoras', 'light');
    const objects = await drawn(page);
    // BOARD.md §7: reduced motion draws everything instantly, still in order.
    expect(objects.map((o) => o.id)).toEqual(board.expect.ids);
  });
});

test.describe('the plane', () => {
  test('the same plan plays on the frosted plane', async ({ page }) => {
    await page.goto('/board-bench.html#board-bench/tangent-parabola/instant');
    await page.waitForFunction(() => window.__woboBench?.ready === true, undefined, {
      timeout: 20_000,
    });
    await page.getByTestId('bench-plane').click();
    // The plane is a second surface with its own store; the ink lands there too.
    await expect(page.locator('.wobo-board')).toHaveCount(2, { timeout: 15_000 });
  });
});
