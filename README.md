# Háztartási költségkövető

Saját, helyi hálózaton futó háztartási költségkövető két embernek (telefonról és számítógépről, közös adatokkal). Magyar nyelvű, bejelentkezés nélküli; a bevételeket és kiadásokat hónaponként tartja nyilván, átlagot és 12 hónapos előrejelzést számol, diagramokat mutat.

- **Frontend:** React + Vite (reszponzív, sötét téma) · **Backend:** Node.js + Express · **Adatbázis:** SQLite (egy fájl)
- **Futtatás:** Docker Compose, egyetlen konténer (API + a buildelt frontend), egy port.

> **Biztonság:** az app nem használ bejelentkezést, ezért **csak a helyi hálózaton** futtasd. Ne tedd elérhetővé az internetről (ne nyiss portot a routeren, ne tedd publikus szerverre).

## Telepítés (Docker Compose)

Szükséges: egy Docker-es gép a hálózaton (Docker Engine + Compose v2; Linux, macOS vagy Windows Docker Desktop).

```bash
git clone https://github.com/kesien/Home-Finance-Tracker.git
cd Home-Finance-Tracker
docker compose up -d --build
```

Ennyi. Az app a gép **3000-es portján** érhető el:

- ugyanarról a gépről: <http://localhost:3000>
- telefonról / másik gépről: `http://<a-szerver-IP-címe>:3000` (pl. `http://192.168.1.20:3000`). Az IP-t a szerveren `hostname -I` (Linux) vagy `ipconfig` (Windows) mutatja. Érdemes a routeren fix IP-t adni a szervernek, a telefon böngészőjében pedig „Hozzáadás a kezdőképernyőhöz”.
- Más portra állítás: a `docker-compose.yml`-ben a `ports` sort írd át (pl. `"8080:3000"`).

Hasznos parancsok:

| Parancs | Mire jó |
|---|---|
| `docker compose up -d --build` | indítás / frissítés a legújabb kóddal |
| `docker compose logs -f app` | napló |
| `docker compose stop` / `start` | leállítás / indítás (az adat megmarad) |
| `docker compose down` | a konténer törlése; **az adat a `finance-data` volume-ban megmarad** |
| `docker compose down -v` | ⚠ az adat is törlődik (a volume-mal együtt)! |

Az adatbázis és a mentések a `finance-data` Docker volume-ban vannak (`/data` a konténerben), ezért újraindításkor, frissítéskor, a konténer cseréjekor sem vesznek el. Az app a konténerben nem-root felhasználóval fut, és `restart: unless-stopped` mellett a gép újraindulása után magától feláll.

## Első lépések

1. Nyisd meg az appot, és a **Hónapok** oldalon hozd létre az első hónapot.
2. A **Hónap** nézetben vidd fel a bevételeket (fix / változó) és a kiadásokat (havi / éves). Mobilon a `+` gombbal pár koppintás egy tétel.
3. Új hónap létrehozásakor az előző hónapból átmásolódnak a **fix bevételek**, az összes **havi kiadás** (a lejárati dátumukkal; a már lejártak nem) és azok az **éves kiadások**, amelyeknek az esedékessége az új hónap vagy később van. A változó bevételek üresen indulnak, a „kifizetve” jelölés mindig törlődik. A másolás után a hónapok függetlenek.
4. A Hónap nézetben kézzel frissítheted a **számlán**, a **megtakarítás** és a **készpénz** egyenleget; az „Összes pénz” kártya ezek összege, és az előrejelzés is ebből indul.
5. Kiadásnál kapcsolható a „kifizetve” jelölés (egy koppintás), a Főoldal mutatja a hátralévő kiadásokat.

### Hogyan számol az app

- **Éves tétel:** az összege nincs 12-vel elosztva; kizárólag az esedékes hónap kiadásai között szerepel, teljes összegben.
- **Havi tétel lejárattal** (pl. hitel): az utolsó fizetendő hónapig számít; lejárat nélkül határozatlan ideig.
- **Átlag:** a bevételek átlaga az utolsó *N* hónap alapján (alapérték 3, a Beállításokban állítható); ha kevesebb hónap van, az összes elérhetőé.
- **Előrejelzés (12 hónap):** kiindulópont az aktuális hónap számlán + megtakarítás + készpénz egyenlege; havi bevétel = fix bevételek + a változó bevételek átlaga; kiadás = az aktuális hónap havi kiadásai (lejáratukig, lejárat nélkül mindig) + az adott hónapban esedékes éves tételek. Ha az egyenleg a küszöb (alap: 0 Ft) alá esik, az oldal figyelmeztet. Az éves tételek nem ismétlődnek automatikusan: az a tétel szerepel, amelyik az aktuális hónapban fel van véve.
- **Kategória:** egy kiadás pontosan egy kategóriába tartozik; kategória csak akkor törölhető, ha nincs hozzá tétel.

## Beállítások

| Beállítás | Alapérték | Jelentés |
|---|---|---|
| Átlag hónapjainak száma (N) | 3 | a változó bevételek átlagához figyelembe vett hónapok |
| Előrejelzés küszöbe | 0 Ft | az egyenleg ez alá esésekor figyelmeztet |

Környezeti változók (a `docker-compose.yml` `environment:` részében állíthatók; a Dockerfile az alapértékeket beállítja):

| Változó | Alapérték | Jelentés |
|---|---|---|
| `PORT` | `3000` | a szerver portja a konténerben |
| `DB_FILE` | `/data/finance.db` (fejlesztéskor `data/finance.db`) | az SQLite fájl helye |
| `BACKUP_DIR` | `/data/backups` (fejlesztéskor `data/backups`) | a napi mentések könyvtára |
| `STATIC_DIR` | `frontend/dist` | a buildelt frontend könyvtára |
| `TZ` | `Europe/Budapest` (compose) | a napi mentés „napját” ez határozza meg |

## Mentés és visszaállítás

**Automatikus mentés:** naponta egy (`finance-ÉÉÉÉ-HH-NN.db`), az utolsó 30-at őrzi meg. Az app induláskor és óránként ellenőrzi, van-e már mai mentés, így a kimaradt napot is pótolja. A fájlok a volume `backups/` könyvtárában vannak; a Beállítások oldal listázza őket, és ott lehet „Mentés most”-t indítani.

> A mentések ugyanazon a lemezen vannak, mint az adatbázis, így lemezhiba ellen nem védenek. Időnként töltsd le a **JSON exportot** (Beállítások → JSON export letöltése), és tedd el másik gépre vagy felhőbe.

**Visszaállítás JSON-ból (az app fut):** Beállítások → JSON import → válaszd ki a fájlt. Az import az **összes jelenlegi adatot lecseréli**; előtte az app automatikus biztonsági mentést készít (`finance-pre-import-….db`, az utolsó 5 marad meg). Hibás fájlnál semmi sem változik.

**Visszaállítás mentésfájlból (SQLite):**
```bash
docker compose stop app
# a volume neve: <projektkönyvtár neve kisbetűvel>_finance-data  (ellenőrzés: docker volume ls)
docker run --rm -v home-finance-tracker_finance-data:/data alpine sh -c \
  'cp /data/backups/finance-2026-11-15.db /data/finance.db && rm -f /data/finance.db-wal /data/finance.db-shm && chown 1000:1000 /data/finance.db'
docker compose start app
```
(A `-wal` és `-shm` fájlok törlése fontos, különben a régi napló a visszaállított adatbázisra íródhatna; a `chown` azért kell, hogy az app (nem-root `node` felhasználó, uid 1000) írhassa a fájlt.)

Megjegyzés: a Compose named volume-ot használ. Ha mégis bind mounttal (`./adat:/data`) cserélnéd, a könyvtárnak az 1000-es uid tulajdonában kell lennie (`sudo chown -R 1000:1000 adat`).

**Költöztetés másik gépre:** JSON export a régin → új gépen telepítés → JSON import.

## Frissítés

```bash
git pull
docker compose up -d --build
```
Az adat a volume-ban marad; az adatbázis-séma automatikusan frissül (verziózott migrációk).

## Hibaelhárítás

| Tünet | Teendő |
|---|---|
| Telefonról nem érhető el | ugyanazon a Wi-Fi-n van-e; a szerver tűzfala engedi-e a 3000-es portot; `docker compose ps` – a státusz „healthy” legyen |
| Foglalt a 3000-es port | írd át a `docker-compose.yml`-ben a `ports` bal oldalát (pl. `"8080:3000"`) |
| Nem indul | `docker compose logs app` |

## Fejlesztés

```bash
nvm use            # Node 22 (.nvmrc)
npm install
npm run dev:backend    # http://localhost:3000
npm run dev:frontend   # http://localhost:5173 (proxy az /api-hoz)
npm run lint && npm test && npm run build
```

Tesztek: a backend üzleti logikája (`backend/test/logic.test.js`: átlag, előrejelzés, hónap-másolás, lejárat), az API (`api.test.js`, `ops.test.js`), valamint a frontend komponens- és segédfüggvény-tesztek. Böngészős füstteszt (telefon + asztali nézet, közös adat): lásd `scripts/e2e-smoke.cjs`.

## Dokumentáció

- `docs/fazisok/` – fázisonkénti összefoglalók (mi készült, miért, mi maradt ki)
- `docs/adr/` – a nagyobb technikai döntések
- `docs/CHANGELOG.md` – változásnapló
- `docs/fazisok/7-veglegesites.md` – az elfogadási kritériumok ellenőrzése
