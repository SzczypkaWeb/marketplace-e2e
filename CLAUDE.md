# e2e-tests

## Stack
Playwright. Separate repo on purpose — some tests cross several apps at
once, so it doesn't belong to any single app repo. "MF app" here means
three processes together: `frontend-shell` (host, :8080), `react-app` (MF
remote, :8081), `backend` (:3000, real auth + Postgres).

## Run / test
- Four terminals: `next-app` `pnpm dev` (:3000, marketing), `backend`
  `pnpm start:dev`, `react-app` `pnpm dev` (:8081), `frontend-shell`
  `pnpm dev` (:8080) — see README.md's "Port collision" section for the
  next-app/backend port clash.
- `cp .env.example .env`, set `E2E_DATABASE_URL` to exactly `backend`'s
  `DATABASE_URL` (Supabase, not local Postgres).
- `pnpm test` — full Playwright suite.
- `pnpm test:marketing` / `pnpm test:app` / `pnpm test:flows` — one project
  at a time (see Structure below).
- `pnpm lint` — repo-config checks (README/CI docs, `.nvmrc`), not code lint.
- No typecheck configured (no `tsconfig.json` — plain Playwright test files).

## Structure
- `tests/marketing/` — Next-only tests, `baseURL = MARKETING_URL`.
- `tests/app/` — `frontend-shell`-only tests, `baseURL = APP_URL`.
  `auth.setup.ts`/`auth.teardown.ts` seed/clean a fixture user in Postgres —
  scoped exclusively to this project (see `playwright.config.ts`
  `dependencies`/`teardown`), so `marketing`/`flows` never need DB access
  even indirectly.
- `tests/flows/` — cross-domain tests, full URLs, no `baseURL`.
- `tests/repo-config/` — meta-checks on this repo itself (`.nvmrc`, etc.).

## Conventions
- A test belongs in `flows/` only if it genuinely crosses domains (e.g.
  marketing SSR page -> redirect into the MF app); single-app behavior goes
  in `marketing/` or `app/`.
- `auth.setup.ts`'s fixture user is overridable via env vars — don't
  hardcode a different test user in a new spec.
- Conventional commits, everything in English.

## Never do
- Never point `E2E_DATABASE_URL` at anything other than the exact same
  database `backend` is using — these tests exercise real auth against real
  data, not a mock.
- Never add DB access (`E2E_DATABASE_URL`/Postgres) to a `marketing`- or
  `flows`-only spec — that's what lets `app` be excluded from CI contexts
  without database access without breaking the other two projects.
- Never commit `.env` or a real fixture-user password.
