import { expect, type Page, test } from '@playwright/test';
import { ATOM_ANSWERS, assertNoErrors, readXp, seedOnboarded, watchConsole } from './helpers';

/** Read the current practice/boss equation by matching the on-screen text to the seed set. */
async function currentEquation(page: Page): Promise<string> {
  const keys = Object.keys(ATOM_ANSWERS);
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    for (const eq of keys) {
      const hit = await page
        .getByText(eq, { exact: true })
        .first()
        .isVisible()
        .catch(() => false);
      if (hit) return eq;
    }
    await page.waitForTimeout(150); // card is mid-transition — let the deck settle
  }
  throw new Error('no known equation visible on the current card');
}

const actionBarButton = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true }).last();

// ---------------------------------------------------------------------------------------------
// 1 — Onboarding lands the learner on the home, the door she just opened.
// ---------------------------------------------------------------------------------------------
test('onboarding walks four beats and opens the home', async ({ page }, info) => {
  const errors = watchConsole(page);
  await page.goto('/');

  // beat one — the typed hello, then the door
  await expect(page.getByText("hi — I'm Vidya")).toBeVisible({ timeout: 15_000 });
  const begin = page.getByRole('button', { name: "let's begin" });
  await begin.click({ timeout: 15_000 });

  // beat two — the name
  const nameField = page.getByLabel('your name');
  await nameField.fill('Aanya');
  await page.getByRole('button', { name: "I'm Aanya" }).click();

  // beat three — grade and board
  await page.getByRole('button', { name: 'Class 8', exact: true }).click();
  await page.getByRole('button', { name: 'CBSE', exact: true }).click();
  await page.getByRole('button', { name: "that's me" }).click();

  // beat four — the door draws itself, then she steps in
  await expect(page.getByText('your page is ready')).toBeVisible();
  await page.getByRole('button', { name: 'step in' }).click();

  // home — the doors are live, the identity cluster is present
  await expect(page.getByRole('button', { name: 'Learn', exact: true })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole('button', { name: 'Practice', exact: true })).toBeVisible();
  assertNoErrors(errors, info);
});

// ---------------------------------------------------------------------------------------------
// 2 — The home surfaces: logo, identity cluster, did-you-know, the two aurora doors.
// ---------------------------------------------------------------------------------------------
test('the home shows the wordmark, identity cluster, did-you-know, and both doors', async ({
  page,
}, info) => {
  const errors = watchConsole(page);
  await seedOnboarded(page);
  await page.goto('/');

  const header = page.locator('header').first();
  await expect(header).toBeVisible();
  // identity cluster: streak flame + xp chip + the avatar
  await expect(header.getByText(/\d+\s*xp/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'You — profile and settings' })).toBeVisible();

  // did-you-know opens a fresh fact
  await page.getByRole('button', { name: 'Did you know' }).click();
  await expect(
    page.getByText(/white tiger|Venus|honey|octopus|neutron star|chess|Eiffel/i),
  ).toBeVisible();

  // the two doors
  await expect(page.getByRole('button', { name: 'Learn', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Practice', exact: true })).toBeVisible();
  assertNoErrors(errors, info);
});

// ---------------------------------------------------------------------------------------------
// 3 — The whole atom journey: learn → subject → course (a wrong answer detonates, the rest are
//     solved) → boss → the greeting XP, then on to the twin, the invite award, and the palette.
// ---------------------------------------------------------------------------------------------
test('the atom journey: course, detonation, boss, greeting, twin, invite, palette', async ({
  page,
}, info) => {
  const errors = watchConsole(page);
  await seedOnboarded(page);
  await page.goto('/');

  // home → learn
  await page.getByRole('button', { name: 'Learn', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Learn' })).toBeVisible();

  // learn → the mathematics subject
  await page.getByRole('button', { name: /Mathematics — open the subject/ }).click();
  await expect(page.getByRole('heading', { name: 'Mathematics' })).toBeVisible();

  // subject → expand the atom chapter → open the atom topic
  await page.getByRole('button', { name: /Linear equations in one variable/ }).click();
  await page
    .getByRole('button', { name: /^Solving equations with the variable on one side/ })
    .click();

  // arrival card → begin
  await actionBarButton(page, 'begin').click();

  // guided discovery: take three weights off each pan so the scale ends level (x = 5)
  const weight = page.getByLabel('take this weight off');
  for (let i = 0; i < 6; i += 1) {
    await weight.first().click();
  }
  const scaleContinue = actionBarButton(page, 'continue');
  await expect(scaleContinue).toBeEnabled({ timeout: 15_000 });
  await scaleContinue.click();

  // what-if sandbox → continue
  await expect(page.getByText('every number here is yours to drag')).toBeVisible();
  await actionBarButton(page, 'continue').click();

  // practice — the FIRST item is answered wrong on purpose: the misconception detonates
  await expect(page.getByText('solve for x')).toBeVisible();
  const eqWrong = await currentEquation(page); // x + 7 = 12
  expect(eqWrong).toBe('x + 7 = 12');
  await page.keyboard.type('9'); // wrong — answer is 5
  await actionBarButton(page, 'check').click();
  await expect(page.getByText('the honest move')).toBeVisible({ timeout: 6_000 });
  const detonateContinue = actionBarButton(page, 'continue');
  await expect(detonateContinue).toBeEnabled({ timeout: 8_000 });
  await detonateContinue.click();

  // the remaining three items (two fresh + the re-queued miss) are all solved correctly
  for (let i = 0; i < 3; i += 1) {
    await expect(page.getByText('solve for x')).toBeVisible();
    const eq = await currentEquation(page);
    const answer = ATOM_ANSWERS[eq];
    expect(answer, `no seed answer for "${eq}"`).toBeTruthy();
    await page.keyboard.type(answer);
    await actionBarButton(page, 'check').click();
    await expect(page.getByText('that holds.')).toBeVisible({ timeout: 6_000 });
    await actionBarButton(page, 'continue').click();
  }

  // the boss door → step in
  await expect(page.getByText('the boss', { exact: true })).toBeVisible({ timeout: 10_000 });
  await actionBarButton(page, 'step in').click();

  // the boss workbook: solve, choose the missing step, tap the wrong line
  const bossEq = await currentEquation(page); // 5x - 2 = 13
  await page.getByLabel('your answer for x').fill(ATOM_ANSWERS[bossEq]); // 3
  await page.getByRole('button', { name: 'multiply both sides by 2' }).click();
  await page.getByRole('button', { name: '2x = 16', exact: true }).click();
  await actionBarButton(page, 'check all three').click();

  // pass → continue into the greeting; the topic completes and XP blooms (+150)
  await actionBarButton(page, 'continue').click();
  await expect(page.getByText('the greeting')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/you kept the scale level/i)).toBeVisible();
  await expect.poll(() => readXp(page), { timeout: 8_000 }).toBeGreaterThanOrEqual(150);

  // greeting → the mystery tease
  await actionBarButton(page, 'continue').click();

  // the command palette reaches the twin
  await page.keyboard.press('Control+k');
  const palette = page.getByPlaceholder('where to, or what…');
  await expect(palette).toBeVisible();
  await palette.fill('progress');
  await page.keyboard.press('Enter');

  // the knowledge twin — the constellation and the identity line
  await expect(page.getByText(/of \d+ concepts are yours/)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByPlaceholder(/ask your twin/)).toBeVisible();

  // → you, where an invite awards exactly once
  await page.getByRole('button', { name: 'You — profile and settings' }).click();
  await expect(page.getByText('learning is better shared')).toBeVisible({ timeout: 10_000 });
  const beforeInvite = await readXp(page);
  // the friend card is the first invite in the DOM
  const friendCopy = page.getByRole('button', { name: 'copy link' }).first();
  await friendCopy.click();
  await expect.poll(() => readXp(page), { timeout: 6_000 }).toBe(beforeInvite + 40);
  // a second copy must NOT award again (once-key guards it)
  await friendCopy.click();
  await page.waitForTimeout(600);
  expect(await readXp(page)).toBe(beforeInvite + 40);

  // the palette also gets us home — the round trip closes clean
  await page.keyboard.press('Control+k');
  await expect(page.getByPlaceholder('where to, or what…')).toBeVisible();
  await page.getByPlaceholder('where to, or what…').fill('home');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Learn', exact: true })).toBeVisible({
    timeout: 10_000,
  });

  assertNoErrors(errors, info);
});
