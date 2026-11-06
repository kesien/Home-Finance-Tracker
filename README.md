# Háztartási költségkövető

Helyi hálózaton futó háztartási költségkövető (React + Express + SQLite). Magyar nyelvű, két felhasználóra, bejelentkezés nélkül.

## Fejlesztés
```bash
npm install
npm run dev:backend    # http://localhost:3000
npm run dev:frontend   # http://localhost:5173 (proxy az /api-hoz)
npm run lint && npm test
```

## Indítás Docker-rel
```bash
docker compose up -d --build
```
Az app a `3000`-es porton érhető el; az adat a `finance-data` volume-ban marad meg. (A részletes telepítési leírás a Fázis 7-ben készül el.)

Dokumentáció: `docs/fazisok/`, `docs/adr/`, `docs/CHANGELOG.md`.

## Beállítások (környezeti változók)
| Változó | Alapérték | Jelentés |
|---|---|---|
| `PORT` | `3000` | A szerver portja |
| `DB_FILE` | `data/finance.db` (Dockerben `/data/finance.db`) | Az SQLite fájl helye |
| `STATIC_DIR` | `frontend/dist` | A buildelt frontend könyvtára |

Node 22 szükséges (`.nvmrc`). **Figyelem:** az app nem használ bejelentkezést, ezért ne tedd elérhetővé az internetről, csak a helyi hálózaton futtasd.
