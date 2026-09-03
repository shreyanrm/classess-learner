import { expect, test } from '@playwright/test';
import { ATOM_TARGET_NODE_ID } from '@wobo/sdk';
import {
  assertNoErrors,
  openAtomCourse,
  profileButton,
  readXp,
  seedOnboarded,
  watchConsole,
} from './helpers';
import { installAtomBrain, seedAtomWorld } from './helpers/brain';

/**
 * Wobo's governed capabilities, exercised end to end in the default keyless (mock) mode — the
 * gateway is never contacted, so every turn falls to the deterministic keyword classifier
 * (src/wobo/paths/classify.ts) and the outcomes are stable.
 *
 *   1 — the permission ladder's approval gate: Wobo proposes starting practice, approve executes.
 *   2 — teach-back (the protégé effect): the learner teaches, Wobo plays the student, bonus lands.
 *   3 — the proactivity dial: the learner's chosen notch survives a reload.
 */

// ---------------------------------------------------------------------------------------------
// 1 — Approval card: Wobo proposes an action (start practice); only approving runs it.
// ---------------------------------------------------------------------------------------------
test('approval card: Wobo proposes starting practice, approve executes', async ({ page }, info) => {
  const errors = watchConsole(page);
  await seedOnboarded(page);
  await page.goto('/');

  // the home chat bar is the door — it navigates to the chat page, then asks. "practice" routes
  // the turn to the start_practice capability (execute_with_permission → an approval card).
  const bar = page.getByPlaceholder('Ask anything from your syllabus, or paste question 7');
  await bar.fill('practice this');
  await bar.press('Enter');

  // Wobo's turn carries the action card: the eyebrow, the labelled offer, and the confidence band
  await expect(page.getByText('Wobo can do this')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('start practice', { exact: true })).toBeVisible();
  await expect(page.getByText(/confidence ·/)).toBeVisible();

  // the gate holds until Wobo is approved — the proposal sits, nothing has navigated yet
  const approve = page.getByRole('button', { name: 'approve', exact: true });
  await expect(approve).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Practice', exact: true })).toHaveCount(0);

  // approve → the capability runs and lands the learner on the practice surface
  await approve.click();
  await expect(page.getByRole('heading', { name: 'Practice', exact: true })).toBeVisible({
    timeout: 10_000,
  });
  assertNoErrors(errors, info);
});

// ---------------------------------------------------------------------------------------------
// 2 — Teach-back happy path: one whole explanation fills every gap; Wobo gets it, the bonus lands.
// ---------------------------------------------------------------------------------------------
test('teach-back: the learner teaches the atom, Wobo plays the student, bonus lands', async ({
  page,
}, info) => {
  const errors = watchConsole(page);
  await seedOnboarded(page);
  // The atom sits in the learner's own syllabus (§6), which is how a topic no board publishes for
  // them is reached now that the bundled catalog is gone.
  await seedAtomWorld(page);
  await page.goto('/');
  await installAtomBrain(page, ATOM_TARGET_NODE_ID);

  // walk to the atom course so a topic is in view — teach-back only opens where there is a topic.
  await openAtomCourse(page);

  // open the docked drawer and step into teach-back. The orb flies and never rests (constant
  // idle micro-motion, WOBO.md §12), so a positional click races its animation — dispatch the
  // click straight at the element instead.
  await page.getByRole('button', { name: 'Talk to Wobo' }).dispatchEvent('click');
  const door = page.getByRole('button', { name: /^teach Wobo:/ });
  await expect(door).toBeVisible({ timeout: 10_000 });
  await door.click();
  await expect(page.getByText(/today you are the teacher/)).toBeVisible();

  const beforeXp = await readXp(page);

  // a single explanation that carries the mechanism (why it holds), a worked example (real
  // numbers), and the boundary (where it breaks) leaves Wobo's student-self nothing to probe.
  const input = page.getByPlaceholder('Explain it to Wobo…');
  await input.fill(
    'You keep both sides equal because whatever you do to one side you undo on the other, ' +
      'like x plus 3 equals 8 gives x equals 5 — unless you divide by zero, which breaks it.',
  );
  await input.press('Enter');

  // Wobo gets it: the ephemeral exchange closes ("back to chat") and the bonus blooms (+45).
  await expect(page.getByRole('button', { name: 'back to chat' })).toBeVisible({ timeout: 8_000 });
  await expect.poll(() => readXp(page), { timeout: 8_000 }).toBe(beforeXp + 45);
  assertNoErrors(errors, info);
});

// ---------------------------------------------------------------------------------------------
// 3 — The proactivity dial: the learner's chosen notch persists across a reload.
// ---------------------------------------------------------------------------------------------
test('proactivity dial: the chosen notch survives a reload', async ({ page }, info) => {
  const errors = watchConsole(page);
  await seedOnboarded(page);
  await page.goto('/');

  await profileButton(page).click();

  const proactive = page.getByRole('button', { name: /^proactive —/ });
  await expect(proactive).toBeVisible({ timeout: 10_000 });
  await proactive.click();
  await expect(proactive).toHaveAttribute('aria-pressed', 'true');

  // the choice is written through to storage, not just held in component state
  expect(await page.evaluate(() => localStorage.getItem('wobo-proactivity-v1'))).toBe('proactive');

  // reload drops back to the home; re-open You and the notch is still the one Wobo picked
  await page.reload();
  await profileButton(page).click();
  await expect(page.getByRole('button', { name: /^proactive —/ })).toHaveAttribute(
    'aria-pressed',
    'true',
    { timeout: 10_000 },
  );
  assertNoErrors(errors, info);
});
