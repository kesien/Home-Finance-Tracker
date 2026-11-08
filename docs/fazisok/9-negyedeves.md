# Bővítés – Negyedéves kiadás

## Mi készült
- **Új kiadástípus:** `quarterly` (negyedéves) a havi és az éves mellett.
- **Szabály (`logic.js › isCounted`):** a megadott első esedékes hónaptól (`due_year/due_month`) **3 havonta** számít a hónap kiadásába, teljes összeggel (nincs osztás); az első esedékesség előtt nem. Opcionális lejárat (`end_year/end_month`): az utolsó fizetendő hónap, mint a havi tételnél.
- **Hónap-másolás:** a negyedéves tétel a havihoz hasonlóan másolódik (a lejáratig), mert a ciklus folytatódik; a kifizetve jelölés törlődik.
- **Előrejelzés:** a 12 hónapba pontosan 4 alkalom esik; ugyanaz az `isCounted` szabály, így nincs dupla számlálás.
- **Séma:** 3. migráció – az `expenses` tábla újraépül a bővített `CHECK` miatt (SQLite-ban a megkötés nem módosítható); azonosítók, kategóriák, lejáratok megmaradnak. Teszt: `backend/test/migration.test.js` (meglévő adatokkal).
- **API / export / import:** `type: "quarterly"` + `due_year/due_month` (kötelező) + opcionális `end_year/end_month`; havi ↔ negyedéves átváltáskor a lejárat megmarad, éves átváltáskor törlődik. A korábbi exportok változatlanul betölthetők.
- **Felület:** a kiadás űrlapon „Negyedéves” gomb (első esedékesség + opcionális lejárat), a listán „negyedéves, 3 havonta (első: …)” felirat és halvány megjelenítés, ha az adott hónapban nem esedékes; a Főoldali közelgő listában az időszakos (negyedéves, éves) tételek elöl.

## Döntések
- Az esedékes hónap a *ciklus kezdete*: a felhasználó azt a hónapot adja meg, amikor az első (vagy a következő) fizetés esedékes, nem kell visszamenőleg kitölteni.
- Az éves tétel továbbra sem ismétlődik; a negyedéves igen (különben az előrejelzés csak az első negyedévet látná).

## Kimaradt / későbbre
- Más gyakoriságok (kéthavi, féléves): a szabály általánosítható egy `időköz` mezővel, de most nem kellett.
- A negyedéves tétel „kifizetve” jelölése hónaponként külön van (a másolt sorokban újra kikapcsol), ahogy a havi tételeknél.

## Review után
- **Séma-frissítés előtti másolat:** ha az app induláskor egy meglévő adatbázist kell frissítsen (pl. ez a 3. migráció, amely táblát épít újra), előbb `VACUUM INTO`-val másolatot készít a `backups/` könyvtárba (`finance-pre-migration-v<régi>-….db`). Üres vagy már friss adatbázison nem készül. Teszt: `migration.test.js`.
- Ismert (Nit): éves ↔ negyedéves átváltásnál az esedékességet a kérésnek tartalmaznia kell (a felület mindig küldi); API-ból esedékesség nélkül 400.
