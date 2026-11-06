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

## Mentés és visszaállítás

**Automatikus mentés:** naponta egy (`finance-ÉÉÉÉ-HH-NN.db`), az utolsó 30 napot őrzi meg. A fájlok a Docker volume `backups/` könyvtárában vannak. Az app a Beállítások oldalon listázza őket, és ott lehet „Mentés most”-t indítani.

> A mentések ugyanazon a lemezen vannak, mint az adatbázis. Időnként töltsd le a **JSON exportot** (Beállítások → JSON export letöltése), és tedd el másik gépre.

**Visszaállítás JSON-ból (az app fut):** Beállítások → JSON import → válaszd ki a fájlt. Az import az összes jelenlegi adatot lecseréli, előtte automatikus biztonsági mentés készül (`finance-pre-import-….db`).

**Visszaállítás mentésfájlból (SQLite):**
```bash
docker compose stop app
# a volume tartalmának elérése (a volume neve: <projektkönyvtár>_finance-data)
docker run --rm -v home-finance-tracker_finance-data:/data alpine sh -c \
  'cp /data/backups/finance-2026-11-15.db /data/finance.db && rm -f /data/finance.db-wal /data/finance.db-shm'
docker compose start app
```
(A `-wal` és `-shm` fájlok törlése fontos, különben a régi napló a visszaállított adatbázisra íródhatna.)
