// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from './DashboardPage.jsx';

class RO { observe() {} unobserve() {} disconnect() {} }
vi.stubGlobal('ResizeObserver', RO); // a recharts ResponsiveContainer-hez (jsdom-ban nincs)
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const json = (body, status = 200) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });

describe('DashboardPage', () => {
  it('létrehozásra hívja fel, ha az aktuális hónap hiányzik', async () => {
    vi.stubGlobal('fetch', vi.fn((url) => (url === '/api/categories' ? json([]) : json({ error: 'nincs' }, 404))));
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    expect(await screen.findByText('Hónap létrehozása')).toBeTruthy();
  });

  it('kártyák és közelgő kiadások (csak a kifizetetlen, beleszámító)', async () => {
    const e = (id, name, paid, counted) => ({ id, name, amount: 1000 * id, type: 'monthly', category_id: 1, paid, counted });
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (url === '/api/categories') return json([{ id: 1, name: 'Rezsi' }]);
      return json({
        month: { accountBalance: -5000, savingsBalance: 200000 },
        incomes: [],
        expenses: [e(1, 'Villany', false, true), e(2, 'Net', true, true), e(3, 'Adó', false, false)],
        summary: { totalIncome: 900000, totalExpense: 6000, remaining: 894000, unpaid: 1000, categoryTotals: { 1: 6000 } },
      });
    }));
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    await screen.findByText('Közelgő kiadások');
    expect(screen.getByText('Villany')).toBeTruthy();
    expect(screen.queryByText('Net')).toBeNull();
    expect(screen.queryByText('Adó')).toBeNull();
    expect(screen.getByText('-5.000,-').className).toContain('neg');
    expect(screen.getByText('900.000,-')).toBeTruthy();
    // a diagram adatai táblázatként is elérhetők
    expect(screen.getByRole('table', { name: 'Kiadások kategóriák szerint' })).toBeTruthy();
  });
});
