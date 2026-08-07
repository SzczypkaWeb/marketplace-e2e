import { test, expect } from '@playwright/test';

const MARKETING_URL = process.env.MARKETING_URL ?? 'http://localhost:3000';
const APP_URL = process.env.APP_URL ?? 'http://localhost:8080';

test('gość: SSR listing -> zapytanie -> redirect do MF app -> rejestracja -> zlecenie', async ({ page }) => {
  await page.goto(`${MARKETING_URL}/uslugi/hydraulik/warszawa`);

  await page.getByRole('button', { name: /wyślij zapytanie|znajdź fachowca/i }).click();

  await page.waitForURL(new RegExp(`${APP_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/nowe-zlecenie.*`));
  await expect(page).toHaveURL(/kategoria=hydraulik/);
  await expect(page).toHaveURL(/lat=/);

});
