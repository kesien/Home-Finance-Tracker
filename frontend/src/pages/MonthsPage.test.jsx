// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MonthsPage from './MonthsPage.jsx';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const json = (body, status = 200) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });
const months = [
  { year: 2026, month: 11, totalIncome: 900, totalExpense: 400, remaining: 500, accountBalance: 0, savingsBalance: 0 },
  { year: 2026, month: 10, totalIncome: 800, totalExpense: 500, remaining: 300, accountBalance: 0, savingsBalance: 0 },
];
const detail = (income, expense) => ({
  month: { accountBalance: 0, savingsBalance: 0 },
  summary: { totalIncome: income, totalExpense: expense, remaining: income - expense, categoryTotals: { 1: expense } },
});

describe('MonthsPage', () => {
  it('felsorolja a hónapokat, az új hónap alapértéke a legutolsó utáni', async () => {
    vi.stubGlobal('fetch', vi.fn((url) => json(url === '/api/months' ? months : url === '/api/categories' ? [{ id: 1, name: 'Rezsi' }] : detail(1, 1))));
    render(<MemoryRouter><MonthsPage /></MemoryRouter>);
    await screen.findByText('2026. november', { selector: 'span' });
    expect(screen.getByLabelText('Év').value).toBe('2026');
    expect(screen.getByLabelText('Hónap').value).toBe('12');
  });

  it('létező hónapot nem enged létrehozni', async () => {
    vi.stubGlobal('fetch', vi.fn((url) => json(url === '/api/months' ? months : url === '/api/categories' ? [] : detail(1, 1))));
    render(<MemoryRouter><MonthsPage /></MemoryRouter>);
    await screen.findByLabelText('Hónap');
    fireEvent.change(screen.getByLabelText('Hónap'), { target: { value: '10' } });
    expect(screen.getByText('Létrehozás').disabled).toBe(true);
  });

  it('összehasonlítás: különbség előjellel jelenik meg', async () => {
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (url === '/api/months') return json(months);
      if (url === '/api/categories') return json([{ id: 1, name: 'Rezsi' }]);
      return json(url.endsWith('/10') ? detail(800, 500) : detail(900, 400));
    }));
    render(<MemoryRouter><MonthsPage /></MemoryRouter>);
    const row = async (label) => (await screen.findByText(label, { selector: '.cmp span' })).closest('li');
    const income = await row('Bevétel');
    await waitFor(() => expect(income.querySelector('strong').textContent).toBe('+100,-'));
    expect(income.querySelector('strong').className).toContain('pos');
    const expense = await row('Kiadás');
    expect(expense.querySelector('strong').textContent).toBe('-100,-');
    expect(expense.querySelector('strong').className).toContain('pos'); // kevesebb kiadás = kedvező
  });
});
