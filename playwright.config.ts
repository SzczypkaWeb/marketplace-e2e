import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

// Loads .env automatically (requires `dotenv` in devDependencies) — no need
// to manually `set -a; source .env; set +a` before every run anymore.
//
// The Next repo (marketing) and the MF app (frontend-shell + react-app) are
// separate, so this config does NOT start them itself (no `webServer`
// field). The servers must already be running at these addresses — started
// manually in separate terminals locally, or (in CI) as a deployed staging
// environment.
//
// "MF app" = frontend-shell (host, port 8080) + react-app (MF remote, port
// 8081) + backend (port 3000, real auth + database). tests/app/auth.spec.ts
// needs all three — see README.md.
const MARKETING_URL = process.env.MARKETING_URL ?? 'http://localhost:3000';
const APP_URL = process.env.APP_URL ?? 'http://localhost:8080';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'html',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'marketing',
      testDir: './tests/marketing',
      use: { ...devices['Desktop Chrome'], baseURL: MARKETING_URL },
    },
    // Seeds/cleans the fixture user in the backend's Postgres - scoped as
    // Playwright "setup"/"teardown" projects (not top-level globalSetup/
    // globalTeardown, which used to run before EVERY invocation regardless
    // of --project, so a marketing-only run needed Postgres reachable too).
    // Only `app` depends on these, so `marketing`/`flows` runs never need
    // E2E_DATABASE_URL set - this is what makes it safe to wire `app` into
    // CI without breaking runs that don't have DB access (see
    // .github/workflows/e2e.yml).
    {
      name: 'app-setup',
      testDir: './tests/app',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'app-teardown',
      testDir: './tests/app',
      testMatch: /auth\.teardown\.ts/,
    },
    {
      name: 'app',
      testDir: './tests/app',
      testMatch: /auth\.spec\.ts/,
      dependencies: ['app-setup'],
      teardown: 'app-teardown',
      use: { ...devices['Desktop Chrome'], baseURL: APP_URL },
    },
    {
      name: 'flows',
      // Cross-domain tests — deliberately without a baseURL, navigation uses
      // full URLs (see tests/flows/full-journey.spec.ts).
      testDir: './tests/flows',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
