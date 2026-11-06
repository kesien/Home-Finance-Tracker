// Böngészős füstteszt: telefon és asztali nézet UGYANARRA a szerverre csatlakozik, és ugyanazt az adatot látja.
// Futtatás (üres adatbázisú, futó szerverrel):  BASE_URL=http://localhost:3000 node scripts/e2e-smoke.cjs
// Előfeltétel: `playwright` telepítve (nem része a projekt függőségeinek).
const { chromium, devices } = require('playwright');
const assert = require('node:assert/strict');

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const now = new Date();
const [Y, M] = [now.getFullYear(), now.getMonth() + 1];

(async () => {
  const browser = await chromium.launch();
  const phone = await (await browser.newContext(devices['iPhone 13'])).newPage();
  const desktop = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const errors = [];
  for (const p of [phone, desktop]) {
    p.on('pageerror', (e) => errors.push(e.message));
    // A még nem létező hónap lekérése szándékosan 404 (az app erre „Hónap létrehozása” gombot mutat) – ezt a böngésző konzolja is naplózza.
    p.on('console', (m) => m.type() === 'error' && !/status of 404/.test(m.text()) && errors.push(m.text()));
  }

  // 1) Telefon: hónap létrehozása, bevétel és két kiadás felvétele (alsó navigáció, FAB, bottom sheet)
  await phone.goto(`${BASE}/honap`);
  await phone.getByText('Hónap létrehozása').click();
  await phone.waitForSelector('.fab');
  await phone.click('.fab');
  await phone.getByRole('button', { name: 'Bevétel', exact: true }).click();
  await phone.getByLabel('Név').fill('Apa fizu');
  await phone.getByLabel('Összeg (Ft)').fill('832000');
  await phone.getByRole('button', { name: 'Fix' }).click();
  await phone.getByRole('button', { name: 'Mentés' }).click();
  await phone.waitForSelector('text=832.000,-');

  await phone.click('.fab');
  await phone.getByRole('button', { name: 'Kiadás', exact: true }).click();
  await phone.getByLabel('Név').fill('CSOK hitel');
  await phone.getByLabel('Összeg (Ft)').fill('120000');
  await phone.getByLabel('Kategória').selectOption({ label: 'Hitel' });
  await phone.getByLabel(/Van lejárata/).check();
  await phone.getByRole('button', { name: 'Mentés' }).click();
  await phone.waitForSelector('text=CSOK hitel');

  // 2) Asztali gép: ugyanazt látja, oldalsáv van; kifizetve jelölés
  await desktop.goto(`${BASE}/honap`);
  await desktop.waitForSelector('text=CSOK hitel');
  assert.ok(await desktop.locator('nav.nav .brand').isVisible(), 'asztali nézetben oldalsáv kell');
  assert.ok(!(await phone.locator('nav.nav .brand').isVisible()), 'telefonon alsó sáv kell, nem oldalsáv');
  await desktop.getByRole('button', { name: /Megjelölés kifizetettnek/ }).click();
  await desktop.waitForSelector('.check-btn.on');

  // 3) Telefon újratöltve látja a kifizetett állapotot, és a dashboardot
  await phone.reload();
  await phone.waitForSelector('.check-btn.on');
  await phone.goto(`${BASE}/`);
  await phone.waitForSelector('text=Összes bevétel');
  assert.ok(await phone.getByText('832.000,-').first().isVisible());

  // 4) Előrejelzés és statisztika betölt
  await desktop.goto(`${BASE}/elorejelzes`);
  await desktop.waitForSelector('.recharts-line');
  await desktop.goto(`${BASE}/statisztika`);
  await desktop.waitForSelector('.recharts-line');

  assert.deepEqual(errors, [], `böngészőhibák: ${errors.join(' | ')}`);
  console.log(`OK – telefon és asztali nézet ugyanazt az adatot látja (${Y}.${M}. hónap)`);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
