# Fázis 0 – Alap

## Mi készült
- `backend/`: Express app (`src/app.js`, `createApp({db})`), SQLite kapcsolat (`src/db.js`), belépési pont (`src/index.js`), `/api/health`.
- `frontend/`: React + Vite váz, üres főoldal, `/api` proxy fejlesztéshez.
- Gyökér: npm workspaces, ESLint (flat config), `Dockerfile`, `docker-compose.yml` (named volume: `finance-data` → `/data`).

## Döntések
- Az app factory (`createApp`) kapja a DB-t, így a tesztek `:memory:` adatbázissal futnak.
- Production-ben az Express a `frontend/dist`-et is kiszolgálja → egyetlen port, egyetlen konténer.

## Hiányosság
- A Docker image buildet ebben a környezetben nem lehetett lefuttatni (nincs Docker daemon); a Fázis 7-ben, valódi Docker-es gépen ellenőrizendő.

## Review 1. kör után
- `.dockerignore` (`**/node_modules`), többlépcsős Dockerfile (build → slim futtató image), compose `healthcheck`, SIGTERM/SIGINT kezelés (DB lezárás), statikus kiszolgálás és `/api` 404 az `app.js`-ben tesztelve, frontend smoke teszt, `engines`/`.nvmrc`.
