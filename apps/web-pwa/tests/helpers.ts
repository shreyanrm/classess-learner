import { expect, type Page, type TestInfo } from '@playwright/test';

export const ONBOARDED_KEY = 'clss-onboarded-v1';

/**
 * Collect real console errors and uncaught page errors. Vite HMR chatter and benign resource
 * 404s (a Phase-0 PWA ships no icons) are not app defects, so they are filtered out — everything
 * else is a genuine failure the mission forbids.
 */
export function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  const ignore = [
    /favicon/i,
    /manifest/i,
    /icon/i,
    /\[vite\]/i,
    /Download the React DevTools/i,
    /ERR_INTERNET_DISCONNECTED/i,
  ];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (ignore.some((re) => re.test(text))) return;
    errors.push(`console.error: ${text}`);
  });
  page.on('pageerror', (err) => {
    errors.push(`pageerror: ${err.message}`);
  });
  return errors;
}

export function assertNoErrors(errors: string[], info: TestInfo): void {
  if (errors.length > 0) {
    info.attach('console-errors', { body: errors.join('\n'), contentType: 'text/plain' });
  }
  expect(errors, `console errors during ${info.title}:\n${errors.join('\n')}`).toEqual([]);
}

/** Skip onboarding: mark onboarded and seed a profile before the app script runs. */
export async function seedOnboarded(page: Page): Promise<void> {
  await page.addInitScript(
    ([key]) => {
      localStorage.setItem(key, '1');
      localStorage.setItem('clss-home-opened', '1'); // sessionStorage is per-context; set below too
      localStorage.setItem(
        'clss-learner-profile',
        JSON.stringify({ name: 'Aanya', grade: 'Class 8', boardId: 'cbse' }),
      );
    },
    [ONBOARDED_KEY],
  );
  // The home landing animation gates on sessionStorage; short-circuit it so the doors are live fast.
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem('clss-home-opened', '1');
    } catch {
      /* ignore */
    }
  });
}

/** Read the XP number from the header chip. */
export async function readXp(page: Page): Promise<number> {
  const chip = page.locator('header >> text=/\\d+\\s*xp/').first();
  const text = await chip.innerText();
  const m = text.match(/(\d+)\s*xp/);
  return m ? Number(m[1]) : Number.NaN;
}

/** Seed data answers for the atom practice items, keyed by their on-screen equation string. */
export const ATOM_ANSWERS: Record<string, string> = {
  'x + 7 = 12': '5',
  '2x + 3 = 7': '2',
  '3x = 12': '4',
  '5x - 2 = 13': '3',
  'x/2 = 5': '10',
  '2(x + 3) = 10': '2',
};
