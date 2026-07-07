import { defineConfig, devices } from '@playwright/test';

/**
 * Cross-browser × responsive matrix config. Three engines (chromium, webkit, firefox) run the
 * same walk at four widths × two themes. Hermetic: its own vite on a dedicated strict port with
 * the keyless mock provider, so no gateway and no collision with the dev server on 5173 or the
 * journey suite on 5199.
 */

const PORT = 5211;

export default defineConfig({
  testDir: '.',
  testMatch: 'x-browser.spec.ts',
  fullyParallel: true,
  workers: 4,
  forbidOnly: !!process.env.CI,
  retries: 1, // animation-timing flake on cold engines; a real break fails twice
  reporter: [['list']],
  timeout: 120_000,
  expect: { timeout: 12_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'off', // the spec takes its own, named per matrix cell
    actionTimeout: 15_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  webServer: {
    command: `VITE_LLM_MODE=mock VITE_GATEWAY_URL= bunx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
