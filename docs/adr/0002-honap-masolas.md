# ADR 0002 – Hónap-másolás és éves/havi tételek

**Döntés:** minden hónap saját sorokat tárol (`incomes`, `expenses` a `month_id`-vel). Új hónap létrehozásakor az *előző létező* hónap (nem feltétlenül a naptári előző) tételeiből **új sorok** készülnek egy tranzakcióban; utána nincs kapcsolat a két hónap között.

**Mi másolódik:**
- bevételek: csak a `fixed`;
- havi kiadások: mind, a lejárattal (`end_year/end_month`) együtt, kivéve ha a lejárat már elmúlt az új hónapnál;
- éves kiadások: csak ha az esedékesség az új hónap vagy később (különben az előrejelzés elveszítené a jövőbeli éves tételeket);
- a `paid` mindig `0`.

**Számítás:** az éves tétel csak az esedékes hónap kiadásába számít bele, teljes összeggel (`isCounted`). A havi tétel a lejárati hónapig (azt is beleértve) számít. Minden összeg egyetlen helyen (`logic.js › summarize`) készül, így nincs dupla számlálás.

**Átlag:** az utolsó N (alap: 3) *létező* hónap átlaga a megadott hónapot is beleértve; ha kevesebb van, az összes. Két érték: összes bevétel és csak a változó bevételek (az előrejelzés utóbbit használja).

**Pénz:** egész forint (`INTEGER`), az API is csak egész számot fogad.

**Következmény (éves tételek):** az esedékesség után az éves tétel nem másolódik tovább, a következő évi esedékességet kézzel kell felvenni. Az előrejelzés (Fázis 5) ezért csak az aktuális hónapban felvett éves tételeket látja.

**Bemenet-validáció:** az összegek biztonságos egészek, felső korlát 10^12 Ft; a hibás kérések mindig JSON `{error}` választ kapnak.

**Negyedéves tétel (utólagos kiegészítés):** külön típus (`quarterly`), esedékességgel (`due_year/due_month` = az első esedékes hónap) és opcionális lejárattal. Az `isCounted` szerint az első esedékességtől 3 havonta számít bele a kiadásba, teljes összeggel. Másolásnál úgy viselkedik, mint a havi tétel (a lejáratig mindig másolódik, mert a ciklus folytatódik), így az esedékesség nélküli hónapokban is látszik, halványan, „nem esedékes” jelzéssel.
