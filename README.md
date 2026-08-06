# marketplace-e2e

Osobne repo z testami Playwright dla całego marketplace'u. Nie należy ani do repo
Next (`domena.pl`), ani do repo MF app (`app.domena.pl`) — bo testy z folderu
`tests/flows/` przechodzą przez oba naraz.

## Struktura

```
tests/
  marketing/   # testy tylko na Next (baseURL = MARKETING_URL)
  app/         # testy tylko na MF app (baseURL = APP_URL)
  flows/       # testy przechodzące między domenami, pełne URL-e, bez baseURL
```

## Migracja z repo MF app

1. W repo MF app znajdź dotychczasowy `playwright.config.ts` i folder `tests/`.
2. Skopiuj zawartość `tests/` (same pliki `.spec.ts`, bez configu) do `tests/app/`
   w tym repo. Zamień w nich bezwzględne URL-e na względne — `baseURL` już to
   załatwia (patrz `tests/app/login.spec.ts`, plik zastąp realną treścią).
3. W repo MF app usuń `@playwright/test` z `devDependencies`, usuń
   `playwright.config.ts` i folder `tests/` (lub katalog e2e, jak się nazywał),
   usuń skrypt `test:e2e` z `package.json`.
4. Sprawdź czy jakiś workflow CI w repo MF app odpalał Playwrighta —
   jeśli tak, usuń ten krok stamtąd (e2e przenosi się tutaj, patrz niżej).

## Uruchamianie lokalnie

Apki żyją w osobnych repo, więc trzeba je odpalić ręcznie przed testami:

```bash
# terminal 1 (repo Next)
pnpm dev   # http://localhost:3000

# terminal 2 (repo MF app)
pnpm dev   # http://localhost:3001

# terminal 3 (to repo)
cp .env.example .env
npm install
npx playwright install --with-deps
npm test
```

Albo pojedynczy projekt: `npm run test:marketing` / `npm run test:app` / `npm run test:flows`.

## Ważne: cookie sesji nie jest testowane lokalnie

Cookie sesji ma `Domain=.domena.pl`. Na `localhost:3000` / `localhost:3001` to dwa
różne originy (różne porty), nie subdomeny tej samej domeny — więc lokalny przebieg
`tests/flows/` sprawdza samą ścieżkę funkcjonalną, ale NIE potwierdza, że sesja
faktycznie przechodzi między Next a MF app. Realną weryfikację cookie robi dopiero
przebieg w CI na staging (prawdziwe subdomeny `staging.domena.pl` /
`staging-app.domena.pl`, patrz `.github/workflows/e2e.yml`).

## Wpięcie do CI innych repo

Żeby e2e odpalało się automatycznie po deployu Next lub MF app na staging, dodaj
w ich workflowach krok wysyłający `repository_dispatch` do tego repo (potrzebny
PAT z uprawnieniem `repo`, zapisany jako sekret `E2E_REPO_PAT` w repo źródłowym):

```yaml
- name: Trigger e2e
  run: |
    curl -X POST \
      -H "Authorization: token ${{ secrets.E2E_REPO_PAT }}" \
      -H "Accept: application/vnd.github+json" \
      https://api.github.com/repos/<owner>/marketplace-e2e/dispatches \
      -d '{"event_type":"staging-deployed"}'
```

Do czasu wpięcia tego kroku, e2e i tak leci co noc o 5:00 UTC (`schedule` w
workflow) i można je odpalić ręcznie (`workflow_dispatch`).
