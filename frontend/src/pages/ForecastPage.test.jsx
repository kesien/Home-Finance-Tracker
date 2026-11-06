// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import ForecastPage from './ForecastPage.jsx';

class RO { observe() {} unobserve() {} disconnect() {} }
vi.stubGlobal('ResizeObserver', RO);
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const json = (body, status = 200) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });

const forecast = (firstBelow) => ({
  base: { year: 2026, month: 11 }, avgN: 3, monthsUsed: 2, startBalance: 500000, fixedIncome: 800000, avgVariableIncome: 50000, threshold: 0, firstBelow,
  rows: [
    { year: 2026, month: 12, income: 850000, expense: 900000, change: -50000, balance: 450000, belowThreshold: false },
    { year: 2027, month: 1, income: 850000, expense: 900000, change: -50000, balance: -10000, belowThreshold: true },
  ],
});

describe('ForecastPage', () => {
  it('figyelmeztet, ha az egyenleg a küszöb alá esik, és jelöli a sort', async () => {
    vi.stubGlobal('fetch', vi.fn(() => json(forecast({ year: 2027, month: 1 }))));
    render(<ForecastPage />);
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('2027. január');
    const row = screen.getByText('2027. január', { selector: 'th' }).closest('tr');
    expect(row.className).toBe('below');
    expect(row.textContent).toContain('⚠');
    expect(screen.getByText('2026. december', { selector: 'th' }).closest('tr').className).toBe('');
  });

  it('nincs figyelmeztetés, ha nem esik alá', async () => {
    vi.stubGlobal('fetch', vi.fn(() => json(forecast(null))));
    render(<ForecastPage />);
    await screen.findByRole('status');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('a küszöb mentése a beállításokat küldi; hibás értéket nem küld', async () => {
    const fetchMock = vi.fn(() => json(forecast(null)));
    vi.stubGlobal('fetch', fetchMock);
    render(<ForecastPage />);
    const input = await screen.findByLabelText('Figyelmeztetési küszöb (Ft)');
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.click(screen.getByText('Mentés'));
    expect((await screen.findByRole('alert')).textContent).toContain('egész szám');
    fireEvent.change(input, { target: { value: '-50.000' } });
    fireEvent.click(screen.getByText('Mentés'));
    await waitFor(() => expect(fetchMock.mock.calls.some(([u, o]) => u === '/api/settings' && o.method === 'PUT' && o.body === '{"forecastThreshold":-50000}')).toBe(true));
  });
});
