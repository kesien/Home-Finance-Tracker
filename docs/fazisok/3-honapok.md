# Fázis 3 – Hónapok és történet

## Mi készült
- `pages/MonthsPage.jsx`: az összes hónap listája (bevétel, kiadás, fennmaradó), kattintásra váltás a Hónap nézetre; **új hónap létrehozása** (alapértelmezés: a legutolsó utáni hónap; létező hónap nem hozható létre). A másolást a backend végzi (`POST /api/months`, lásd ADR 0002).
- **Összehasonlítás**: két hónap kiválasztása, összesítők (bevétel, kiadás, fennmaradó, számlán, megtakarítás) és kategóriánkénti összegek különbséggel (`compare.js`, tiszta függvény, tesztelve). A különbség mindig *összevetett − alap*; zöld a kedvező változás (több bevétel, kevesebb kiadás).
- Review-nitek az előző fázisból: az egyenlegmezők elfogadnak negatív értéket is (`parseSigned`; a számla lehet mínuszban), hibás mentés után a mező visszaáll, a FAB-menüből nyitott űrlap bezárásakor a fókusz a `+` gombra kerül.

## Döntések
- Az összehasonlítás kliensoldali: két meglévő `/api/months/:év/:hó` választ vet össze, nincs új backend végpont.
- A Hónapok oldalon a „létrehozás” után egyből a létrehozott hónapra navigálunk.

## Kimaradt / későbbre
- Hónap törlése a felületről (az API tudja, szándékosan nincs gomb: adatvesztés-kockázat).
- Kettőnél több hónap összevetése; ezt a Fázis 4 trendgrafikonja pótolja.

## Review 1. kör után
- Összehasonlítás: fejlécsor és `aria-label`-ek a számokon (Alap / Összevetett / Különbség), hibánál és betöltés közben nem marad elavult tábla.
- Új hónap: az év szövegmező (törölhető), tiltás okának kiírása, létrehozási hiba után a lista újratöltődik.
