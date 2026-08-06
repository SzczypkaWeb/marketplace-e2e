import { test, expect } from '@playwright/test';

// PLACEHOLDER: przenieś tu realne testy z repo MF app (dotychczasowy playwright.config.ts
// + folder tests/ w tamtym repo). Ten projekt ma już baseURL ustawiony na APP_URL,
// więc same page.goto('/login') itd. wystarczą — nie trzeba przepisywać URL-i.

test.fixme('placeholder — zastąp realnymi testami przeniesionymi z repo MF app', async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveURL(/login/);
});
