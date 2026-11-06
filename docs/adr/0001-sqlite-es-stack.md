# ADR 0001 – SQLite, Express, React/Vite

**Döntés:** Node.js + Express backend, `better-sqlite3`, React + Vite frontend, npm workspaces monorepo, sima JavaScript (ESM).

**Indoklás:** két felhasználó, kis adatmennyiség, helyi hálózat → egyetlen fájlos SQLite elég, nincs külön DB szerver. A `better-sqlite3` szinkron API-ja egyszerűsíti a tranzakciókat (pl. hónap-másolás). Egy konténer szolgálja ki az API-t és a buildelt frontendet is.

**Következmény:** a mentés a DB fájl másolásával (SQLite backup API) megoldható; a Docker image-nek fordítóeszköz kell a natív modulhoz (csak a build fázisban).
