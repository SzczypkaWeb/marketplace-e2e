/**
 * Test suite for verifying repository configuration integrity
 *
 * These tests ensure that:
 * 1. No orphaned pnpm configuration files exist (pnpm-lock.yaml, pnpm-workspace.yaml)
 * 2. The repository only uses npm as the package manager
 * 3. package-lock.json exists for npm
 *
 * Run with: node tests/repo-config.test.js
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

const repoRoot = path.join(__dirname, '..');

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

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function expectFileNotToExist(filePath, fileName) {
  if (fileExists(filePath)) {
    throw new Error(`File should not exist: ${fileName}`);
  }
}

function expectFileToExist(filePath, fileName) {
  if (!fileExists(filePath)) {
    throw new Error(`File should exist: ${fileName}`);
  }
}

// Tests
console.log(
  `${colors.blue}Repository Configuration Tests${colors.reset}\n`
);

test('should not have pnpm-lock.yaml in repository root', () => {
  expectFileNotToExist(path.join(repoRoot, 'pnpm-lock.yaml'), 'pnpm-lock.yaml');
});

test('should not have pnpm-workspace.yaml in repository root', () => {
  expectFileNotToExist(path.join(repoRoot, 'pnpm-workspace.yaml'), 'pnpm-workspace.yaml');
});

test('should have package.json for npm package management', () => {
  expectFileToExist(path.join(repoRoot, 'package.json'), 'package.json');
});

test('should have package-lock.json for npm lock file', () => {
  expectFileToExist(path.join(repoRoot, 'package-lock.json'), 'package-lock.json');
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
