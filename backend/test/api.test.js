import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { openDb } from '../src/db.js';
import { createApp } from '../src/app.js';

let db, api;
beforeEach(() => {
  db = openDb(':memory:');
  api = request(createApp({ db }));
});
afterEach(() => db.close());

const catId = async (name) => (await api.get('/api/categories')).body.find((c) => c.name === name).id;
const newMonth = (year, month) => api.post('/api/months').send({ year, month });

describe('kategóriák', () => {
  it('az alap kategóriák léteznek, köztük az Egyéb', async () => {
    const res = await api.get('/api/categories');
    expect(res.body).toHaveLength(11);
    expect(res.body.map((c) => c.name)).toContain('Egyéb');
  });
  it('létrehozás, duplikáció tiltása, átnevezés', async () => {
    expect((await api.post('/api/categories').send({ name: 'Utazás' })).status).toBe(201);
    expect((await api.post('/api/categories').send({ name: 'utazás' })).status).toBe(409);
    const id = await catId('Utazás');
    expect((await api.patch(`/api/categories/${id}`).send({ name: 'Nyaralás' })).status).toBe(200);
  });
  it('használt kategória nem törölhető, a használatlan igen', async () => {
    await newMonth(2026, 11);
    const rezsi = await catId('Rezsi');
    const allat = await catId('Állat');
    await api.post('/api/months/2026/11/expenses').send({ name: 'Villany', amount: 20000, category_id: rezsi });
    expect((await api.delete(`/api/categories/${rezsi}`)).status).toBe(409);
    expect((await api.delete(`/api/categories/${allat}`)).status).toBe(204);
  });
});

describe('hónapok és másolás', () => {
  async function seed() {
    await newMonth(2026, 10);
    const rezsi = await catId('Rezsi');
    const hitel = await catId('Hitel');
    const ado = await catId('Adó');
    await api.post('/api/months/2026/10/incomes').send({ name: 'Apa fizu', amount: 800000, type: 'fixed' });
    await api.post('/api/months/2026/10/incomes').send({ name: 'Prémium', amount: 100000, type: 'variable' });
    await api.post('/api/months/2026/10/expenses').send({ name: 'CSOK hitel', amount: 90000, type: 'monthly', category_id: hitel, end_year: 2026, end_month: 12, paid: true });
    await api.post('/api/months/2026/10/expenses').send({ name: 'Régi hitel', amount: 30000, type: 'monthly', category_id: hitel, end_year: 2026, end_month: 10 });
    await api.post('/api/months/2026/10/expenses').send({ name: 'Villany', amount: 25000, type: 'monthly', category_id: rezsi });
    await api.post('/api/months/2026/10/expenses').send({ name: 'Ingatlanadó', amount: 120000, type: 'yearly', due_year: 2027, due_month: 12, category_id: ado });
  }

  it('az új hónap átmásolja a fix tételeket a lejárattal, a változót nem, a lejártat nem', async () => {
    await seed();
    const res = await newMonth(2026, 11);
    expect(res.status).toBe(201);
    expect(res.body.incomes.map((i) => i.name)).toEqual(['Apa fizu']);
    const names = res.body.expenses.map((e) => e.name);
    expect(names).toEqual(['CSOK hitel', 'Villany', 'Ingatlanadó']);
    const hitel = res.body.expenses.find((e) => e.name === 'CSOK hitel');
    expect([hitel.end_year, hitel.end_month, hitel.paid]).toEqual([2026, 12, false]);
    // az éves tétel átkerül, de nov.-ben nem számít bele a kiadásba
    expect(res.body.summary.totalExpense).toBe(90000 + 25000);
  });

  it('a másolás után a hónapok függetlenek (módosítás / törlés nem hat vissza)', async () => {
    await seed();
    const nov = (await newMonth(2026, 11)).body;
    const villany = nov.expenses.find((e) => e.name === 'Villany');
    await api.patch(`/api/expenses/${villany.id}`).send({ amount: 99000 });
    await api.delete(`/api/incomes/${nov.incomes[0].id}`);
    const okt = (await api.get('/api/months/2026/10')).body;
    expect(okt.expenses.find((e) => e.name === 'Villany').amount).toBe(25000);
    expect(okt.incomes).toHaveLength(2);
    // későbbi, már létrehozott hónapot sem érint a korábbi szerkesztése
    const dec = (await newMonth(2026, 12)).body;
    await api.patch(`/api/expenses/${okt.expenses[2].id}`).send({ amount: 1 });
    expect((await api.get('/api/months/2026/12')).body.expenses.find((e) => e.name === 'Villany').amount).toBe(99000);
    expect(dec.expenses.find((e) => e.name === 'Villany').paid).toBe(false);
  });

  it('az éves tétel az esedékes hónapban a teljes összeggel számít', async () => {
    await newMonth(2027, 12);
    const egyeb = await catId('Egyéb');
    const r = await api.post('/api/months/2027/12/expenses').send({ name: 'Adó', amount: 120000, type: 'yearly', due_year: 2027, due_month: 12 });
    expect(r.body.category_id).toBe(egyeb);
    expect((await api.get('/api/months/2027/12')).body.summary.totalExpense).toBe(120000);
  });

  it('létező hónap 409, érvénytelen 400, ismeretlen 404', async () => {
    await newMonth(2026, 10);
    expect((await newMonth(2026, 10)).status).toBe(409);
    expect((await newMonth(2026, 13)).status).toBe(400);
    expect((await api.get('/api/months/2030/1')).status).toBe(404);
  });

  it('a gap utáni hónap a legutóbbi korábbi hónapból másol', async () => {
    await newMonth(2026, 5);
    await api.post('/api/months/2026/5/incomes').send({ name: 'Fizu', amount: 1, type: 'fixed' });
    expect((await newMonth(2026, 9)).body.incomes).toHaveLength(1);
  });
});

describe('kifizetve, egyenleg, validáció', () => {
  it('kifizetve átkapcsolható és csökkenti a hátralévőt', async () => {
    await newMonth(2026, 11);
    const e = (await api.post('/api/months/2026/11/expenses').send({ name: 'Net', amount: 5000 })).body;
    expect((await api.get('/api/months/2026/11')).body.summary.unpaid).toBe(5000);
    await api.patch(`/api/expenses/${e.id}`).send({ paid: true });
    const m = (await api.get('/api/months/2026/11')).body;
    expect(m.summary.unpaid).toBe(0);
    expect(m.expenses[0].paid).toBe(true);
  });
  it('egyenlegek szerkeszthetők', async () => {
    await newMonth(2026, 11);
    const r = await api.patch('/api/months/2026/11').send({ accountBalance: 500000, savingsBalance: 2000000 });
    expect(r.body.month).toMatchObject({ accountBalance: 500000, savingsBalance: 2000000, cashBalance: 0 });
  });
  it('a készpénz önállóan szerkeszthető, nem érinti a többi egyenleget, és az összes pénzbe beleszámít', async () => {
    await newMonth(2026, 11);
    await api.patch('/api/months/2026/11').send({ accountBalance: 100000, savingsBalance: 200000 });
    const r = await api.patch('/api/months/2026/11').send({ cashBalance: 35000 });
    expect(r.body.month).toMatchObject({ accountBalance: 100000, savingsBalance: 200000, cashBalance: 35000 });
    const list = (await api.get('/api/months')).body[0];
    expect([list.cashBalance, list.totalMoney]).toEqual([35000, 335000]);
    expect((await api.patch('/api/months/2026/11').send({ cashBalance: 1.5 })).status).toBe(400);
    expect((await api.patch('/api/months/2026/11').send({ cashBalance: 'x' })).status).toBe(400);
    // az új hónap egyenlegei – a készpénzzel együtt – 0-ról indulnak és kézzel frissítendők
    expect((await newMonth(2026, 12)).body.month.cashBalance).toBe(0);
  });
  it('nem egész vagy negatív összeget elutasít, éves tételhez esedékesség kell', async () => {
    await newMonth(2026, 11);
    const post = (b) => api.post('/api/months/2026/11/expenses').send(b);
    expect((await post({ name: 'x', amount: 10.5 })).status).toBe(400);
    expect((await post({ name: 'x', amount: -1 })).status).toBe(400);
    expect((await post({ name: 'x', amount: 1, type: 'yearly' })).status).toBe(400);
    expect((await post({ name: 'x', amount: 1, category_id: 9999 })).status).toBe(400);
  });
  it('típusváltás éves → havi törli az esedékességet', async () => {
    await newMonth(2026, 11);
    const e = (await api.post('/api/months/2026/11/expenses').send({ name: 'x', amount: 1, type: 'yearly', due_year: 2026, due_month: 11 })).body;
    const r = await api.patch(`/api/expenses/${e.id}`).send({ type: 'monthly' });
    expect([r.body.type, r.body.due_year]).toEqual(['monthly', null]);
  });
});

describe('átlag és beállítások', () => {
  async function months() {
    for (const [m, v] of [[8, 100000], [9, 200000], [10, 300000], [11, 400000]]) {
      await newMonth(2026, m);
      await api.post(`/api/months/2026/${m}/incomes`).send({ name: 'Extra', amount: v, type: 'variable' });
    }
  }
  it('alapból az utolsó 3 hónap átlaga, N állítható', async () => {
    await months();
    expect((await api.get('/api/months/2026/11')).body.average.variable).toEqual({ average: 300000, monthsUsed: 3 });
    await api.put('/api/settings').send({ avgN: 2 });
    expect((await api.get('/api/months/2026/11')).body.average.variable.average).toBe(350000);
  });
  it('kevesebb hónapnál az elérhetők átlaga', async () => {
    await months();
    expect((await api.get('/api/months/2026/8')).body.average.variable).toEqual({ average: 100000, monthsUsed: 1 });
  });
  it('érvénytelen beállítást elutasít', async () => {
    expect((await api.put('/api/settings').send({ avgN: 0 })).status).toBe(400);
    expect((await api.get('/api/settings')).body).toEqual({ avgN: 3, forecastThreshold: 0 });
  });
});

describe('robusztus bemenet', () => {
  it('hibás JSON törzs JSON 400-at ad', async () => {
    const r = await api.post('/api/months').set('Content-Type', 'application/json').send('{bad');
    expect(r.status).toBe(400);
    expect(r.body.error).toBeTruthy();
    expect(r.headers['content-type']).toMatch(/json/);
  });
  it('nem objektum törzs 400', async () => {
    expect((await api.put('/api/settings').set('Content-Type', 'application/json').send('[]')).status).toBe(400);
    expect((await api.post('/api/months').set('Content-Type', 'application/json').send('null')).status).toBe(400);
  });
  it('óriás / lebegőpontos összeg és egyenleg elutasítva', async () => {
    await newMonth(2026, 11);
    const post = (b) => api.post('/api/months/2026/11/incomes').send(b);
    expect((await post({ name: 'x', amount: 1e300 })).status).toBe(400);
    expect((await post({ name: 'x', amount: 2 ** 60 })).status).toBe(400);
    expect((await api.patch('/api/months/2026/11').send({ accountBalance: 1e300 })).status).toBe(400);
  });
  it('rossz típusú category_id és paid 400, nem 500', async () => {
    await newMonth(2026, 11);
    const post = (b) => api.post('/api/months/2026/11/expenses').send({ name: 'x', amount: 1, ...b });
    expect((await post({ category_id: {} })).status).toBe(400);
    expect((await post({ category_id: '1' })).status).toBe(400);
    expect((await post({ paid: 'false' })).status).toBe(400);
  });
});

describe('statisztika', () => {
  it('időrendben adja a hónapokat, bevételekkel és kategóriaösszegekkel', async () => {
    await newMonth(2026, 11);
    await newMonth(2026, 10);
    await api.post('/api/months/2026/10/incomes').send({ name: 'Apa fizu', amount: 800000, type: 'fixed' });
    const rezsi = await catId('Rezsi');
    await api.post('/api/months/2026/10/expenses').send({ name: 'Villany', amount: 20000, category_id: rezsi });
    await api.post('/api/months/2026/10/expenses').send({ name: 'Adó', amount: 99000, type: 'yearly', due_year: 2027, due_month: 1 });
    const r = (await api.get('/api/stats')).body;
    expect(r.months.map((m) => [m.year, m.month])).toEqual([[2026, 10], [2026, 11]]);
    expect(r.months[0]).toMatchObject({ totalIncome: 800000, totalExpense: 20000, remaining: 780000, cashBalance: 0 });
    expect(r.months[0].incomes).toEqual([{ name: 'Apa fizu', amount: 800000 }]);
    expect(r.months[0].categoryTotals).toEqual({ [rezsi]: 20000 }); // az éves tétel nem számít bele
    expect(r.categories.length).toBe(11);
  });
});

describe('előrejelzés', () => {
  it('404 hónap nélkül', async () => {
    expect((await api.get('/api/forecast')).status).toBe(404);
  });

  it('a naptári hónapot használja, a változó bevétel átlagával, és küszöbbel', async () => {
    const app = request(createApp({ db, now: () => new Date(2026, 10, 15) }));
    for (const [m, v] of [[9, 100000], [10, 200000], [11, 300000]]) {
      await app.post('/api/months').send({ year: 2026, month: m });
      await app.post(`/api/months/2026/${m}/incomes`).send({ name: 'Extra', amount: v, type: 'variable' });
    }
    await app.post('/api/months/2026/11/incomes').send({ name: 'Fizu', amount: 800000, type: 'fixed' });
    await app.post('/api/months/2026/11/expenses').send({ name: 'Hitel', amount: 90000, end_year: 2027, end_month: 1 });
    await app.post('/api/months/2026/11/expenses').send({ name: 'Adó', amount: 60000, type: 'yearly', due_year: 2027, due_month: 6 });
    await app.patch('/api/months/2026/11').send({ accountBalance: 100000, savingsBalance: 400000 });
    const r = (await app.get('/api/forecast')).body;
    expect(r.base).toEqual({ year: 2026, month: 11 });
    expect(r.isCurrent).toBe(true);
    expect(r.startBalance).toBe(500000);
    expect(r.avgVariableIncome).toBe(200000); // (100+200+300)/3
    expect(r.rows[0]).toMatchObject({ month: 12, income: 1000000, expense: 90000, balance: 500000 + 910000 });
    expect(r.rows[2]).toMatchObject({ month: 2, expense: 0 }); // a hitel januárig tart
    expect(r.rows[6]).toMatchObject({ month: 6, expense: 60000 });
    await app.put('/api/settings').send({ forecastThreshold: 5000000 });
    expect((await app.get('/api/forecast')).body.firstBelow).toEqual({ year: 2026, month: 12 });
  });

  it('ha az aktuális hónap nincs létrehozva, a legutolsó létezőből indul és isCurrent=false', async () => {
    const app = request(createApp({ db, now: () => new Date(2026, 10, 15) }));
    await app.post('/api/months').send({ year: 2026, month: 8 });
    const r = (await app.get('/api/forecast')).body;
    expect(r.base).toEqual({ year: 2026, month: 8 });
    expect(r.isCurrent).toBe(false);
  });

  it('a kiindulóegyenlegbe a készpénz is beleszámít', async () => {
    await newMonth(2026, 5);
    await api.patch('/api/months/2026/5').send({ accountBalance: 100000, savingsBalance: 200000, cashBalance: 30000 });
    expect((await api.get('/api/forecast?year=2026&month=5')).body.startBalance).toBe(330000);
  });

  it('megadott alaphónap és érvénytelen paraméter', async () => {
    await newMonth(2026, 5);
    expect((await api.get('/api/forecast?year=2026&month=5')).body.base).toEqual({ year: 2026, month: 5 });
    expect((await api.get('/api/forecast?year=2026&month=9')).status).toBe(404);
    expect((await api.get('/api/forecast?year=x&month=1')).status).toBe(400);
  });
});
