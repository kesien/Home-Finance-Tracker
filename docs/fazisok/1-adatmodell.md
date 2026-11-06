# Fázis 1 – Adatmodell és üzleti logika

## Mi készült
- `backend/src/schema.js`: migrációk (`PRAGMA user_version`), kezdő kategóriák, alapbeállítások (`avgN=3`, `forecastThreshold=0`).
- `backend/src/logic.js`: tiszta függvények – `isCounted`, `summarize`, `averageLastN`, `itemsToCopy`, `nextMonth`.
- `backend/src/service.js`: DB-műveletek és validáció; `routes.js`: REST API.
- Tesztek: `test/logic.test.js` (egység), `test/api.test.js` (API, memóriabeli SQLite).

## API
| | |
|---|---|
| `GET/PUT /api/settings` | `avgN` (1–60), `forecastThreshold` |
| `GET/POST /api/categories`, `PATCH/DELETE /api/categories/:id` | törlés 409, ha van hozzá kiadás |
| `GET/POST /api/months`, `GET/PATCH/DELETE /api/months/:év/:hó` | POST másol; PATCH: `accountBalance`, `savingsBalance`; GET: tételek, összesítés, átlag |
| `POST /api/months/:év/:hó/incomes`, `PATCH/DELETE /api/incomes/:id` | `type`: `fixed`/`variable` |
| `POST /api/months/:év/:hó/expenses`, `PATCH/DELETE /api/expenses/:id` | `type`: `monthly`/`yearly`; `paid` kapcsoló PATCH-csel |

## Döntések
Lásd `docs/adr/0002-honap-masolas.md`. Továbbá: kategória nélküli kiadás az „Egyéb”-be kerül; a kategória törlése `ON DELETE RESTRICT` + 409; a kiadás-válasz `counted` jelzője megmondja, beleszámít-e a hónapba.

## Kimaradt / későbbre
- A „közelgő kiadások” lista és az előrejelzés a Fázis 4/5-ben készül (a szükséges adatok – `counted`, `paid`, `average.variable` – már elérhetők).
- A `forecastThreshold` csak tárolt beállítás egyelőre.
