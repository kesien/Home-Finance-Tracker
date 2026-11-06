# Fázis 2 – Alap felület

## Mi készült
- `frontend/src/App.jsx`: útvonalak és navigáció (mobilon alsó sáv, ≥800 px-en oldalsáv). A később elkészülő oldalak (Főoldal, Hónapok, Előrejelzés, Statisztika, Beállítások) egyelőre helyőrzők.
- `pages/MonthPage.jsx`: Hónap nézet – összegző kártyák, számlán/megtakarítás kézi szerkesztés (mezőelhagyáskor ment), bevétel- és kiadáslista, **egy koppintásos kifizetve kapcsoló**, kategóriánkénti összeg, átlag. Hiányzó hónapnál „Hónap létrehozása” gomb (a backend másol).
- `components/IncomeForm.jsx`, `ExpenseForm.jsx`, `Sheet.jsx`: bottom-sheet űrlapok; kategória helyben létrehozható, éves tételnél esedékesség, havinál opcionális lejárat.
- `pages/CategoriesPage.jsx`: hozzáadás, átnevezés, törlés (csak tétel nélkül), tételszám.
- `format.js`: magyar pénzformátum (`832.000,-`), összeg-értelmezés, hónapnevek, kategóriaszínek (+ tesztek).
- Sötét, kártyás téma; zöld/piros a pozitív/negatív értékekre; kategóriánként eltérő szín.

## Döntések
- Nincs állapotkezelő könyvtár: egy oldal = egy `load()` az API-ból, módosítás után újratöltés (kis adatmennyiség, kevés hibaforrás).
- Az éves tétel a nem esedékes hónapban halványan, „nem számít” felirattal látszik, nem tűnik el, hogy a másolt tételek átláthatók maradjanak.
- Gyors bevitel: a `+` gomb (FAB) két koppintással nyitja a megfelelő űrlapot.

## Kimaradt / későbbre
- A Hónapok oldal és az új hónap létrehozása a hónapok listájából (Fázis 3); a Főoldal (Fázis 4).
- Nincs automatizált böngészős e2e teszt; kézi ellenőrzés Playwrighttal (mobil + asztali nézet), hibamentes konzollal.
