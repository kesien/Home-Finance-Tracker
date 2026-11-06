# Fázis 7 – Véglegesítés

## Mi készült
- **Dockerfile végleges formában:** többlépcsős build, a futtató image nem-root (`node`) felhasználóval fut, a `/data` (adatbázis + mentések) a volume-ban él; Compose: egy parancs (`docker compose up -d --build`), `restart: unless-stopped`, healthcheck, `TZ=Europe/Budapest`.
- **README:** telepítés (egy idegen is végigkövetheti), első lépések, számítási szabályok, beállítások és környezeti változók, mentés/visszaállítás/költöztetés, frissítés, hibaelhárítás, fejlesztés.
- **`scripts/e2e-smoke.cjs`:** böngészős füstteszt, amely egy telefon- és egy asztali nézetű böngészőt ugyanarra a szerverre irányít.
- Ez a dokumentum: az elfogadási kritériumok ellenőrzése.

## Elfogadási kritériumok

| # | Kritérium | Állapot | Bizonyíték |
|---|---|---|---|
| 1 | Telefonról és gépről ugyanazok az adatok | ✅ (emulált eszközökkel) | `scripts/e2e-smoke.cjs`: a telefonon felvitt tételek az asztali nézetben látszanak, az ott kapcsolt „kifizetve” a telefonon is; alsó sáv telefonon, oldalsáv asztalin |
| 2 | Új hónap: fix tételek (lejárattal) másolódnak, a változók nem | ✅ | `backend/test/api.test.js` „az új hónap átmásolja…”, `logic.test.js › itemsToCopy` |
| 3 | Fix tétel módosítása nem hat más hónapokra | ✅ | `api.test.js` „a másolás után a hónapok függetlenek” (korábbi és későbbi hónapra is) |
| 4 | Éves tétel csak az esedékes hónapban, osztás nélkül | ✅ | `logic.test.js › isCounted/summarize`, `api.test.js` |
| 5 | Egy kiadás pontosan egy kategória | ✅ | sémában `category_id NOT NULL` + `ON DELETE RESTRICT`; API-teszt a törlés tiltására és a „Egyéb” létezésére; a kategória nélküli kiadás „Egyéb”-re esik vissza (`service.js › parseExpense`, a `Fázis 2` forma mindig kategóriát küld) |
| 6 | Átlag helyes, N állítható | ✅ | `logic.test.js › averageLastN`, `api.test.js` „átlag és beállítások”, Beállítások oldal |
| 7 | Előrejelzés: lejárt fix tétel nincs, lejárat nélküli mindig, nincs dupla számlálás | ✅ | `logic.test.js › forecast` (lejárati hónap, éves tétel, évhatár, küszöb), `api.test.js` „előrejelzés” |
| 8 | Automatikus mentés létrejön, export/import visszaállít | ✅ | `ops.test.js` (napi mentés, 30-as megőrzés, export→import körbejárás azonos adattal); a fejlesztés során valós szerveren és a Docker-konténerben is kézzel kipróbálva (a konténeres próba a fejlesztői munkamenetben történt, a repóból nem reprodukálható parancsnapló nélkül; a README lépései újrafuttathatók) |
| 9 | Docker Compose egy paranccsal indul, az adat újraindítás után megmarad | ◐ lásd lent | image build + futtatás + újraindítás + konténercsere ugyanazon a volume-on ellenőrizve; healthcheck-parancs és `compose config` rendben |
| 10 | Fázisdokumentáció, PR-ok review-val a `main`-be | ✅ (egy eltéréssel) | `docs/fazisok/0–7`; minden PR reviewer-ellenőrzés után ment be. **Eltérés:** a Fázis 2 PR (#3) 3 review kört kapott a megengedett 2 helyett – a 2. kör után maradt egy Should, és a tulajdonos kifejezetten harmadik kört kért |

## Mit nem lehetett teljesen ellenőrizni (őszintén)
- **`apt-get` lépés a Dockerfile build szakaszában:** ebben a fejlesztői környezetben a Debian csomagtükrök nem voltak elérhetők, ezért az image-et egy ideiglenes, `apt` nélküli változattal építettem fel (a `better-sqlite3` előre fordított binárisát használta, a fordítóeszközök nem kellettek). Az `apt` lépés csak tartalék arra az esetre, ha nincs előre fordított bináris; normál internetkapcsolattal futnia kell, de itt nem futott le. Ha a build mégis elbukik ezen a soron, a sor törölhető, ha az `npm ci` előre fordított binárist talál.
- A **`docker compose up`** parancsot egyben nem tudtam futtatni (ugyanezen ok miatt); a komponensei (build, futtatás, volume, healthcheck, compose-fájl érvényessége) külön igen.
- A „végigtesztelés telefonon” **emulált** iPhone-nal (Playwright) történt, **valódi készüléken nem**. Érdemes egyszer valódi telefonnal végigmenni: hónap létrehozása, tétel felvitele a `+` gombbal, kifizetve jelölés.
- Böngészőkompatibilitás: csak Chromium.
- A `scripts/e2e-smoke.cjs` üres adatbázist feltételez (a második futás ugyanazon az adatbázison időtúllépéssel elbukik, mert a „Hónap létrehozása” gomb már nincs ott).

## Ismert korlátok / későbbre
- Az éves tételek nem ismétlődnek automatikusan (lásd ADR 0002).
- A mentések azonos lemezen vannak az adatbázissal (JSON exporttal pótolható külső másolat).
- A frontend csomag ~0,6 MB (recharts); helyi hálózaton elfogadható.
- Nincs hitel-tőke nyilvántartás, import, felhasználókezelés (a feladat nem része).
