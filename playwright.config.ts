import { defineConfig, devices } from '@playwright/test';

// Repozytoria Next (marketing) i MF app (zalogowana część) są osobne,
// więc ten config NIE odpala ich sam (brak pola `webServer`).
// Oba serwery muszą już działać pod tymi adresami — lokalnie uruchomione
// ręcznie w dwóch terminalach, albo (w CI) jako wdrożone środowisko staging.
const MARKETING_URL = process.env.MARKETING_URL ?? 'http://localhost:3000';
const APP_URL = process.env.APP_URL ?? 'http://localhost:3001';

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
