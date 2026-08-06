import { test, expect } from '@playwright/test';

// Ten projekt celowo nie ma baseURL — test przechodzi między domenami
// (Next -> MF app), więc nawigujemy pełnymi URL-ami. Patrz plan-wdrozenia-marketplace.md pkt 9.
const MARKETING_URL = process.env.MARKETING_URL ?? 'http://localhost:3000';
const APP_URL = process.env.APP_URL ?? 'http://localhost:3001';

test('gość: SSR listing -> zapytanie -> redirect do MF app -> rejestracja -> zlecenie', async ({ page }) => {
  await page.goto(`${MARKETING_URL}/uslugi/hydraulik/warszawa`);

  await page.getByRole('button', { name: /wyślij zapytanie|znajdź fachowca/i }).click();

  await page.waitForURL(new RegExp(`${APP_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/nowe-zlecenie.*`));
  await expect(page).toHaveURL(/kategoria=hydraulik/);
  await expect(page).toHaveURL(/lat=/);

  // TODO: dalszy ciąg ścieżki — rejestracja/login w MF app, utworzenie zlecenia,
  // weryfikacja że kategoria/lokalizacja z query params zostały zachowane w formularzu.

  // UWAGA: to NIE testuje współdzielenia cookie sesji (Domain=.domena.pl) —
  // na localhost to dwa różne originy (różne porty), nie subdomeny.
  // Asercję na cookie rób tylko w wariancie CI odpalanym na staging
  // z prawdziwymi subdomenami (patrz .github/workflows/e2e.yml).
});
