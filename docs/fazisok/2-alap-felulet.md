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

## Review 1. kör után
- Versenyhelyzet: a `MonthPage` csak a legutóbb indított betöltés eredményét fogadja el; hónapváltáskor az adat, hiba és űrlap nullázódik.
- Mentési hiba az űrlapban jelenik meg (`mutate` továbbdobja, `act` az oldalszintű hibasávba írja); dupla küldés ellen `saving`/`busy` állapot.
- Meglévő lejárat törölhető (`end_year/end_month: null`); év mezők kliensoldali ellenőrzése.
- Sikeres mentés utáni sikertelen újratöltés nem dobja el a megjelenített adatot.
- Hozzáférhetőség: a listasorok gombok, `Sheet`: Esc, fókuszcsapda, fókuszvisszaadás; FAB `aria-expanded`; hibasáv `role="alert"` + Bezár gomb.
- `MonthPage.test.jsx`: regressziós tesztek (verseny, űrlaphiba, Esc, lejárat törlése).

## Review 2. kör után (nyitott pontok)
A 2. kör egy új Should-ot talált: (1) mentés közbeni hónapváltás után a régi hónap tartalma maradt, (2) a `Sheet` nem adta vissza a fókuszt. Mindkettő javítva (`loadRef`, a nyitó elem renderkori mentése, regressziós tesztekkel), de a javítást **reviewer már nem ellenőrizte** (a 2 körös keret kimerült), ezért a PR a specifikáció szerint nyitva maradt. Nit-ek közül megoldva: `role="alert"` az űrlaphibákon, „Újra” gomb betöltési hibánál. Nyitva (Nit): overlay-kattintás megerősítés nélkül zár.

## Lezárás (3. kör)
A tulajdonos kifejezetten kért egy harmadik, a 2 körös kereten kívüli review kört. Az új Should-javítást a 3. kör megerősítette (nincs Blocker/Should), ezután a PR (#3) mergelve lett. A 2 körös keret átlépése tehát tudatos, dokumentált eltérés.
