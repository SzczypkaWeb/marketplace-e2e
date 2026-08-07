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
    auth.setup.ts         # Playwright "setup project" - sieje fixture usera w Postgresie
    auth.teardown.ts      # Playwright "teardown project" - sprząta fixture usera po testach
  flows/       # testy przechodzące między domenami, pełne URL-e, bez baseURL
```

`auth.setup.ts`/`auth.teardown.ts` są scope'owane wyłącznie do projektu `app`
(patrz `dependencies`/`teardown` w `playwright.config.ts`) - `marketing` i
`flows` nigdy nie potrzebują `E2E_DATABASE_URL`/dostępu do Postgresa, nawet
pośrednio. To jest zmiana względem starszej wersji tego configu (top-level
`globalSetup`/`globalTeardown`, leciały przy KAŻDYM uruchomieniu niezależnie
od `--project`) - i dokładnie to sprawia, że wpięcie `app` do CI (patrz sekcja
CI niżej) nie psuje `marketing`/`flows` w kontekstach bez dostępu do bazy.

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
npm install                   # pg + argon2 są już w devDependencies (potrzebne przez auth.setup.ts)
npx playwright install --with-deps
npm test
```

Albo pojedynczy projekt: `npm run test:marketing` / `npm run test:app` / `npm run test:flows`.
`test:app`/`--project=app` automatycznie ciągnie za sobą `app-setup`
(dependency) i `app-teardown` (teardown) - nie trzeba ich wywoływać osobno.
`test:marketing`/`test:flows` NIE dotykają Postgresa w ogóle (patrz sekcja
"Struktura" wyżej).

`test:app` (czyli `auth.spec.ts`) wymaga działającego `backend` i tej samej
bazy co backend faktycznie używa — bez tego `auth.setup.ts` albo wywali się
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

## TODO: lokalna baza testowa (bez odpalania backendu)

Docelowo: `auth.setup.ts`/`auth.teardown.ts` mają wykrywać lokalnie stojącą
bazę testową (np. Postgres z `docker-compose`, osobny od Supabase opisanego
wyżej) i siać/czyścić fixture usera bezpośrednio w niej, zamiast wymagać
żeby `backend` faktycznie stał uruchomiony w osobnym terminalu. To skróci
"cztery terminale" z sekcji wyżej do trzech przy pracy nad samym frontendem/
e2e.

**Nie jest to jeszcze zaimplementowane** — nie ma jeszcze ustalonego
środowiska testowego (schemat/seed/sposób uruchomienia lokalnej bazy). Ta
sekcja to zapowiedź kierunku, nie instrukcja — wracamy do tego (i faktycznie
edytujemy `auth.setup.ts`/`auth.teardown.ts`/`.env.example`) jak środowisko
testowe będzie gotowe. Do tego czasu obowiązuje sekcja "Baza: Supabase, nie
lokalny Postgres" wyżej — `test:app` nadal wymaga realnego `backend` i
`E2E_DATABASE_URL` wskazującego na tę samą bazę co backend.

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

Workflow (`.github/workflows/e2e.yml`) zawsze odpala `marketing` + `flows`
przeciw staging. Projekt `app` (auth przez prawdziwy backend + Postgres)
dołącza się **warunkowo** - tylko gdy sekret `E2E_DATABASE_URL` jest
faktycznie przekazany (bezpośrednio jako sekret tego repo dla
`workflow_dispatch`/`schedule`/`repository_dispatch`, albo przekazany przez
wywołującego przy `workflow_call`, patrz przykład niżej). Bez niego workflow
po prostu pomija `app` i leci jak wcześniej - to jest bezpieczny fallback, nie
błąd.

Obecnie żadne repo jeszcze nie przekazuje tego sekretu (patrz
`backend/.github/workflows/deploy-gcp-staging.yml` - ma na to miejsce
przygotowane, ale zakomentowane do czasu aż `frontend-shell`/`react-app` będą
mieć własny staging, inaczej `app_url` wskazywałoby na nieistniejący
deployment i projekt `app` i tak by nie przeszedł).

## Wpięcie do CI innych repo

Dwa sposoby - wybierz w zależności od tego, czy potrzebujesz wiedzieć w tym
samym przebiegu CI, czy e2e przeszło (np. żeby zbudować na tym job "promote to
prod"), czy tylko chcesz je odpalić "w tle".

### Preferowane: workflow_call (daje `needs.e2e.result`)

Wywołaj ten workflow bezpośrednio jako job w workflowie deployującym na
staging - to jest ten sam przebieg CI, więc kolejny job może zależeć od
wyniku:

```yaml
jobs:
  deploy-staging:
    # ... deploy do stagingu ...

  e2e:
    needs: deploy-staging
    uses: szczypkaweb/marketplace-e2e/.github/workflows/e2e.yml@main
    with:
      marketing_url: https://staging.domena.pl   # tylko next-app
      app_url: https://staging-app.domena.pl     # tylko MF app
      api_url: https://backend-staging-xxxxx.run.app  # tylko projekt app (auth.spec.ts)
    secrets:
      E2E_DATABASE_URL: ${{ secrets.E2E_DATABASE_URL_STAGING }}   # opcjonalne - bez tego projekt app jest pomijany

  promote-to-prod:
    needs: e2e
    if: needs.e2e.result == 'success'
    runs-on: ubuntu-latest
    steps:
      - run: echo "otwórz/zmerguj PR staging -> main tutaj"
```

Nie wymaga PAT-a ani sekretu w repo źródłowym - `uses:` z publicznego/tego
samego org repo działa bez dodatkowej autoryzacji (przy prywatnym repo:
`GITHUB_TOKEN` z odpowiednim `permissions` w wywołującym workflow wystarczy,
patrz [docs GitHub o reusable workflows](https://docs.github.com/en/actions/using-workflows/reusing-workflows)).

### Fallback: repository_dispatch (jednokierunkowe, bez informacji zwrotnej)

Dodaj w workflowie repo źródłowego krok wysyłający `repository_dispatch` do
tego repo (potrzebny PAT z uprawnieniem `repo`, zapisany jako sekret
`E2E_REPO_PAT` w repo źródłowym):

```yaml
- name: Trigger e2e
  run: |
    curl -X POST \
      -H "Authorization: token ${{ secrets.E2E_REPO_PAT }}" \
      -H "Accept: application/vnd.github+json" \
      https://api.github.com/repos/szczypkaweb/marketplace-e2e/dispatches \
      -d '{"event_type":"staging-deployed"}'
```

Ten sposób NIE daje żadnej informacji zwrotnej do repo źródłowego (osobny,
niepowiązany przebieg CI) - nie da się na nim zbudować promote-to-prod. Trzymany
głównie dla wstecznej kompatybilności / jako alternatywa gdy `workflow_call`
nie pasuje (np. wywołanie z zupełnie innego triggera niż deploy).

Do czasu wpięcia któregokolwiek z powyższych, e2e i tak leci co noc o 5:00 UTC
(`schedule` w workflow) i można je odpalić ręcznie (`workflow_dispatch`).

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
