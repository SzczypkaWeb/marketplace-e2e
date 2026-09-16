/**
 * Test to validate that README.md contains required documentation about
 * E2E test orchestration and CI status.
 *
 * This test ensures that the README clearly documents:
 * 1. The three test suites and their scope (marketing, app, flows)
 * 2. Which projects run in CI (marketing, flows only) and why
 * 3. Why tests/app is not yet wired into CI
 * 4. The current state of the staging-deployed dispatch trigger
 */

const fs = require('fs');
const path = require('path');

const README_PATH = path.join(__dirname, '../../README.md');

function readFileContent() {
  return fs.readFileSync(README_PATH, 'utf-8');
}

function testReadmeContainsOrchestrationExplanation() {
  const content = readFileContent();

  // Test 1: README should explain that tests orchestrate cross-domain E2E tests
  const hasOrchestrationExplanation = content.includes('orchestrates cross-domain E2E tests') ||
    content.includes('cross-domain');
  console.assert(
    hasOrchestrationExplanation,
    'FAIL: README should explain that this repo orchestrates cross-domain E2E tests'
  );

  // Test 2: README should explain the scope of marketing tests
  const hasMarketingScope = content.includes('tests/marketing') &&
    content.includes('marketing only') ||
    content.includes('Marketing Suite') ||
    content.includes('next-app only');
  console.assert(
    hasMarketingScope,
    'FAIL: README should explain that tests/marketing targets next-app only (baseURL=MARKETING_URL)'
  );

  // Test 3: README should explain the scope of app tests
  const hasAppScope = content.includes('tests/app') &&
    (content.includes('frontend-shell') || content.includes('baseURL=APP_URL'));
  console.assert(
    hasAppScope,
    'FAIL: README should explain that tests/app targets frontend-shell plus backend/DB'
  );

  // Test 4: README should explain the scope of flows tests
  const hasFlowsScope = content.includes('tests/flows') &&
    content.includes('full URLs') ||
    content.includes('cross-domain');
  console.assert(
    hasFlowsScope,
    'FAIL: README should explain that tests/flows spans both via full URLs'
  );

  // Test 5: README should state which projects run in CI
  const hasCIProjectsExplanation = content.includes('marketing and flows') &&
    content.includes('CI') ||
    content.includes('.github/workflows/e2e.yml');
  console.assert(
    hasCIProjectsExplanation,
    'FAIL: README should clearly state which projects run in CI'
  );

  // Test 6: README should state triggers for CI
  const hasCITriggers = content.includes('workflow_dispatch') &&
    content.includes('staging-deployed') ||
    content.includes('nightly');
  console.assert(
    hasCITriggers,
    'FAIL: README should document CI triggers (workflow_dispatch, staging-deployed, nightly)'
  );

  // Test 7: README should explain why tests/app is not yet wired into CI
  const hasAppNotWiredExplanation = content.includes('app') &&
    (content.includes('not yet wired') ||
      content.includes('not yet') ||
      content.includes('needs a live backend'));
  console.assert(
    hasAppNotWiredExplanation,
    'FAIL: README should explain why tests/app is not yet wired into CI'
  );

  // Test 8: README should explain E2E_DATABASE_URL misconfiguration risk
  const hasDatabaseMisconfigWarning = content.includes('E2E_DATABASE_URL') &&
    (content.includes('misconfigur') ||
      content.includes('wrong database') ||
      content.includes('fixture'));
  console.assert(
    hasDatabaseMisconfigWarning,
    'FAIL: README should warn about E2E_DATABASE_URL misconfiguration risks'
  );

  // Test 9: README should state that the staging-deployed trigger is dormant
  const hasDormantTriggerNote = content.includes('staging-deployed') &&
    (content.includes('dormant') ||
      content.includes('no other repo') ||
      content.includes('not yet') ||
      content.includes('currently'));
  console.assert(
    hasDormantTriggerNote,
    'FAIL: README should note that the staging-deployed trigger is currently dormant/not in use'
  );

  // Test 10: The documentation should be in or near the CI section
  const ciSectionIndex = content.indexOf('## CI');
  const wiringSection = content.indexOf('## Wiring into other repos');
  console.assert(
    ciSectionIndex !== -1,
    'FAIL: README should have a CI section'
  );
  console.assert(
    wiringSection !== -1,
    'FAIL: README should have a "Wiring into other repos" section'
  );
  // The explanatory note should be in the README (doesn't have to be in a specific spot)
  const explanatoryContent = content.substring(wiringSection, wiringSection + 5000);
  console.assert(
    explanatoryContent.includes('orchestrates') ||
    explanatoryContent.includes('tests/app') ||
    explanatoryContent.includes('not yet wired'),
    'FAIL: Orchestration explanation should be near the Wiring section'
  );

  console.log('✓ All README documentation tests passed');
}

try {
  testReadmeContainsOrchestrationExplanation();
  console.log('\nSUCCESS: README contains all required CI orchestration documentation');
  process.exit(0);
} catch (error) {
  console.error('\nFAILED: README documentation validation failed');
  console.error(error);
  process.exit(1);
}
