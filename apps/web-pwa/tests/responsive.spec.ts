/**
 * THE RESPONSIVE PROOF (WOBO-PLAN §18 — device agnostic, handcrafted).
 *
 * A promise that the app is device agnostic is worth nothing unless something checks it on every
 * screen, every time. This suite is that check. For every address the router can reach it opens
 * the app at a phone, a tablet and a laptop width, in light and in dark, and measures five things
 * a learner would feel immediately:
 *
 *   1. the page is never wider than the screen (no sideways scroll to finish a sentence),
 *   2. no box clips the text inside it without an ellipsis or a way to scroll,
 *   3. every control is at least 44×44 px on the phone, where a thumb has to hit it,
 *   4. body copy is never below 14 px,
 *   5. the first three tabbable controls show focus.
 *
 * A screenshot of each route × width × theme is captured beside the report, plus a reduced-motion
 * pass at the tablet width, so the whole matrix can be eyeballed as well as asserted.
 *
 * WHAT THIS SUITE DOES NOT DO: it never fixes a screen. Findings are reported with a selector
 * precise enough for the screen's owner to act on, and the summary table is written to the proof
 * directory BEFORE the assertion, so a failing route still reaches the report.
 *
 * Determinism: each route is visited once and then resized, so nothing depends on boot ordering;
 * measurement happens only after fonts, layout and finite animations have settled; and every
 * threshold carries a sub-pixel tolerance. Three consecutive runs produce byte-identical findings.
 */

import { expect, type Page, test } from '@playwright/test';
import { ATOM_TARGET_NODE_ID } from '@wobo/sdk';
import { seedOnboarded } from './helpers';
import { installAtomBrain, seedAtomWorld } from './helpers/brain';
import {
  applyTheme,
  auditFocusVisible,
  auditViewport,
  type CaseResult,
  ensureProofDir,
  type Finding,
  freezeMotion,
  REDUCED_MOTION_WIDTH,
  ROUTES,
  type RouteReport,
  screenshotPath,
  settle,
  THEMES,
  WIDTHS,
  writeRouteReport,
  writeSummary,
} from './helpers/proof';

/**
 * The suite is parallel-safe: every test owns its own page, writes only its own route's JSON, and
 * shares no state. The repo config pins `workers: 1` for the journey suite's sake; run this file
 * with `--workers=4` (scripts/proofs.sh does) and it fans out with no change in the findings.
 */
test.describe.configure({ mode: 'parallel' });

/**
 * A finding is this suite's normal output, not an incident: the report beside the spec already
 * carries the selector, the measurement and a screenshot of every cell. Playwright's failure
 * artefacts would re-capture all of that per route and cost the run its budget, so they are off
 * here — the proof directory IS the artefact.
 */
test.use({ trace: 'off', screenshot: 'off', video: 'off' });

/** Generous, because a cold vite dev server compiles the lazy screen on first visit. */
test.setTimeout(120_000);

test.beforeAll(() => {
  ensureProofDir();
});

/**
 * Open a route and wait for the screen to actually be there.
 *
 * The retry is for the dev server, not for the app: vite pushes a hot update the moment any source
 * file changes, and a reload landing mid-update shows an empty document for a beat. Retrying the
 * navigation once turns that into a slower test instead of an invented finding. A screen that is
 * genuinely missing still fails, on the second attempt, with the same message.
 */
/** The dev server is gone — an infrastructure failure, never a claim about the app's layout. */
const SERVER_DOWN = /ERR_CONNECTION_REFUSED|ERR_CONNECTION_RESET|ERR_EMPTY_RESPONSE/;

async function openRoute(page: Page, path: string, ready: string | RegExp): Promise<void> {
  const attempts = 3;
  for (let attempt = 0; ; attempt += 1) {
    try {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      // The navigation threw the page's modules away, so the brain is installed again behind it.
      await installAtomBrain(page, ATOM_TARGET_NODE_ID);
      await expect(page.getByText(ready).first()).toBeVisible({
        timeout: attempt === 0 ? 15_000 : 25_000,
      });
      return;
    } catch (err) {
      const down = SERVER_DOWN.test(String(err));
      if (attempt >= attempts - 1) {
        // A dead server must never be written down as a finding about a screen. Say what actually
        // happened, and say it in a way the caller cannot mistake for a measurement.
        if (down) throw new Error(`dev server unreachable while opening ${path}: ${String(err)}`);
        throw err;
      }
      await page.waitForTimeout(down ? 3_000 : 1_000); // a restart takes longer than a hot update
    }
  }
}

/**
 * Run one measurement, once more if the page moved under it. `page.evaluate` throws when the
 * execution context is destroyed — a hot reload, a redirect — and that is a lost sample, never a
 * finding. Anything still failing on the second attempt is real and propagates.
 */
const TRANSIENT =
  /Execution context was destroyed|Target closed|Most likely the page|frame was detached/;

async function measure<T>(page: Page, ready: string | RegExp, take: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await take();
    } catch (err) {
      if (attempt >= 2 || !TRANSIENT.test(String(err))) throw err;
      await expect(page.getByText(ready).first()).toBeVisible({ timeout: 30_000 });
    }
  }
}

function describeFindings(cases: CaseResult[]): string {
  const lines: string[] = [];
  for (const c of cases) {
    if (c.findings.length === 0) continue;
    lines.push(`  ${c.width}px · ${c.theme}:`);
    for (const f of c.findings) lines.push(`    [${f.check}] ${f.selector} — ${f.detail}`);
  }
  return lines.join('\n');
}

for (const route of ROUTES) {
  test(`responsive proof — ${route.id} (${route.path})`, async ({ page }, info) => {
    await seedOnboarded(page);
    // A measured screen needs a learner with a syllabus. Wave 6 deleted the bundled catalog, so
    // the world is pinned before boot and the brain that answers for it is installed after each
    // navigation — otherwise `/subject/math/*` and `/course/m2-1` render the honest empty state
    // and the matrix would be measuring an empty page rather than the screen it names.
    await seedAtomWorld(page);
    // The widest viewport first: one navigation, then resizes. Booting once per route (instead of
    // once per cell) is what keeps the whole matrix inside the four-minute budget, and it removes
    // boot-order as a source of variance between runs.
    await page.setViewportSize({ width: 1440, height: 900 });

    const cases: CaseResult[] = [];

    // An address that does not render its own screen is the FIRST §18 finding, not a crashed test:
    // a deep link that silently lands somewhere else is exactly the kind of break a learner hits by
    // reopening a bookmark. Record it, keep a picture of whatever did render, and stop — measuring
    // the wrong screen under this route's name would poison the report.
    try {
      await openRoute(page, route.path, route.ready);
    } catch (err) {
      // Infrastructure, not the app: let it fail loudly rather than libel the screen.
      if (/dev server unreachable/.test(String(err))) throw err;
      const shot = screenshotPath(route.id, 1440, 'light');
      await page
        .screenshot({ path: shot, fullPage: true, animations: 'disabled' })
        .catch(() => undefined);
      const finding: Finding = {
        check: 'route-unreachable',
        selector: 'html',
        detail: `${route.path} never showed its screen (waited for ${String(route.ready)}) — the address falls through to another screen or does not render`,
      };
      const unreachable: RouteReport = {
        route: route.id,
        path: route.path,
        cases: [
          {
            route: route.id,
            path: route.path,
            width: 1440,
            theme: 'light',
            findings: [finding],
            screenshot: shot,
          },
        ],
      };
      writeRouteReport(unreachable);
      writeSummary();
      expect(finding.detail, `${route.id} is unreachable`).toBe('');
      return;
    }

    // Boot happened with motion ON — the entrance animations are real. From here the ambient loops
    // are stopped so every measurement below is of a still frame, identical on every run.
    await freezeMotion(page);

    for (const theme of THEMES) {
      await applyTheme(page, theme);
      for (const vp of WIDTHS) {
        await page.setViewportSize(vp);
        const shot = screenshotPath(route.id, vp.width, theme);
        // Settle, measure and capture are ONE retryable unit: a hot reload landing anywhere inside
        // them invalidates the whole cell, not just the step that happened to notice.
        const findings: Finding[] = await measure(page, route.ready, async () => {
          await settle(page);
          const found = [
            ...(await auditViewport(page, vp.width)),
            ...(await auditFocusVisible(page)),
          ];
          await page.screenshot({ path: shot, fullPage: true, animations: 'disabled' });
          return found;
        });
        cases.push({
          route: route.id,
          path: route.path,
          width: vp.width,
          theme,
          findings,
          screenshot: shot,
        });
      }
    }

    // The reduced-motion pass. A learner who asks their device for less motion must still get a
    // laid-out, readable screen — a motion-gated entrance that never runs must not leave content
    // at zero opacity or off-canvas (MOTION.md).
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    await applyTheme(page, 'light');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: REDUCED_MOTION_WIDTH, height: 1180 });
    await openRoute(page, route.path, route.ready);
    const reducedShot = screenshotPath(route.id, REDUCED_MOTION_WIDTH, 'reduced-motion');
    const reducedFindings = await measure(page, route.ready, async () => {
      await settle(page);
      const found = [
        ...(await auditViewport(page, REDUCED_MOTION_WIDTH)),
        ...(await auditFocusVisible(page)),
      ];
      await page.screenshot({ path: reducedShot, fullPage: true, animations: 'disabled' });
      return found;
    });
    cases.push({
      route: route.id,
      path: route.path,
      width: REDUCED_MOTION_WIDTH,
      theme: 'reduced-motion',
      findings: reducedFindings,
      screenshot: reducedShot,
    });
    await page.emulateMedia({ reducedMotion: 'no-preference' });

    // Report BEFORE asserting: the summary table is the deliverable, and a red route is exactly
    // the row a UI raise needs to read.
    const report: RouteReport = { route: route.id, path: route.path, cases };
    writeRouteReport(report);
    writeSummary();

    const total = cases.reduce((n, c) => n + c.findings.length, 0);
    if (total > 0) {
      info.attach(`responsive-findings-${route.id}`, {
        body: describeFindings(cases),
        contentType: 'text/plain',
      });
    }
    expect(
      total,
      `${route.id} (${route.path}) has ${total} responsive finding(s):\n${describeFindings(cases)}`,
    ).toBe(0);
  });
}
