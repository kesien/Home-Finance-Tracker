# ADR 0003 – Mentés és JSON export/import

**Mentés:** a szerver induláskor és óránként ellenőrzi, van-e már mai napi mentés (`finance-ÉÉÉÉ-HH-NN.db`); ha nincs, készít egyet a better-sqlite3 online backup API-jával (WAL mellett is konzisztens, futó app mellett is biztonságos), előbb `.tmp` fájlba, majd átnevezéssel. Az utolsó **30** napi mentést őrzi meg. Az „óránként ellenőrzés” azért jobb a fix éjféli időzítőnél, mert a kikapcsolt vagy újraindított szerver is pótolja a kimaradt napot.

**Idő:** a „nap” a szerver időzónája szerint értendő; a Compose `TZ=Europe/Budapest`-et állít.

**JSON export/import:** az export kategórianévvel hivatkozik (nem id-val), így hordozható és ember által is olvasható. Az import **teljes csere**: előbb teljes ellenőrzés (hiba esetén 400, semmi sem változik és mentés sem készül), utána biztonsági mentés (`finance-pre-import-…db`, az utolsó 5-öt őrizzük), végül egyetlen tranzakcióban törlés + beszúrás. Az „Egyéb” kategória importálás után is mindig létezik (a fallback miatt).

**Miért nem merge-import:** a spec „visszaállítást” kér; az összefésülés azonosítási és ütközéskezelési kérdéseket vetne fel, amelyekre egy kétfős háztartásban nincs szükség.
