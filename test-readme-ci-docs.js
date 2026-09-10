/**
 * Test suite for verifying CI orchestration documentation in README.md
 *
 * These tests ensure that the README contains clear documentation about:
 * 1. Why tests/app is excluded from CI (requires live backend + database)
 * 2. Current state of repository_dispatch wiring (no upstream repos send it yet)
 *
 * Run with: node test-readme-ci-docs.js
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

const readmePath = path.join(__dirname, 'README.md');
const readmeContent = fs.readFileSync(readmePath, 'utf-8');

let passed = 0;
let failed = 0;
const failedTests = [];

function test(name, fn) {
  try {
    fn();
    console.log(`${colors.green}✓${colors.reset} ${name}`);
    passed++;
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} ${name}`);
    console.log(`  ${colors.red}${error.message}${colors.reset}`);
    failed++;
    failedTests.push(name);
  }
}

function expect(value) {
  return {
    toContain(substr) {
      if (!value.includes(substr)) {
        throw new Error(`Expected README to contain: "${substr}"`);
      }
    },
    toMatch(regex) {
      if (!regex.test(value)) {
        throw new Error(`Expected README to match regex: ${regex}`);
      }
    },
  };
}

// Tests
console.log(
  `${colors.blue}README CI Orchestration Documentation${colors.reset}\n`
);

test('should have a "Wiring into other repos" section', () => {
  expect(readmeContent).toContain('## Wiring into other repos');
});

test('should document that CI currently only runs marketing and flows suites', () => {
  // The README should clearly state which projects run in CI
  expect(readmeContent).toMatch(
    /tests\/marketing|marketing.*\+.*flows|CI.*currently.*runs.*marketing.*flows|workflow.*always.*runs.*marketing.*\+.*flows/i
  );
});

test('should explain why tests/app is excluded from CI', () => {
  // Must mention tests/app exclusion
  expect(readmeContent).toMatch(/tests\/app.*(?:excluded|not.*run|intentionally)/i);
  // Must explain the reason: requires live backend + database
  expect(readmeContent).toMatch(
    /(?:live\s+backend|requires.*backend|real\s+backend|requires.*database|backend.*database).*\+.*(?:database|DB|Postgres)/i
  );
});

test('should mention E2E_DATABASE_URL as the reason for app exclusion', () => {
  // The documentation should reference the database requirement
  expect(readmeContent).toMatch(
    /E2E_DATABASE_URL.*(?:Supabase|database|Postgres|app\s+project)/i
  );
});

test('should clarify that no upstream repos currently send repository_dispatch', () => {
  // Must state that the trigger is wired but not used
  expect(readmeContent).toMatch(
    /(?:no\s+other\s+repo|nothing\s+upstream|currently.*sends|no.*dispatches|no.*sends.*dispatch)/i
  );
  expect(readmeContent).toMatch(/repository_dispatch/);
});

test('should document current triggering methods', () => {
  // Should mention workflow_dispatch and/or nightly cron as current triggers
  expect(readmeContent).toMatch(/workflow_dispatch/);
  expect(readmeContent).toMatch(/nightly|cron|schedule/i);
});

test('should have a clearly marked subsection (like "Current status" or "Known gaps")', () => {
  // Look for a subsection that groups CI status information
  expect(readmeContent).toMatch(
    /### .*(?:Current|Known|status|gaps|limitations|orchestration)/i
  );
});

test('should mention that the dispatch mechanism is one-sided or unused', () => {
  // Clarify that the dispatch mechanism exists but is unused
  expect(readmeContent).toMatch(
    /(?:one-sided|one-way|trigger.*exists.*not.*used|wired.*not|no.*sends|no.*fires|nothing.*sends|upstream.*sends)/i
  );
});

test('should reference setup/teardown requirements for app', () => {
  // Clarify the technical reason for app exclusion
  expect(readmeContent).toMatch(/(?:global-setup|auth\.setup|seeds.*fixture|fixture\s+user)/i);
});

// Summary
console.log(
  `\n${colors.blue}Test Results:${colors.reset} ${colors.green}${passed} passed${colors.reset}, ${
    failed > 0 ? colors.red + failed + ' failed' + colors.reset : 'none failed'
  }`
);

if (failed > 0) {
  console.log(
    `\n${colors.red}Failed tests:${colors.reset}`
  );
  failedTests.forEach((name) => console.log(`  - ${name}`));
  process.exit(1);
}
