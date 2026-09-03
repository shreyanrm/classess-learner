import { chromium } from '@playwright/test';

/**
 * The hermeticity check, run once before any spec.
 *
 * The suite's whole design is that it never touches a network service: `playwright.config.ts`
 * starts the dev server keyless (`VITE_GATEWAY_URL=`, blank Supabase vars) so turns fall to the
 * deterministic mock, TTS no-ops, and `sdk.account` is absent. Every spec's console-error
 * assertion rests on that — an app that CAN reach a gateway logs CORS refusals and 4xx bodies
 * that have nothing to do with the behaviour under test.
 *
 * `reuseExistingServer` is on locally, and that is where the trap is: if something is already
 * listening on the port — a plain `bun run dev`, whose `.env.development` points at the brain on
 * 8081 and whose `.env.local` carries real Supabase keys — Playwright silently attaches to it and
 * every spec is then driving an app wired to live services. With the brain actually running, the
 * suite goes red in a dozen places at once with CORS errors, and not one message says why.
 *
 * So: open the app once and watch where it tries to go. Anything off its own origin means the
 * page under test is not the hermetic one, and the run stops here with the reason and the fix
 * written out — one clear failure instead of thirty-five confusing ones. Costs about five seconds.
 *
 * Asserted on the request, not on the config, deliberately: `import.meta.env` cannot be read from
 * an injected script (Vite only fills it in for modules it transforms), and a page that reaches a
 * live service is the thing that actually breaks the suite, whatever the variable said.
 */
export default async function globalSetup(config: {
  projects: { use: { baseURL?: string } }[];
}): Promise<void> {
  const baseURL = config.projects[0]?.use?.baseURL;
  if (!baseURL) return; // nothing to check against; the run will fail on its own terms

  const origin = new URL(baseURL).origin;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const foreign = new Set<string>();
    page.on('request', (request) => {
      const url = request.url();
      if (!url.startsWith('http')) return; // data:, blob:, chrome-extension: — not the network
      if (new URL(url).origin !== origin) foreign.add(url);
    });
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    // Boot, first render, and the identity/mind pulses that follow it.
    await page.waitForTimeout(4_000);

    if (foreign.size > 0) {
      const seen = [...foreign].slice(0, 5).join('\n  ');
      throw new Error(
        `The app at ${baseURL} reached outside its own origin during boot:\n  ${seen}\n\n` +
          'This suite is hermetic — it asserts that no console errors occur, and a page wired to ' +
          'a real gateway or a real Supabase project will log CORS refusals and 4xx bodies that ' +
          "have nothing to do with the code under test. Something other than this config's own " +
          'webServer is listening on that port; `reuseExistingServer` attached to it. Most likely ' +
          'a `bun run dev` (its .env.development points at the brain on 8081, and .env.local ' +
          'carries real keys).\n\n' +
          'Fix: stop that dev server, or give this run a port of its own with ' +
          'WOBO_E2E_PORT=<free port> bunx playwright test.',
      );
    }
  } finally {
    await browser.close();
  }
}
