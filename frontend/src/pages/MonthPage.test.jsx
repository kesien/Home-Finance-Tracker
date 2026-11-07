// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import MonthPage from './MonthPage.jsx';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const cats = [{ id: 1, name: 'Egyéb', itemCount: 0 }, { id: 3, name: 'Hitel', itemCount: 1 }];
const detail = (month, expenseName) => ({
  month: { id: month, year: 2026, month, accountBalance: 100000, savingsBalance: 200000, cashBalance: 0 },
  incomes: [],
  expenses: expenseName ? [{ id: month, name: expenseName, amount: 1000, type: 'monthly', category_id: 3, paid: false, counted: true, end_year: null, end_month: null }] : [],
  summary: { totalIncome: 0, totalExpense: 1000, remaining: -1000, unpaid: 1000, categoryTotals: { 3: 1000 } },
  average: { n: 3, total: { average: 0, monthsUsed: 1 }, variable: { average: 0, monthsUsed: 1 } },
});
const json = (body, status = 200) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });

function mount(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path="/honap/:year/:month" element={<MonthPage />} /></Routes>
    </MemoryRouter>,
  );
}

describe('MonthPage', () => {
  it('lassú, korábbi hónap válasza nem írja felül az újabbat', async () => {
    let releaseMarch;
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (url === '/api/categories') return json(cats);
      if (url === '/api/months/2026/3') return new Promise((r) => { releaseMarch = () => r({ ok: true, status: 200, json: () => Promise.resolve(detail(3, 'Márciusi tétel')) }); });
      if (url === '/api/months/2026/4') return json(detail(4, 'Áprilisi tétel'));
    }));
    mount('/honap/2026/3');
    fireEvent.click(screen.getByLabelText('Következő hónap'));
    await screen.findByText('Áprilisi tétel');
    releaseMarch();
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText('Márciusi tétel')).toBeNull();
    expect(screen.getByText('Áprilisi tétel')).toBeTruthy();
  });

  it('mentési hiba az űrlapban jelenik meg, az űrlap nyitva marad', async () => {
    vi.stubGlobal('fetch', vi.fn((url, opts) => {
      if (url === '/api/categories') return json(cats);
      if (opts?.method === 'POST') return json({ error: 'Szerver: elutasítva' }, 400);
      return json(detail(4, null));
    }));
    mount('/honap/2026/4');
    await screen.findByText('Még nincs bevétel.');
    fireEvent.click(screen.getAllByText('+ Új')[0]);
    fireEvent.change(screen.getByLabelText('Név'), { target: { value: 'Fizu' } });
    fireEvent.change(screen.getByLabelText('Összeg (Ft)'), { target: { value: '1000' } });
    fireEvent.click(screen.getByText('Mentés'));
    const alert = await screen.findByText('Szerver: elutasítva');
    expect(alert.closest('[role="dialog"]')).toBeTruthy();
  });

  it('Esc bezárja az űrlapot', async () => {
    vi.stubGlobal('fetch', vi.fn((url) => (url === '/api/categories' ? json(cats) : json(detail(4, null)))));
    mount('/honap/2026/4');
    await screen.findByText('Még nincs bevétel.');
    fireEvent.click(screen.getAllByText('+ Új')[0]);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('meglévő lejárat törlésekor null mezőket küld', async () => {
    const calls = [];
    const d = detail(4, 'Hitel A');
    d.expenses[0].end_year = 2030; d.expenses[0].end_month = 5;
    vi.stubGlobal('fetch', vi.fn((url, opts) => {
      calls.push([url, opts?.method, opts?.body]);
      return json(url === '/api/categories' ? cats : url.startsWith('/api/expenses') ? {} : d);
    }));
    mount('/honap/2026/4');
    fireEvent.click(await screen.findByText('Hitel A'));
    fireEvent.click(screen.getByLabelText(/Van lejárata/));
    fireEvent.click(screen.getByText('Mentés'));
    await waitFor(() => expect(calls.some(([u, m]) => u === '/api/expenses/4' && m === 'PATCH')).toBe(true));
    const body = JSON.parse(calls.find(([u, m]) => u === '/api/expenses/4' && m === 'PATCH')[2]);
    expect(body).toMatchObject({ end_year: null, end_month: null });
  });

  it('mentés közbeni hónapváltás után az új hónap tartalma marad', async () => {
    let releasePatch;
    const nov = detail(11, 'Novemberi tétel');
    vi.stubGlobal('fetch', vi.fn((url, opts) => {
      if (url === '/api/categories') return json(cats);
      if (opts?.method === 'PATCH') return new Promise((r) => { releasePatch = () => r({ ok: true, status: 200, json: () => Promise.resolve({}) }); });
      if (url === '/api/months/2026/11') return json(nov);
      if (url === '/api/months/2026/10') return json(detail(10, 'Októberi tétel'));
    }));
    mount('/honap/2026/11');
    await screen.findByText('Novemberi tétel');
    fireEvent.click(screen.getByLabelText('Megjelölés kifizetettnek'));
    fireEvent.click(screen.getByLabelText('Előző hónap'));
    await screen.findByText('Októberi tétel');
    releasePatch();
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.getByText('Októberi tétel')).toBeTruthy();
    expect(screen.queryByText('Novemberi tétel')).toBeNull();
  });

  it('a Sheet bezárásakor a fókusz a nyitó elemre kerül', async () => {
    vi.stubGlobal('fetch', vi.fn((url) => (url === '/api/categories' ? json(cats) : json(detail(4, null)))));
    mount('/honap/2026/4');
    await screen.findByText('Még nincs bevétel.');
    const opener = screen.getAllByText('+ Új')[0];
    opener.focus();
    fireEvent.click(opener);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });

  it('a készpénz egyenleg szerkeszthető, és az összes pénz tartalmazza', async () => {
    const calls = [];
    vi.stubGlobal('fetch', vi.fn((url, opts = {}) => {
      calls.push([url, opts.method, opts.body]);
      return json(url === '/api/categories' ? cats : opts.method === 'PATCH' ? {} : detail(4, null));
    }));
    mount('/honap/2026/4');
    const cash = await screen.findByLabelText(/Készpénz/);
    expect(screen.getByText('300.000,-')).toBeTruthy(); // 100.000 + 200.000 + 0
    fireEvent.change(cash, { target: { value: '45000' } });
    fireEvent.blur(cash);
    await waitFor(() => expect(calls.find(([u, m]) => u === '/api/months/2026/4' && m === 'PATCH')?.[2]).toBe('{"cashBalance":45000}'));
  });
});
