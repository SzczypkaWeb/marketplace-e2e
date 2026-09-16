/**
 * Test suite for validating .nvmrc configuration file
 *
 * Ensures that:
 * 1. .nvmrc file exists at repo root
 * 2. Contains exactly "20" (matching Node version in CI workflows)
 * 3. Has no extra whitespace or content
 *
 * Run with: node tests/repo-config/nvmrc.test.js
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

const nvmrcPath = path.join(__dirname, '../../.nvmrc');

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
    toBe(expected) {
      if (value !== expected) {
        throw new Error(`Expected "${expected}", but got "${value}"`);
      }
    },
    toMatch(regex) {
      if (!regex.test(value)) {
        throw new Error(`Expected to match regex: ${regex}`);
      }
    },
    toBeTruthy() {
      if (!value) {
        throw new Error(`Expected truthy value, but got: ${value}`);
      }
    },
  };
}

// Tests
console.log(`${colors.blue}.nvmrc Configuration Validation${colors.reset}\n`);

test('.nvmrc should exist at repo root', () => {
  expect(fs.existsSync(nvmrcPath)).toBeTruthy();
});

test('.nvmrc should contain exactly "20"', () => {
  const content = fs.readFileSync(nvmrcPath, 'utf-8').trim();
  expect(content).toBe('20');
});

test('.nvmrc should have no extra whitespace', () => {
  const content = fs.readFileSync(nvmrcPath, 'utf-8');
  // .nvmrc files should be just the version, optionally with a trailing newline
  expect(content).toMatch(/^20\n?$/);
});

// Summary
console.log(
  `\n${colors.blue}Test Results:${colors.reset} ${colors.green}${passed} passed${colors.reset}, ${
    failed > 0 ? colors.red + failed + ' failed' + colors.reset : 'none failed'
  }`
);

if (failed > 0) {
  console.log(`\n${colors.red}Failed tests:${colors.reset}`);
  failedTests.forEach((name) => console.log(`  - ${name}`));
  process.exit(1);
}
