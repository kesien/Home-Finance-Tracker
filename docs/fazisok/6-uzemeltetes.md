# Fázis 6 – Üzemeltetés

## Mi készült
- `backend/src/backup.js`: napi automatikus mentés (indításkor + óránként ellenőrzés), utolsó 30 megőrzése, kézi mentés, import előtti mentések (utolsó 5), félkész fájl elleni védelem (`.tmp` + átnevezés).
- `backend/src/transfer.js`: teljes JSON export és szigorúan ellenőrzött, atomikus import.
- `backend/src/ops.js`: `GET /api/export`, `POST /api/import`, `GET/POST /api/backups`.
- `pages/SettingsPage.jsx`: az átlag N értéke, az előrejelzés küszöbe, export letöltés, import (megerősítéssel), mentések listája, „Mentés most”.
- Docker: `BACKUP_DIR=/data/backups` (ugyanabban a volume-ban, mint az adatbázis), `TZ=Europe/Budapest`.

## Döntések
Lásd `docs/adr/0003-mentes-es-import.md`. Fontos: a mentések az adatbázissal azonos volume-ban vannak, ezért **lemezhiba ellen nem védenek**; a README leírja, hogyan másold őket külső helyre (pl. a JSON export letöltésével).

## Elfogadási kritérium 8
Az automatikus mentés létrejön (tesztelve + valós szerveren kipróbálva), az export→import körbejárás azonos adatot ad (teszt: teljes egyezés az exportban és a statisztikában).

## Kimaradt / későbbre
- Mentésből visszaállítás a felületről: szándékosan kézi (lásd README), mert fájlcserét igényel leállított szerver mellett.
- A mentések letöltése a felületről.
