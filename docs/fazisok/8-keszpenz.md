# Bővítés – Készpénz nyilvántartás

## Mi készült
- **Adatmodell:** a `months` táblába új `cash_balance` oszlop (2. séma-migráció, alapérték 0). A meglévő adatbázis a következő indításkor adatvesztés nélkül frissül (`backend/test/migration.test.js`).
- **API:** a `PATCH /api/months/:év/:hó` elfogadja a `cashBalance`-t (egész Ft; a többi egyenleget nem érinti); a hónap-lekérések (`month`, lista, statisztika) visszaadják. A hónaplista `totalMoney` mezője = számlán + megtakarítás + készpénz.
- **Előrejelzés:** a kiindulóegyenleg most **számlán + megtakarítás + készpénz**.
- **Felület:** Hónap nézet: szerkeszthető „Készpénz” mező és „Összes pénz” kártya; Főoldal: készpénz és összes pénz kártya; Hónapok összehasonlítása: készpénz és összes pénz sor; az Előrejelzés leírása frissítve.
- **Export/import:** a `cashBalance` benne van; a készpénz nélküli (korábbi) export is betölthető, ott a készpénz 0.

## Döntések
- A készpénz **ugyanúgy viselkedik, mint a számlán és a megtakarítás egyenleg**: havonta, kézzel frissített összeg; új hónap létrehozásakor 0-ról indul (az egyenlegek nem másolódnak, ahogy eddig sem).
- Nem külön tételsor (befizetés/kivét), hanem egy egyenleg: a felhasználó „mennyi készpénz van” kérdésére ez a legegyszerűbb válasz. Ha később mozgásokat is követni kell, az külön bővítés.
- Negatív készpénz bevihető (a mező előjeles), de a felület nem figyelmeztet rá.

## Kimaradt / későbbre
- A havi trend-diagram nem kapott külön „készpénz” vagy „összes pénz” vonalat.
- A készpénz-mozgások (felvétel, költés) nyilvántartása.
