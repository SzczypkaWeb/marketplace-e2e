// Documentation contract test for README.md's CI orchestration note.
//
// This is NOT a Playwright test - it doesn't touch tests/marketing,
// tests/app, or tests/flows, and isn't part of any Playwright project (see
// playwright.config.ts). It's a plain Node script that asserts README.md
// contains an explanatory note - placed near the "Wiring into other repos'
// CI" section - clarifying the CURRENT orchestration state of
// .github/workflows/e2e.yml, so future readers don't assume it's fully
// wired up end-to-end. Run it with `npm run test:docs` or
// `node test-readme-ci-orchestration.js`.
//
// The four things this note must cover (see task spec):
//   1. The workflow's triggers: workflow_dispatch, repository_dispatch
//      (type `staging-deployed`), and a nightly cron.
//   2. As of now, CI only runs tests/marketing + tests/flows against
//      staging - tests/app is intentionally excluded because it needs a
//      live backend + database that isn't provisioned in this pipeline yet.
//   3. No other repo in the org currently emits the `staging-deployed`
//      repository_dispatch event - the trigger is wired but unused until a
//      deploying repo's workflow sends it (e.g. via
//      `gh api repos/:owner/:repo/dispatches` or the
//      `peter-evans/repository-dispatch` action).
//   4. If/when tests/app is added to CI: the fixture-user seeding script
//      writes directly to Postgres via `E2E_DATABASE_URL`, which must point
//      at the same database as the backend's live `DATABASE_URL` (currently
//      Supabase, not a local/ephemeral instance) - so enabling tests/app in
//      CI needs a working `E2E_DATABASE_URL` secret AND a reachable
//      `APP_URL` for a deployed frontend-shell instance.

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const readmePath = path.join(__dirname, 'README.md');
const readme = fs.readFileSync(readmePath, 'utf8');

function assertContains(haystack, needle, message) {
  assert.ok(haystack.includes(needle), message ?? `Expected README.md to contain: ${needle}`);
}

// --- Placement -------------------------------------------------------------
// The note must live at/after the "## CI" heading and at/before the
// "## Cleanup in the frontend-shell repo" heading, i.e. in the same
// neighbourhood as "## Wiring into other repos' CI" - not buried somewhere
// unrelated (e.g. the "Structure" or "Running locally" sections up top).
const ciHeadingIndex = readme.indexOf('## CI');
const wiringHeadingIndex = readme.indexOf("## Wiring into other repos' CI");
const cleanupHeadingIndex = readme.indexOf('## Cleanup in the frontend-shell repo');

assert.ok(ciHeadingIndex !== -1, 'README.md must have a "## CI" section');
assert.ok(wiringHeadingIndex !== -1, 'README.md must have a "## Wiring into other repos\' CI" section');
assert.ok(cleanupHeadingIndex !== -1, 'README.md must have a "## Cleanup in the frontend-shell repo" section');
assert.ok(
  ciHeadingIndex < wiringHeadingIndex && wiringHeadingIndex < cleanupHeadingIndex,
  'Expected the section order to be: CI -> Wiring into other repos\' CI -> Cleanup',
);

// A dedicated note/callout section, somewhere between "## CI" and
// "## Cleanup in the frontend-shell repo" (i.e. covering the neighbourhood
// of "Wiring into other repos' CI").
const orchestrationNoteMatch = readme.match(
  /##+ .*(orchestration status|current state|not (?:yet )?fully wired)[^\n]*/i,
);
assert.ok(
  orchestrationNoteMatch,
  'Expected a heading/callout near "Wiring into other repos\' CI" clarifying the current orchestration status',
);
const noteIndex = readme.indexOf(orchestrationNoteMatch[0]);
assert.ok(
  noteIndex >= ciHeadingIndex && noteIndex <= cleanupHeadingIndex,
  'The orchestration-status note must sit between "## CI" and "## Cleanup in the frontend-shell repo"',
);

// Scope the rest of the assertions to the note itself, up to the next
// section break, so this test can't pass just because some other part of
// the README happens to mention these words.
const noteSection = readme.slice(noteIndex, cleanupHeadingIndex);

// --- (1) Triggers ------------------------------------------------------
assertContains(noteSection, 'workflow_dispatch', 'Note must mention the workflow_dispatch trigger');
assertContains(noteSection, 'repository_dispatch', 'Note must mention the repository_dispatch trigger');
assertContains(noteSection, 'staging-deployed', 'Note must mention the `staging-deployed` event type');
assert.ok(
  /nightly|cron/i.test(noteSection),
  'Note must mention the nightly cron trigger',
);

// --- (2) Current CI scope: marketing + flows only, app excluded --------
assertContains(noteSection, 'tests/marketing', 'Note must mention tests/marketing');
assertContains(noteSection, 'tests/flows', 'Note must mention tests/flows');
assertContains(noteSection, 'tests/app', 'Note must mention tests/app');
assert.ok(
  /staging/i.test(noteSection),
  'Note must mention that the currently-run suites target staging',
);
assert.ok(
  /(excluded|not (?:yet )?(?:included|run|wired))/i.test(noteSection),
  'Note must state that tests/app is intentionally excluded / not yet run in CI',
);
assert.ok(
  /(live backend|database|db)/i.test(noteSection),
  'Note must explain tests/app needs a live backend + database',
);

// --- (3) No repo emits staging-deployed yet -----------------------------
assert.ok(
  /no other repo/i.test(noteSection),
  'Note must state that no other repo in the org emits `staging-deployed` yet',
);
assert.ok(
  /(dispatch trigger is present but unused|unused|dormant)/i.test(noteSection),
  'Note must state the dispatch trigger exists but is currently unused',
);
assert.ok(
  /gh api repos/i.test(noteSection) || noteSection.includes('dispatches'),
  'Note must give a concrete example of sending the dispatch (gh api repos/:owner/:repo/dispatches)',
);
assertContains(
  noteSection,
  'peter-evans/repository-dispatch',
  'Note must mention the peter-evans/repository-dispatch action as an alternative',
);

// --- (4) tests/app in CI would need E2E_DATABASE_URL + APP_URL ----------
assert.ok(
  /(global-setup\.ts|auth\.setup\.ts)/.test(noteSection),
  'Note must reference the fixture-seeding setup script',
);
assertContains(noteSection, 'E2E_DATABASE_URL', 'Note must mention the E2E_DATABASE_URL env var');
assertContains(noteSection, 'DATABASE_URL', "Note must mention matching the backend's DATABASE_URL");
assertContains(noteSection, 'Supabase', 'Note must mention Supabase (not local/ephemeral Postgres)');
assertContains(noteSection, 'APP_URL', 'Note must mention a reachable APP_URL for a deployed frontend-shell instance');
assert.ok(
  /secret/i.test(noteSection),
  'Note must mention supplying E2E_DATABASE_URL as a working secret',
);

console.log('OK - README.md documents the current CI orchestration status near "Wiring into other repos\' CI".');
