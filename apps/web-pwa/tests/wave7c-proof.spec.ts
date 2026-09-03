import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

// Where the screenshots land. `WOBO_PROOF_DIR` is the repo's proof convention (tests/helpers/proof.ts,
// scripts/proofs.sh) and wins here too; either way the shots go in a `wave7c` subdirectory of their
// own, so sharing that variable with the responsive proof never mixes two runs' pictures. The
// default is this app's gitignored shots/, so the spec is runnable by anyone who checks the repo
// out — it used to carry one machine's absolute scratchpad path, which nobody else has.
const OUT = join(
  process.env.WOBO_PROOF_DIR ??
    join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'shots'),
  'wave7c',
);
mkdirSync(OUT, { recursive: true });

const WIDTHS = [
  { name: '360', w: 360, h: 780 },
  { name: '820', w: 820, h: 1180 },
  { name: '1440', w: 1440, h: 900 },
];

test.describe.configure({ mode: 'serial' });

for (const theme of ['light', 'dark'] as const) {
  for (const size of WIDTHS) {
    test(`landing ${size.name} ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width: size.w, height: size.h });
      await page.addInitScript((t) => {
        try {
          localStorage.setItem('wobo-theme', t);
        } catch {}
      }, theme);
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
      });
      await page.goto('/landing', { waitUntil: 'networkidle' });
      await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
      await page.waitForTimeout(2600);
      await page.screenshot({ path: `${OUT}/hero-${size.name}-${theme}.png` });
      // full page, with the pins settled
      await page.screenshot({ path: `${OUT}/full-${size.name}-${theme}.png`, fullPage: true });
      console.log(`ERRORS ${size.name} ${theme}:`, JSON.stringify(errors.slice(0, 6)));
      // The gateway is not running for a static proof pass, so its refused fetches are expected.
      // The gateway is not part of a static visual proof: whether it is absent (refused) or up but
      // not CORS-configured for this port, its fetches are noise here, not a defect in the page.
      const noise =
        /favicon|manifest|ResizeObserver loop|ERR_CONNECTION_REFUSED|ERR_FAILED|CORS policy|status of 42\d|localhost:8081/i;
      expect(errors.filter((e) => !noise.test(e))).toEqual([]);
    });
  }
}

/** Put the reader at an absolute scroll position and let Lenis and the scrubs settle. */
async function wheelTo(page: import('@playwright/test').Page, target: number) {
  await page.evaluate((y) => window.scrollTo(0, y), target);
  await page.waitForTimeout(900);
}

test('mid-scroll beats of both pinned chapters', async ({ page }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/landing', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);

  const nightTop = await page.evaluate(() => {
    const el = document.querySelector('#night');
    return el ? (el as HTMLElement).getBoundingClientRect().top + window.scrollY : 0;
  });
  for (const [label, frac] of [
    ['a', 0.18],
    ['b', 0.42],
    ['c', 0.72],
    ['d', 0.93],
  ] as const) {
    await wheelTo(page, nightTop + 4200 * frac);
    await page.screenshot({ path: `${OUT}/night-${label}.png` });
  }

  const sundayTop = await page.evaluate(() => {
    const el = document.querySelector('#parents-note');
    return el ? (el as HTMLElement).getBoundingClientRect().top + window.scrollY : 0;
  });
  for (const [label, frac] of [
    ['a', 0.25],
    ['b', 0.8],
  ] as const) {
    await wheelTo(page, sundayTop + 1800 * frac);
    await page.screenshot({ path: `${OUT}/sunday-${label}.png` });
  }

  // the sections after the pins, so the tiles and the ask panel are proved too
  for (const id of [
    '#why',
    '#students',
    '#practice',
    '#subjects',
    '#safe',
    '#ask',
    '#faq',
    '#close',
  ]) {
    await page.evaluate(
      (sel) => document.querySelector(sel)?.scrollIntoView({ block: 'start' }),
      id,
    );
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/sec${id.replace('#', '-')}.png` });
  }
});

async function scrollToSection(page: import('@playwright/test').Page, id: string) {
  await page.waitForTimeout(1400);
  const top = await page.evaluate(
    (sel) =>
      (document.querySelector(sel) as HTMLElement).getBoundingClientRect().top + window.scrollY,
    id,
  );
  await wheelTo(page, top);
}

test('the puzzle actually works', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/landing', { waitUntil: 'networkidle' });
  await page.evaluate(() =>
    document.querySelector('#practice')?.scrollIntoView({ block: 'center' }),
  );
  await page.waitForTimeout(1400);
  await page.getByRole('button', { name: 'top left' }).click();
  await page.getByRole('button', { name: 'Check' }).click();
  await page.waitForTimeout(900);
  await expect(page.locator('#say')).toHaveText("that's a quarter. one more");
  await page.screenshot({ path: `${OUT}/puzzle-quarter.png` });
  await page.getByRole('button', { name: 'top right' }).click();
  await page.getByRole('button', { name: 'Check' }).click();
  await page.waitForTimeout(900);
  await expect(page.locator('#say')).toHaveText('there we go');
  await page.screenshot({ path: `${OUT}/puzzle-win.png` });
});

test('ask Wobo answers for itself', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/landing', { waitUntil: 'networkidle' });
  await scrollToSection(page, '#ask');
  await page.getByRole('button', { name: "Does it follow my school's syllabus?" }).click();
  await page.waitForTimeout(2200);
  await expect(page.locator('#askReply')).toContainText('Tell me your board and class once');
  await page.screenshot({ path: `${OUT}/ask-reply.png` });
});

/**
 * THE PEN OF LIGHT AND ITS RIBBON, PROVED.
 *
 * Playwright never renders a cursor, so this used to be written off as unprovable by a screenshot
 * and left to the engine's unit tests. It is not unprovable: the nib is an ordinary element whose
 * transform the engine writes every frame, and the ribbon is a canvas whose pixels can be read
 * back. Both were in fact dead in the assembled page — the fixed chrome was portalled into a host
 * that only existed after the engine's effects had already bound to nothing — while every unit
 * test stayed green, because the bug was in the wiring rather than in either module. This is the
 * test that catches that class of failure, so it asserts the page, not the parts.
 */
test('the pen carries and the ribbon paints', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/landing', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Before the pointer has been anywhere, the pen is invisible: the state is parked at the centre
  // of the viewport, and showing it then paints a blue dot in the corner of an untouched page.
  await expect(page.locator('#nib')).not.toHaveClass(/\bon\b/);

  await page.mouse.move(400, 400);
  for (let i = 0; i < 24; i += 1) {
    await page.mouse.move(400 + i * 22, 400 + Math.sin(i / 3) * 80);
  }

  const pen = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('#trace');
    const ctx = canvas?.getContext('2d');
    let painted = 0;
    if (canvas && ctx) {
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 3; i < data.length; i += 4) if ((data[i] ?? 0) > 8) painted += 1;
    }
    const nib = document.querySelector<HTMLElement>('#nib');
    return {
      painted,
      carried: !!nib && nib.style.transform.startsWith('translate('),
      visible: !!nib?.classList.contains('on'),
    };
  });

  expect(pen.carried).toBe(true); // the nib is being moved, frame by frame
  expect(pen.visible).toBe(true); // and it appeared with the first movement
  expect(pen.painted).toBeGreaterThan(500); // and the ribbon is a real, filled shape behind it
});

/**
 * The four blurred colour blobs drift as the page scrolls — the whole of "depth, not dust". They
 * live in the same portalled chrome the pen does, and they went dead in the same way and for the
 * same reason, so they are proved here rather than assumed.
 */
test('the depth blobs drift with the scroll', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/landing', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const read = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('#depth i')].map((el) => getComputedStyle(el).transform),
    );

  const atTop = await read();
  expect(atTop).toHaveLength(4);
  expect(atTop.every((t) => t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)')).toBe(true);

  await page.evaluate(() => {
    const lenis = (window as unknown as { lenis?: { scrollTo(y: number, o: object): void } }).lenis;
    if (lenis) lenis.scrollTo(2600, { immediate: true });
    else window.scrollTo(0, 2600);
  });
  await page.waitForTimeout(1600);

  // Each blob further than the one before it: the prototype's -(i+1) x 120 px, eased by scrub.
  const shifted = (await read()).map((t) =>
    Number(/matrix\([^)]*,\s*(-?[\d.]+)\)$/.exec(t)?.[1] ?? Number.NaN),
  );
  expect(shifted.every((y) => Number.isFinite(y))).toBe(true);
  expect(shifted[0] ?? 0).toBeLessThan(-10);
  for (let i = 1; i < shifted.length; i += 1) {
    expect(shifted[i] ?? 0).toBeLessThan(shifted[i - 1] ?? 0);
  }
});

/**
 * BOTH CHAPTERS ACTUALLY STICK. The screenshot pass above walks the same scroll positions, but a
 * screenshot cannot fail: a chapter that has come unpinned simply photographs an empty band and the
 * run stays green. That is exactly how the first pass shipped a page whose Tuesday night and Sunday
 * note both scrolled away — GSAP pins by switching the section to `position: fixed`, and the app's
 * screen wrapper carries `will-change: transform`, which makes it the containing block for every
 * fixed descendant, so "fixed" resolved against the page instead of the viewport.
 *
 * The page no longer depends on overriding that hint: the chapters pin with `pinType: 'transform'`
 * (engine/chapters.ts). This is the assertion that keeps it honest — at three points across each
 * scrub the pinned element must be exactly at the top of the viewport and exactly its height.
 */
test('both pinned chapters hold the viewport for the whole scrub', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/landing', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);

  for (const [sel, length] of [
    ['#night', 4200],
    ['#parents-note', 1800],
  ] as const) {
    const top = await page.evaluate((s) => {
      const el = document.querySelector(s) as HTMLElement;
      return el.getBoundingClientRect().top + window.scrollY;
    }, sel);
    for (const frac of [0.1, 0.5, 0.95]) {
      await wheelTo(page, top + length * frac);
      const box = await page.evaluate((s) => {
        const pin = document.querySelector(`${s} .pin`) as HTMLElement;
        const r = pin.getBoundingClientRect();
        return { top: Math.round(r.top), height: Math.round(r.height), vh: window.innerHeight };
      }, sel);
      expect(Math.abs(box.top), `${sel} @ ${frac} sits at the top of the viewport`).toBeLessThan(4);
      expect(Math.abs(box.height - box.vh), `${sel} @ ${frac} fills it`).toBeLessThan(4);
    }
  }
});

/**
 * THE PAGE SETS IN THE LAW'S TYPE, FROM OUR OWN ORIGIN. DESIGN.md names Poppins and Caveat, the
 * owner approved the prototype set in them, and every wrapping difference the first comparison
 * found between the two pages traced to Poppins being absent. `page-styles.ts` declares both out of
 * `public/fonts/`; this asserts the browser really resolved them — a stack that merely *names*
 * Poppins renders as the fallback and looks fine to a unit test.
 */
test('the page sets in Poppins and Caveat, served by us', async ({ page }) => {
  const faceRequests: string[] = [];
  page.on('request', (r) => {
    if (/\.(woff2?|ttf|otf)(\?|$)/.test(r.url())) faceRequests.push(r.url());
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/landing', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.fonts.status === 'loaded');
  await page.waitForTimeout(1200);

  const loaded = await page.evaluate(() =>
    [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family),
  );
  expect(loaded).toContain('Poppins');
  expect(loaded).toContain('Caveat');
  // Nothing on this page may fetch a face from a font CDN.
  for (const url of faceRequests) expect(new URL(url).hostname).toBe('localhost');
  // And the elements that matter are actually rendering in them, not in a fallback.
  const families = await page.evaluate(() => ({
    headline: getComputedStyle(document.querySelector('#hero h1') as Element).fontFamily,
    hand: getComputedStyle(document.querySelector('#hero h1 em') as Element).fontFamily,
  }));
  expect(families.headline.startsWith('Poppins')).toBe(true);
  expect(families.hand.startsWith('Caveat')).toBe(true);
});
