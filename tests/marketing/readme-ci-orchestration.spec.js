/**
 * Test suite: CI Orchestration Status Documentation
 *
 * These tests validate that README.md includes clear explanations about:
 * 1. .github/workflows/e2e.yml presently runs only tests/marketing and tests/flows
 *    against staging - tests/app is NOT included because it requires a live backend + DB
 * 2. No other repo (backend, frontend-shell, react-app, next-app) currently sends the
 *    `staging-deployed` repository_dispatch event to this repo
 * 3. tests/app/auth.setup.ts seeds a fixture user directly into Postgres via E2E_DATABASE_URL,
 *    which must be kept in sync with the backend's actual DATABASE_URL (currently Supabase)
 */

import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const README_PATH = path.join(process.cwd(), 'README.md');

test.describe('CI Orchestration Status Documentation', () => {
  let readmeContent;

  test.beforeAll(() => {
    readmeContent = fs.readFileSync(README_PATH, 'utf-8');
  });

  test('should exist and contain "Wiring into other repos" section', () => {
    expect(readmeContent).toContain('Wiring into other repos');
  });

  test('should document that tests/app is NOT currently included in CI', () => {
    // Look for explicit mention that app project is not run in CI
    const wiringIndex = readmeContent.indexOf('## Wiring into other repos');
    const nextSectionIndex = readmeContent.indexOf('\n## ', wiringIndex + 1);
    const wiringSection = readmeContent.substring(
      wiringIndex,
      nextSectionIndex === -1 ? readmeContent.length : nextSectionIndex
    );

    expect(wiringSection).toMatch(/tests\/app\s+.*NOT\s+included|NOT\s+.*tests\/app|app.*not.*included|tests\/app.*is.*not/i);
  });

  test('should explain that tests/app requires a live backend + DB to run in CI', () => {
    const wiringIndex = readmeContent.indexOf('## Wiring into other repos');
    const nextSectionIndex = readmeContent.indexOf('\n## ', wiringIndex + 1);
    const wiringSection = readmeContent.substring(
      wiringIndex,
      nextSectionIndex === -1 ? readmeContent.length : nextSectionIndex
    );

    expect(wiringSection).toMatch(/live\s+backend|requires.*backend|backend.*DB|database/i);
  });

  test('should mention that repository_dispatch staging-deployed is not currently wired up', () => {
    const wiringIndex = readmeContent.indexOf('## Wiring into other repos');
    const nextSectionIndex = readmeContent.indexOf('\n## ', wiringIndex + 1);
    const wiringSection = readmeContent.substring(
      wiringIndex,
      nextSectionIndex === -1 ? readmeContent.length : nextSectionIndex
    );

    // Check that it mentions the dispatch event exists but isn't invoked by upstream repos
    expect(wiringSection).toContain('staging-deployed');
    expect(wiringSection).toMatch(/no\s+other\s+repo|not\s+yet.*invoked|not.*wired.*up|currently.*not.*send|not.*currently|no.*upstream/i);
  });

  test('should document the E2E_DATABASE_URL coupling with backend DATABASE_URL', () => {
    const wiringIndex = readmeContent.indexOf('## Wiring into other repos');
    const nextSectionIndex = readmeContent.indexOf('\n## ', wiringIndex + 1);
    const wiringSection = readmeContent.substring(
      wiringIndex,
      nextSectionIndex === -1 ? readmeContent.length : nextSectionIndex
    );

    expect(wiringSection).toContain('E2E_DATABASE_URL');
    expect(wiringSection).toMatch(/must\s+.*sync|sync.*with|same.*as|kept.*in.*sync|backend.*database/i);
  });

  test('should call out the manual, easy-to-drift dependency between tests/app setup and backend database', () => {
    const wiringIndex = readmeContent.indexOf('## Wiring into other repos');
    const nextSectionIndex = readmeContent.indexOf('\n## ', wiringIndex + 1);
    const wiringSection = readmeContent.substring(
      wiringIndex,
      nextSectionIndex === -1 ? readmeContent.length : nextSectionIndex
    );

    expect(wiringSection).toMatch(/manual|drift|coupling|dependency|easy-to-drift/i);
  });

  test('should mention that tests/marketing and tests/flows DO run in CI', () => {
    const wiringIndex = readmeContent.indexOf('## Wiring into other repos');
    const nextSectionIndex = readmeContent.indexOf('\n## ', wiringIndex + 1);
    const wiringSection = readmeContent.substring(
      wiringIndex,
      nextSectionIndex === -1 ? readmeContent.length : nextSectionIndex
    );

    expect(wiringSection).toMatch(/tests\/marketing|tests\/flows/i);
  });

  test('should be placed near the existing Wiring into other repos section', () => {
    // The explanatory comment should be within the "Wiring into other repos" section
    const wiringIndex = readmeContent.indexOf('## Wiring into other repos');
    const nextSectionIndex = readmeContent.indexOf('\n## ', wiringIndex + 1);
    const wiringSection = readmeContent.substring(
      wiringIndex,
      nextSectionIndex === -1 ? readmeContent.length : nextSectionIndex
    );

    // Count relevant keywords to ensure substantial documentation is present
    const keywords = [
      'tests/marketing',
      'tests/flows',
      'tests/app',
      'backend',
      'E2E_DATABASE_URL',
      'staging-deployed',
      'repository_dispatch'
    ];

    const matchCount = keywords.filter(keyword => wiringSection.includes(keyword)).length;
    expect(matchCount).toBeGreaterThanOrEqual(4); // At least half should be mentioned
  });
});
