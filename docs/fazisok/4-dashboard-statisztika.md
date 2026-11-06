# Fázis 4 – Dashboard és statisztika

## Mi készült
- **Backend:** `GET /api/stats` – minden hónap időrendben: összesítők, egyenlegek, bevételek név szerint, kategóriaösszegek (a `summarize` logikával, tehát az éves tétel csak az esedékes hónapban számít), plusz a kategóriák listája. Teszt: `backend/test/api.test.js`.
- **Főoldal (`DashboardPage`)**: az aktuális (naptári) hónap kártyái – összes bevétel, összes kiadás, fennmaradó, hátralévő (nem kifizetett), számlán, megtakarítás –, közelgő kiadások listája, kategória-tortadiagram. Ha a hónap nincs létrehozva, a Hónapok oldalra irányít.
- **Statisztika (`StatsPage`)**: havi trend (bevétel, kiadás, megtakarítás – vonaldiagram), bevételi összetétel havonként (halmozott oszlop, név szerint), kiadási kategóriák hónap-választóval (tortadiagram).
- `stats.js`: tiszta adatformázó függvények (tesztelve); `components/Charts.jsx`: recharts diagramok sötét témához igazítva.

## Döntések
- „Közelgő kiadás” = ebben a hónapban beleszámító **és** még ki nem fizetett tétel; az éves (esedékes) elöl. A kifizetett éves tétel nem szerepel újra.
- A statisztikához külön végpont készült (nem N db hónap-lekérés), a számítás a szerveren, egy helyen történik.
- A megtakarítás trendje a kézzel frissített `megtakarítás` egyenleg hónaponkénti értéke.
- A recharts miatt a JS csomag nagyobb (~0,5 MB); helyi hálózaton ez elfogadható, később `lazy` betöltéssel csökkenthető.

## Kimaradt / későbbre
- Diagramok teljesen automatizált vizuális tesztje (kézzel ellenőrizve Playwrighttal); jsdom-ban a diagramok méret nélkül renderelnek.

## Review 1. kör után
- Minden diagram alatt „Adatok táblázatként” (`<details>`, valódi `<table>`): pontos értékek és arányok képernyőolvasóval/billentyűzettel is elérhetők; a diagram `aria-label`-e összesítést tartalmaz.
- A bevételi összetétel sor-kulcsai előtagot kaptak (`inc:<név>`), így egy „label” nevű bevétel nem írja felül a hónapfeliratot.
- Kártyaszínek: 0 kiadás nem piros, a megtakarítás előjel szerint színez; a `StatsPage` betöltése stale-guarddal.
- Ismert korlát: a kategóriaszín a 12 elemű palettából id szerint ismétlődik, 12-nél több kategóriánál két kategória azonos színű lehet; a hónaphézag a trendvonalon nem jelenik meg.
