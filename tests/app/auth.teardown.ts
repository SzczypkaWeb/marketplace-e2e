import { test as teardown } from '@playwright/test';
import { Client } from 'pg';
import { DATABASE_URL, TEST_USER_EMAIL } from './test-user';

// Playwright "teardown project" (see playwright.config.ts - the `app`
// project declares `teardown: 'app-teardown'`), runs after `app`'s tests
// finish. Removes the fixture user created in auth.setup.ts so the database
// this suite runs against doesn't accumulate stale test users across runs.
// Best-effort: the tests themselves have already finished by this point, so
// a cleanup failure here is logged rather than failing the whole run.
teardown('remove the fixture user', async () => {
  const client = new Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();
    await client.query('DELETE FROM "User" WHERE email = $1', [TEST_USER_EMAIL]);
  } catch (error) {
    console.warn(`[e2e] Failed to clean up the seeded test user: ${(error as Error).message}`);
  } finally {
    await client.end().catch(() => {});
  }
});
