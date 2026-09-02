import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config for the Wobo journey suite. One browser (chromium), one dev server
 * (vite) on a dedicated strict port so it never collides with a fleet agent's server. Tests are
 * serial per-file and the whole run is single-worker: the journey mutates localStorage and shared
 * app state, and flakiness from parallel animation timing is not worth the speed.
 */

const PORT = 5199;

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  // CI also emits an HTML report so the workflow can upload it as an artifact on failure.
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Hermetic: force the keyless mock provider, no gateway and NO account layer so the suite
    // never touches a network service (dev's .env sets LLM_MODE=live + a gateway URL, and
    // .env.local carries real Supabase keys). Turns fall to the deterministic classifier;
    // TTS/voice no-op without a gateway URL; blank Supabase vars make `sdk.account` absent, so
    // onboarding skips the mandatory sign-in beat and no auth request ever leaves the browser.
    command: [
      'VITE_LLM_MODE=mock',
      'VITE_GATEWAY_URL=',
      'VITE_DEV_AUTH=true',
      'VITE_PERSIST_MODE=local',
      'VITE_SUPABASE_URL=',
      'VITE_SUPABASE_ANON_KEY=',
      'VITE_SUPABASE_DEV_JWT=',
      `bunx vite --port ${PORT} --strictPort`,
    ].join(' '),
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
