import { defineConfig, devices } from '@playwright/test';

// Repozytoria Next (marketing) i MF app (frontend-shell + react-app) są
// osobne, więc ten config NIE odpala ich sam (brak pola `webServer`).
// Serwery muszą już działać pod tymi adresami — lokalnie uruchomione ręcznie
// w osobnych terminalach, albo (w CI) jako wdrożone środowisko staging.
//
// "MF app" = frontend-shell (host, port 8080) + react-app (MF remote, port
// 8081) + backend (port 3000, prawdziwe auth + baza). tests/app/auth.spec.ts
// wymaga wszystkich trzech — patrz README.md.
const MARKETING_URL = process.env.MARKETING_URL ?? 'http://localhost:3000';
const APP_URL = process.env.APP_URL ?? 'http://localhost:8080';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'html',
  // Siewa/czyści fixture usera w Postgresie backendu przed/po testem auth
  // (tests/app/auth.spec.ts). Uwaga: to top-level opcja Playwrighta — leci
  // przy KAŻDYM `playwright test`, nawet `--project=marketing`, więc
  // uruchomienie samych testów marketingowych i tak wymaga dostępnego
  // Postgresa. Patrz komentarz w tests/app/global-setup.ts.
  globalSetup: './tests/app/global-setup.ts',
  globalTeardown: './tests/app/global-teardown.ts',
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
    {
      name: 'app',
      testDir: './tests/app',
      use: { ...devices['Desktop Chrome'], baseURL: APP_URL },
    },
    {
      name: 'flows',
      // Testy przechodzące między domenami — celowo bez baseURL,
      // nawigacja pełnymi URL-ami (patrz tests/flows/full-journey.spec.ts).
      testDir: './tests/flows',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
