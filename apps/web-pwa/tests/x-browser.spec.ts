import { expect, type Page, test } from '@playwright/test';
import { seedOnboarded, watchConsole } from './helpers';

/**
 * The cross-browser × responsive matrix. One walk covers every major surface — home, learn,
 * subject list, expedition, course entry, practice, progress, chat, you — plus a fresh
 * onboarding. Each stop asserts: no horizontal body scroll, key affordances visible (header,
 * back affordance, Wobo orb), and zero real console errors across the whole walk. Screenshots
 * land in <repo>/xbrowser/<engine>/<width>-<theme>/<NN-route>.png for eyeball review.
 *
 * Engines come from x-browser.config.ts projects (chromium, webkit, firefox); widths and themes
 * fan out here. ponytail: one serial walk per cell instead of a test per route — the router is
 * in-memory, so each route is only reachable by walking, and one walk is 9 routes for the price
 * of one page load.
 */

const SHOT_ROOT = new URL('../../../xbrowser/', import.meta.url).pathname;

const SIZES = [
  { width: 390, height: 844 }, // phone
  { width: 768, height: 1024 }, // tablet portrait
  { width: 1024, height: 768 }, // tablet landscape
  { width: 1380, height: 900 }, // desktop
] as const;
const THEMES = ['light', 'dark'] as const;

type Theme = (typeof THEMES)[number];

/** Force a stored theme before the app boots (theme.ts reads clss-theme-v1 at init). */
async function seedTheme(page: Page, theme: Theme): Promise<void> {
  await page.addInitScript((t) => localStorage.setItem('clss-theme-v1', t), theme);
}

function shotPath(engine: string, width: number, theme: Theme, name: string): string {
  return `${SHOT_ROOT}${engine}/${width}-${theme}/${name}.png`;
}

/** The per-cell gate: layout holds the viewport and the promised affordances are on screen. */
async function checkCell(
  page: Page,
  opts: {
    engine: string;
    width: number;
    theme: Theme;
    name: string;
    header?: boolean;
    orb?: boolean;
  },
): Promise<void> {
  // let route transitions (framer-motion, ~220-400ms) land before measuring
  await page.waitForTimeout(600);
  if (opts.header) await expect(page.locator('header').first()).toBeVisible();
  if (opts.orb) await expect(page.getByLabel('Talk to Wobo')).toBeVisible();
  const overflow = await page.evaluate(() => {
    const d = document.documentElement;
    return Math.max(d.scrollWidth - d.clientWidth, document.body.scrollWidth - d.clientWidth);
  });
  expect(overflow, `${opts.name}: horizontal overflow of ${overflow}px`).toBeLessThanOrEqual(1);
  await page.screenshot({
    path: shotPath(opts.engine, opts.width, opts.theme, opts.name),
    animations: 'disabled',
  });
}

/** Navigate via the command palette — the one road that reaches every surface. */
async function paletteGo(page: Page, query: string): Promise<void> {
  await page.keyboard.press('Control+k');
  const box = page.getByPlaceholder('Where to, or what…');
  await expect(box).toBeVisible();
  await box.fill(query);
  await page.keyboard.press('Enter');
}

for (const { width, height } of SIZES) {
  for (const theme of THEMES) {
    test(`walk ${width}px ${theme}`, async ({ page, browserName }, info) => {
      const errors = watchConsole(page);
      const cell = { engine: browserName, width, theme };
      await seedOnboarded(page);
      await seedTheme(page, theme);
      await page.setViewportSize({ width, height });
      await page.goto('/');

      // 1 — home: the two doors, the header identity cluster. Wobo IS the home, no docked orb.
      await expect(page.getByRole('button', { name: 'Learn', exact: true })).toBeVisible({
        timeout: 15_000,
      });
      await checkCell(page, { ...cell, name: '01-home', header: true });

      // 2 — learn
      await page.getByRole('button', { name: 'Learn', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Learn' })).toBeVisible();
      await checkCell(page, { ...cell, name: '02-learn', header: true, orb: true });

      // 3 — subject list, with its back whisper
      await page.getByRole('button', { name: /Mathematics — open the subject/ }).click();
      await expect(page.getByRole('heading', { name: 'Mathematics' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Back — ◦ learn' })).toBeVisible();
      await checkCell(page, { ...cell, name: '03-subject', header: true, orb: true });

      // 4 — the expedition portal (roadmap view), then back to the list
      await page.getByRole('tab', { name: 'roadmap' }).click();
      await expect(page.getByLabel(/expedition map/)).toBeVisible({ timeout: 15_000 });
      await checkCell(page, { ...cell, name: '04-expedition' });
      await page.getByRole('button', { name: 'Back to the chapter list' }).click();
      await expect(page.getByRole('heading', { name: 'Mathematics' })).toBeVisible();

      // 5 — course entry: expand the atom chapter, open the topic, land on the arrival card.
      // The expand is animated; if the topic hasn't appeared, click the chapter once more
      // (webkit occasionally swallows the first click right after the expedition portal exits).
      const chapter = page.getByRole('button', { name: /Linear equations in one variable/ });
      const topic = page.getByRole('button', {
        name: /^Solving equations with the variable on one side/,
      });
      await chapter.scrollIntoViewIfNeeded();
      await chapter.click();
      try {
        await expect(topic).toBeVisible({ timeout: 4_000 });
      } catch {
        await chapter.click();
        await expect(topic).toBeVisible();
      }
      await topic.click();
      await expect(page.getByRole('button', { name: /^begin$/i }).last()).toBeVisible({
        timeout: 15_000,
      });
      await expect(page.getByRole('button', { name: 'Close course' })).toBeVisible();
      await checkCell(page, { ...cell, name: '05-course-entry' });
      await page.getByRole('button', { name: 'Close course' }).click();

      // 6 — practice
      await paletteGo(page, 'practice');
      await expect(page.getByRole('heading', { name: 'Practice' })).toBeVisible();
      await checkCell(page, { ...cell, name: '06-practice', header: true, orb: true });

      // 7 — progress (the knowledge twin)
      await paletteGo(page, 'progress');
      await expect(page.getByText(/of \d+ concepts are yours/)).toBeVisible({ timeout: 15_000 });
      await checkCell(page, { ...cell, name: '07-progress', header: true, orb: true });

      // 8 — chat (the page IS her — no docked twin)
      await paletteGo(page, 'chat');
      await expect(page.getByRole('button', { name: 'Back — ◦ back' })).toBeVisible();
      await checkCell(page, { ...cell, name: '08-chat', header: true });

      // 9 — you
      await page.getByRole('button', { name: /You — level \d+, profile and settings/ }).click();
      await expect(page.getByText('Learning is better shared')).toBeVisible({ timeout: 15_000 });
      await checkCell(page, { ...cell, name: '09-you', header: true, orb: true });

      // the whole walk must be console-clean
      expect(errors, `console errors during walk:\n${errors.join('\n')}`).toEqual([]);
      info.annotations.push({ type: 'cell', description: `${browserName} ${width} ${theme}` });
    });

    test(`onboarding fresh ${width}px ${theme}`, async ({ page, browserName }) => {
      const errors = watchConsole(page);
      await seedTheme(page, theme);
      await page.setViewportSize({ width, height });
      await page.goto('/');
      // The flow opens on her door: one warm tap unlocks her voice, then she introduces herself
      // (written letter by letter) and only afterwards asks for a name. The screenshot is taken on
      // that first beat — the one every learner actually meets first.
      await expect(page.getByRole('button', { name: 'begin', exact: true })).toBeVisible({
        timeout: 15_000,
      });
      await expect(page.getByRole('button', { name: 'Skip for now' })).toBeVisible();
      await checkCell(page, {
        engine: browserName,
        width,
        theme,
        name: '00-onboarding',
      });
      expect(errors, `console errors during onboarding:\n${errors.join('\n')}`).toEqual([]);
    });
  }
}
