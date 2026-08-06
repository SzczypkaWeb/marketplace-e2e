# marketplace-e2e

Osobne repo z testami Playwright dla całego marketplace'u. Nie należy ani do
repo Next (`domena.pl`), ani do repo MF app — bo część testów przechodzi przez
kilka apek naraz.

"MF app" to w rzeczywistości trzy procesy: `frontend-shell` (host, port
8080), `react-app` (MF remote, port 8081) i `backend` (port 3000, prawdziwe
auth + baza Postgres).

## Struktura

```
tests/
  marketing/   # testy tylko na Next (baseURL = MARKETING_URL)
  app/         # testy tylko na frontend-shell (baseURL = APP_URL)
    auth.spec.ts        # login/logout przez prawdziwy backend
    test-user.ts         # stałe fixture usera, nadpisywalne env-ami
    global-setup.ts       # sieje fixture usera bezpośrednio w Postgresie
    global-teardown.ts    # sprząta fixture usera po testach
  flows/       # testy przechodzące między domenami, pełne URL-e, bez baseURL
```

## Uruchamianie lokalnie

Cztery apki, cztery terminale:

```bash
# terminal 1 — repo next-app
pnpm dev            # http://localhost:3000 (marketing)

# terminal 2 — repo backend
pnpm start:dev       # http://localhost:3000 -> UWAGA na kolizję portu z next-app,
                      # patrz sekcja "Kolizja portów" niżej

# terminal 3 — repo react-app
pnpm dev             # http://localhost:8081 (MF remote)

# terminal 4 — repo frontend-shell
pnpm dev             # http://localhost:8080 (MF host)
```

Piąty terminal na same testy:

```bash
cd e2e-tests
cp .env.example .env
# W .env ustaw E2E_DATABASE_URL na DOKŁADNIE tę samą wartość co DATABASE_URL
# w backend/.env (obecnie Supabase, nie lokalny Postgres — patrz sekcja niżej).
set -a; source .env; set +a   # eksportuje zmienne z .env do shella (brak dotenv w configu)
npm install
npm install pg argon2 --save-dev   # potrzebne przez tests/app/global-setup.ts
npx playwright install --with-deps
npm test
```

Albo pojedynczy projekt: `npm run test:marketing` / `npm run test:app` / `npm run test:flows`.

`test:app` (czyli `auth.spec.ts`) wymaga działającego `backend` i tej samej
bazy co backend faktycznie używa — bez tego `global-setup.ts` albo wywali się
(brak `E2E_DATABASE_URL`), albo — gorzej — wsieje usera do bazy, której
backend w ogóle nie widzi (i login się wywali z mylącym "Invalid email or
password").

## Baza: Supabase, nie lokalny Postgres

Backend (przynajmniej ten, z którym testowałem) łączy się ze zdalną bazą na
Supabase (`*.pooler.supabase.com`), a nie z lokalnym Postgresem uruchamianym
przez `docker-compose` — to była błędna założenie przeniesione 1:1 z
oryginalnego repo frontend-shell (sprzed migracji backendu na GCP/Supabase).
Zanim uznasz `E2E_DATABASE_URL` za "gotowe i zapomniane": to realna zdalna
baza — jeśli jest współdzielona ze staging albo z realnymi danymi, seedowanie
fixture usera przy każdym uruchomieniu testów lokalnie może nie być czymś,
co chcesz robić bez zastanowienia. Rozważ dedykowaną bazę/branch Supabase
tylko do dev/testów, jeśli jeszcze takiej nie ma.

## Kolizja portów: next-app vs backend

Domyślny port Next.js (`3000`) pokrywa się z domyślnym portem backendu. Jeśli
oba repo faktycznie próbują wystartować na 3000 lokalnie, jedno z nich musi
mieć zmieniony port (np. next-app na inny, z odpowiednią zmianą
`MARKETING_URL` w `.env`). Sprawdź jak to masz obecnie skonfigurowane w
next-app zanim odpalisz oba naraz.

## Ważne: cookie sesji nie jest testowane lokalnie

Cookie sesji (docelowo `Domain=.domena.pl`) na `localhost` to różne originy
(różne porty), nie subdomeny tej samej domeny — więc lokalny przebieg
`tests/flows/` sprawdza samą ścieżkę funkcjonalną, ale NIE potwierdza że
sesja faktycznie przechodzi między Next a MF app. Realną weryfikację robi
dopiero przebieg w CI na staging z prawdziwymi subdomenami.

## CI

Workflow (`.github/workflows/e2e.yml`) odpala tylko `marketing` + `flows`
przeciw staging. Projekt `app` (auth przez prawdziwy backend + Postgres)
zostaje na razie lokalny — wystawienie backendu i bazy w CI to osobny temat
do domknięcia (tak samo jak było nierozwiązane w oryginalnym repo
frontend-shell, skąd te testy pochodzą).

## Wpięcie do CI innych repo

Żeby e2e odpalało się automatycznie po deployu Next lub MF app na staging,
dodaj w ich workflowach krok wysyłający `repository_dispatch` do tego repo
(potrzebny PAT z uprawnieniem `repo`, zapisany jako sekret `E2E_REPO_PAT` w
repo źródłowym):

```yaml
- name: Trigger e2e
  run: |
    curl -X POST \
      -H "Authorization: token ${{ secrets.E2E_REPO_PAT }}" \
      -H "Accept: application/vnd.github+json" \
      https://api.github.com/repos/szczypkaweb/marketplace-e2e/dispatches \
      -d '{"event_type":"staging-deployed"}'
```

Do czasu wpięcia tego kroku, e2e i tak leci co noc o 5:00 UTC (`schedule` w
workflow) i można je odpalić ręcznie (`workflow_dispatch`).

## Sprzątanie w repo frontend-shell

Testy auth pochodzą z repo `frontend-shell` (`e2e/` w tamtym repo). Po
migracji tutaj, w `frontend-shell`:

```bash
npm uninstall @playwright/test pg argon2
rm -rf e2e/ playwright.config.ts
```

i usuń skrypt `test:e2e` z jego `package.json` (jeśli nie było tam wpiętego
kroku CI dla Playwrighta, nic więcej nie trzeba zmieniać w workflowach tego
repo).
