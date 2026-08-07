// Shared fixture constants for the e2e auth flow test (tests/app/auth.spec.ts).
// Overridable via env vars so a different machine/CI run can point at a
// different database or use different credentials without editing this file.

/** Email/password of the fixture user seeded by global-setup.ts. */
export const TEST_USER_EMAIL = process.env.E2E_TEST_EMAIL ?? 'e2e-test-user@example.com';
export const TEST_USER_PASSWORD = process.env.E2E_TEST_PASSWORD ?? 'E2eTestPassword123!';

// Postgres connection used to seed/clean up the fixture user directly (see
// auth.setup.ts / auth.teardown.ts) - the backend has no public register
// endpoint (only POST /auth/login is exposed), so a real row has to exist
// before this test can log in.
//
// No local fallback on purpose: the backend does NOT talk to a local
// docker-compose Postgres (that assumption was stale, left over from before
// the backend moved to Supabase — see backend/.env's DATABASE_URL). Silently
// falling back to a guessed local connection string would seed the wrong
// database without any error, which is exactly what happened once already.
// Copy DATABASE_URL from backend/.env into e2e-tests/.env as E2E_DATABASE_URL.
if (!process.env.E2E_DATABASE_URL) {
  throw new Error(
    '[e2e] E2E_DATABASE_URL is not set. Copy the DATABASE_URL value from backend/.env ' +
      'into e2e-tests/.env as E2E_DATABASE_URL — the backend connects to Supabase, not a ' +
      'local Postgres, so there is no safe default to fall back to.',
  );
}
export const DATABASE_URL = process.env.E2E_DATABASE_URL;

// Backend base URL. Mirrors frontend-shell's own API_URL default so the
// assertion about the Google OAuth button's href stays correct even if
// API_URL is overridden when starting the dev server.
export const API_BASE_URL = process.env.API_URL ?? 'http://localhost:3000';
