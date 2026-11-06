# Fázis 5 – Előrejelzés

## Mi készült
- `backend/src/logic.js › forecast()`: tiszta függvény, a következő 12 hónap egyenlege.
- `GET /api/forecast[?year=&month=]` (`service.forecastFor`): alaphónap = a naptári aktuális hónap, ha az nincs létrehozva, a legutolsó létező hónap; megadható explicit is. Hónap nélkül 404.
- `pages/ForecastPage.jsx`: a feltételezések összefoglalója, küszöb-figyelmeztetés (piros sáv / zöld állapotsor), kártyák, vonaldiagram a küszöb jelölésével, hónapról hónapra táblázat (a küszöb alatti sor kiemelve), a küszöb szerkesztése helyben (`PUT /api/settings`).

## Számítás (a specifikáció szerint)
- Kiindulópont: az alaphónap `számlán + megtakarítás` egyenlege. Az alaphónap már benne van, az előrejelzés a *következő* hónappal indul.
- Havi bevétel = az alaphónap fix bevételei + a változó bevételek átlaga (utolsó N hónap, N a beállításokból).
- Havi kiadás = az alaphónap kiadásai közül az, ami az adott hónapban `isCounted`: a lejárat nélküli havi tétel mindig, a lejárattal rendelkező a lejárati hónapig (azt is beleértve), az éves tétel csak az esedékes hónapban, teljes összeggel. **Ugyanaz a szabály, mint a hónapok összesítésénél**, ezért nincs dupla számlálás; a hitel egyszer szerepel, havi tételként.
- A figyelmeztetés akkor jelenik meg, ha az egyenleg *szigorúan kisebb* a küszöbnél (alapérték 0 Ft), az első érintett hónappal.

## Döntések
- Az előrejelzés csak az alaphónapban felvett tételekből dolgozik. Ha egy jövőbeli éves tételt még nem vettél fel az aktuális hónapba (vagy másolással nem került át), az nem szerepel; lásd ADR 0002.
- A küszöb a Beállítások oldalon (Fázis 6) is szerkeszthető lesz; addig az Előrejelzés oldalon állítható.
- Az API nem becsüli a hónapok közti inflációt/bérváltozást: konstans fix tételek, ahogy a specifikáció kéri.

## Kimaradt / későbbre
- Forgatókönyvek (pl. „mi van, ha megszűnik egy bevétel”) – nem része a feladatnak.
