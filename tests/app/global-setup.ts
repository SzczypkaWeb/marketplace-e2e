// DEPRECATED — replaced by auth.setup.ts (Playwright "setup project", see
// playwright.config.ts). No longer referenced by playwright.config.ts's
// `globalSetup` (removed - that option ran before EVERY invocation
// regardless of `--project`, which is exactly what the setup-project split
// fixes). Could not delete this file directly (sandbox filesystem denied the
// unlink) - please `git rm tests/app/global-setup.ts` manually.
export {};
