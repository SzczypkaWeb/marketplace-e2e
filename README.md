# marketplace-e2e

A separate repo with Playwright tests for the whole marketplace. Doesn't
belong to the Next repo (`domena.pl`) or the MF app repo — because some tests
cross several apps at once.

"MF app" is actually three processes: `frontend-shell` (host, port 8080),
`react-app` (MF remote, port 8081), and `backend` (port 3000, real auth +
Postgres database).

## Structure

```
tests/
  marketing/   # Next-only tests (baseURL = MARKETING_URL)
  app/         # frontend-shell-only tests (baseURL = APP_URL)
    auth.spec.ts        # login/logout through the real backend
    test-user.ts         # fixed fixture user, overridable via env vars
    auth.setup.ts         # Playwright "setup project" - seeds the fixture user in Postgres
    auth.teardown.ts      # Playwright "teardown project" - cleans up the fixture user after tests
  flows/       # cross-domain tests, full URLs, no baseURL
```

`auth.setup.ts`/`auth.teardown.ts` are scoped exclusively to the `app`
project (see `dependencies`/`teardown` in `playwright.config.ts`) -
`marketing` and `flows` never need `E2E_DATABASE_URL`/Postgres access, not
even indirectly. This is a change from the older version of this config
(top-level `globalSetup`/`globalTeardown`, which ran on EVERY run regardless
of `--project`) - and it's exactly what makes wiring `app` into CI (see the
CI section below) not break `marketing`/`flows` in contexts without database
access.

## Running locally

Four apps, four terminals:

```bash
# terminal 1 — next-app repo
pnpm dev            # http://localhost:3000 (marketing)

# terminal 2 — backend repo
pnpm start:dev       # http://localhost:3000 -> NOTE the port collision with next-app,
                      # see the "Port collision" section below

# terminal 3 — react-app repo
pnpm dev             # http://localhost:8081 (MF remote)

# terminal 4 — frontend-shell repo
pnpm dev             # http://localhost:8080 (MF host)
```

A fifth terminal for the tests themselves:

```bash
cd e2e-tests
cp .env.example .env
# In .env, set E2E_DATABASE_URL to EXACTLY the same value as DATABASE_URL in
# backend/.env (currently Supabase, not local Postgres — see the section below).
set -a; source .env; set +a   # exports the vars from .env into the shell (no dotenv in the config)
npm install                   # pg + argon2 are already in devDependencies (needed by auth.setup.ts)
npx playwright install --with-deps
npm test
```

Or a single project: `npm run test:marketing` / `npm run test:app` /
`npm run test:flows`. `test:app`/`--project=app` automatically pulls in
`app-setup` (dependency) and `app-teardown` (teardown) - no need to call them
separately. `test:marketing`/`test:flows` do NOT touch Postgres at all (see
"Structure" above).

`test:app` (i.e. `auth.spec.ts`) requires a running `backend` and the same
database backend actually uses — without that, `auth.setup.ts` either fails
(missing `E2E_DATABASE_URL`), or — worse — seeds a user into a database the
backend can't see at all (and login then fails with a confusing "Invalid
email or password").

## Database: Supabase, not local Postgres

The backend (at least the one I tested against) connects to a remote
database on Supabase (`*.pooler.supabase.com`), not the local Postgres
started via `docker-compose` — this was a wrong assumption carried over 1:1
from the original frontend-shell repo (from before the backend migrated to
GCP/Supabase). Before treating `E2E_DATABASE_URL` as "set and forget": this
is a real remote database — if it's shared with staging or with real data,
seeding a fixture user on every local test run might not be something you
want to do without thinking about it. Consider a dedicated Supabase
database/branch for dev/testing only, if one doesn't already exist.

## Test database: a second, separate Supabase project (dev/test)

Instead of local Postgres (`docker-compose`, considered earlier) or Supabase
Branching (paid — Pro plan + per-branch-hour, see below) - a second free
Supabase project (you get 2 on the free tier), dedicated solely to local
work/testing, isolated from real data.

**This does NOT eliminate the need to run `backend` locally** - you're still
testing through a real `POST /auth/login`, so `backend` still has to be
running. What changes is only which database it connects to - a safe, empty
test one instead of the shared/prod one. The "detect local database" idea
considered earlier (see this file's history) turned out to be unnecessary -
deliberately switching `DATABASE_URL`/`E2E_DATABASE_URL` to the second
project is simpler.

Why not Supabase Branching: it requires the Pro plan (branching is disabled
on the free tier) and assumes migrations in the Supabase CLI format
(`supabase/migrations/*.sql`) - here migrations run through
`prisma migrate deploy`, a different format/different runner. Not worth that
complexity at this portfolio-project stage.

Setup (once):

1. New project's Supabase dashboard → Project Settings → Database →
   Connection string → **direct connection (port 5432)**, not the pooler
   (6543) - locally it's one backend, one connection, the pooler isn't
   needed here and adds a gotcha with Prisma prepared statements
   (`pgbouncer=true` param).
2. In `backend/`, create `.env.test.local` (already in `.gitignore`, nothing
   leaks into the repo) with `DATABASE_URL=<connection string from step 1>` +
   the rest of the variables from `.env.example`.
3. Apply the schema to the empty database:
   `npx dotenv-cli -e .env.test.local -- npx prisma migrate deploy` (in
   `backend/`).

Day to day (local `app`/`flows` e2e):

```bash
# backend terminal - points at the test database instead of the default .env
cd backend
npx dotenv-cli -e .env.test.local -- npm run start:dev
```

In `e2e-tests/.env`, set `E2E_DATABASE_URL` to **exactly the same**
connection string as in `backend/.env.test.local` (see the warning in the
"Database: Supabase, not local Postgres" section above - different databases
= `auth.setup.ts` seeds a user where the backend can't see it).

## Port collision: next-app vs backend

Next.js's default port (`3000`) collides with the backend's default port. If
both repos actually try to start on 3000 locally, one of them needs a
different port (e.g. next-app on another port, with a matching
`MARKETING_URL` change in `.env`). Check how you currently have this
configured in next-app before starting both at once.

## Important: the session cookie isn't tested locally

The session cookie (eventually `Domain=.domena.pl`) on `localhost` is
different origins (different ports), not subdomains of the same domain — so
a local run of `tests/flows/` checks the functional path itself, but does
NOT confirm the session actually carries over between Next and the MF app.
Real verification only happens on a CI run against staging with real
subdomains.

## CI

The workflow (`.github/workflows/e2e.yml`) always runs `marketing` + `flows`
against staging. The `app` project (auth through a real backend + Postgres)
joins **conditionally** - only when the `E2E_DATABASE_URL` secret is
actually passed (either directly as a secret of this repo for
`workflow_dispatch`/`schedule`/`repository_dispatch`, or passed by the
caller on `workflow_call`, see the example below). Without it, the workflow
just skips `app` and runs as before - that's a safe fallback, not an error.

`backend/.github/workflows/deploy-gcp-staging.yml`, and the Azure workflows
in `react-app`/`frontend-shell`, now all call this workflow with `app_url`/
`api_url`/`E2E_DATABASE_URL` wired up (react-app and frontend-shell got their
own staging deploys - see `infra/RUNBOOK.md`). This doesn't run end-to-end
yet in practice, since none of the repo Variables/Secrets it depends on
(`FRONTEND_SHELL_STAGING_URL`, `BACKEND_STAGING_URL`,
`E2E_DATABASE_URL_STAGING`, etc. - full list in `infra/RUNBOOK.md` section 6)
are set anywhere yet — until then, `app` is safely skipped and
`marketing`/`flows` still run.

## Wiring into other repos' CI

> **CI Orchestration Status & Current Scope**
>
> This repo orchestrates cross-domain E2E tests across three suites: `tests/marketing` targets next-app only (baseURL=MARKETING_URL), `tests/app` targets frontend-shell plus a real backend/DB (baseURL=APP_URL), and `tests/flows` spans both via full URLs with no baseURL.
>
> `.github/workflows/e2e.yml` currently runs only the `marketing` and `flows` suites in CI against staging, triggered by `workflow_dispatch`, the `staging-deployed` repository_dispatch event, or a nightly cron. The `app` suite is not yet wired into CI because it requires a live backend and database in the CI environment; its `global-setup.ts` seeds a fixture user via `E2E_DATABASE_URL`, which **must match the backend repo's actual DATABASE_URL** (currently Supabase, not local Postgres) — misconfiguring this seeds the fixture into the wrong database, breaking the tests.
>
> **Note:** As of now, no other repo (backend, frontend-shell, react-app, next-app) actually sends the `staging-deployed` dispatch event yet, so this CI trigger is currently dormant until an upstream repo's deploy workflow is updated to send it.

Two ways - pick based on whether you need to know within the same CI run
whether e2e passed (e.g. to build a "promote to prod" job on top of it), or
just want to fire it "in the background".

### Preferred: workflow_call (gives you `needs.e2e.result`)

Call this workflow directly as a job in the workflow that deploys to
staging - it's the same CI run, so a later job can depend on the result:

```yaml
jobs:
  deploy-staging:
    # ... deploy to staging ...

  e2e:
    needs: deploy-staging
    uses: szczypkaweb/marketplace-e2e/.github/workflows/e2e.yml@main
    with:
      marketing_url: https://staging.domena.pl   # next-app only
      app_url: https://staging-app.domena.pl     # MF app only
      api_url: https://backend-staging-xxxxx.run.app  # app project only (auth.spec.ts)
    secrets:
      E2E_DATABASE_URL: ${{ secrets.E2E_DATABASE_URL_STAGING }}   # optional - without it the app project is skipped

  promote-to-prod:
    needs: e2e
    if: needs.e2e.result == 'success'
    runs-on: ubuntu-latest
    steps:
      - run: echo "open/merge the staging -> main PR here"
```

Doesn't need a PAT or a secret in the calling repo - `uses:` from a
public/same-org repo works without extra authorization (for a private repo:
`GITHUB_TOKEN` with the right `permissions` in the calling workflow is
enough, see the
[GitHub docs on reusable workflows](https://docs.github.com/en/actions/using-workflows/reusing-workflows)).

### Fallback: repository_dispatch (one-way, no feedback)

Add a step in the source repo's workflow that sends a `repository_dispatch`
to this repo (needs a PAT with `repo` scope, stored as the `E2E_REPO_PAT`
secret in the source repo):

```yaml
- name: Trigger e2e
  run: |
    curl -X POST \
      -H "Authorization: token ${{ secrets.E2E_REPO_PAT }}" \
      -H "Accept: application/vnd.github+json" \
      https://api.github.com/repos/szczypkaweb/marketplace-e2e/dispatches \
      -d '{"event_type":"staging-deployed"}'
```

This way gives NO feedback at all to the source repo (a separate, unrelated
CI run) - you can't build a promote-to-prod on top of it. Kept mainly for
backward compatibility / as an alternative when `workflow_call` doesn't fit
(e.g. triggering from a completely different event than a deploy).

Until either of the above is wired up, e2e still runs nightly at 5:00 UTC
(`schedule` in the workflow) and can be triggered manually
(`workflow_dispatch`).

## Cleanup in the frontend-shell repo

The auth tests came from the `frontend-shell` repo (`e2e/` there). After
migrating them here, in `frontend-shell`:

```bash
npm uninstall @playwright/test pg argon2
rm -rf e2e/ playwright.config.ts
```

and remove the `test:e2e` script from its `package.json` (if there was no
Playwright CI step wired up there, nothing else needs to change in that
repo's workflows).
/
