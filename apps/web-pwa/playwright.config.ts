import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config for the Classess Learner journey suite. One browser (chromium), one dev server
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
  reporter: [['list']],
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
    // Hermetic: force the keyless mock provider and no gateway so the suite never depends on a
    // running service (dev's .env sets LLM_MODE=live + a gateway URL). Turns fall to the
    // deterministic classifier; TTS/voice no-op without a gateway URL.
    command: `VITE_LLM_MODE=mock VITE_GATEWAY_URL= bunx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
