import { test, expect } from '@playwright/test';

// Ten projekt ma baseURL ustawiony na MARKETING_URL (patrz playwright.config.ts),
// więc page.goto('/') trafia w Next.js.

test('strona główna pokazuje wyszukiwarkę i wykrytą lokalizację', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByPlaceholder(/czego potrzebujesz/i)).toBeVisible();
  await expect(page.getByText(/wykryto automatycznie/i)).toBeVisible();
});

test('siatka kategorii jest klikalna', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('Hydraulik')).toBeVisible();
  await expect(page.getByText('Elektryk')).toBeVisible();
});
