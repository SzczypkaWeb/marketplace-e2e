import { test, expect } from '@playwright/test';
import { TEST_USER_EMAIL, TEST_USER_PASSWORD, API_BASE_URL } from './test-user';

// Happy-path e2e coverage of the auth flow guarding frontend-shell (see
// src/AppShell.tsx in that repo): a logged-out visitor must only ever see
// LoginScreen, never App's protected content; logging in reveals the
// authenticated shell; logging out returns to LoginScreen and stops the
// protected /users fetch.
//
// Requires the backend (http://localhost:3000, or whatever API_URL points
// at) running separately — see README.md for the full multi-app setup,
// including how the email/password fixture user this test logs in as gets
// seeded (tests/app/global-setup.ts).
test.describe('Auth flow', () => {
  test('logged-out visitor sees LoginScreen, logs in, and logs out', async ({ page }) => {
    // Track every request to the protected GET /users endpoint so we can
    // assert, at the end, that logging out stops the app from making it.
    const usersRequestUrls: string[] = [];
    page.on('request', (request) => {
      if (request.url() === `${API_BASE_URL}/users`) {
        usersRequestUrls.push(request.url());
      }
    });

    // 1. Logged out -> LoginScreen only, never the App's protected content.
    await page.goto('/');
    const emailField = page.getByLabel(/email/i);
    const passwordField = page.getByLabel(/password/i);
    await expect(emailField).toBeVisible();
    await expect(passwordField).toBeVisible();
    await expect(page.getByText(/shell działa/i)).toHaveCount(0);

    // Google sign-in: only verify the button is present and points at the
    // backend's OAuth endpoint. The actual Google redirect/consent flow needs
    // a real external provider and isn't exercised here.
    const googleButton = page.getByRole('button', {
      name: /sign in with google|zaloguj przez google/i,
    });
    await expect(googleButton).toBeVisible();
    await expect(googleButton).toHaveAttribute('data-href', `${API_BASE_URL}/auth/google`);

    // 2. Log in via the email/password form, using the seeded test user.
    await emailField.fill(TEST_USER_EMAIL);
    await passwordField.fill(TEST_USER_PASSWORD);
    await page.getByRole('button', { name: /^log in$/i }).click();

    // 3. Authenticated view: Navbar shows the user's email + Logout, and the
    // shell's own (protected) content renders.
    await expect(page.getByRole('navigation').getByText(TEST_USER_EMAIL)).toBeVisible();
    const logoutButton = page.getByRole('button', { name: /logout/i });
    await expect(logoutButton).toBeVisible();
    await expect(page.getByText(/shell działa/i)).toBeVisible();
    await expect
      .poll(() => usersRequestUrls.length, {
        message: 'expected GET /users to have been requested once logged in',
      })
      .toBeGreaterThan(0);
    const usersRequestCountAfterLogin = usersRequestUrls.length;

    // 4. Log out -> back to LoginScreen, and no further protected fetch.
    await logoutButton.click();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByText(/shell działa/i)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /logout/i })).toHaveCount(0);

    // Give any stray request a moment to fire before asserting none did.
    await page.waitForTimeout(500);
    expect(usersRequestUrls.length).toBe(usersRequestCountAfterLogin);
  });
});
