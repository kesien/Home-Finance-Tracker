// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import SettingsPage from './SettingsPage.jsx';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const json = (body, status = 200) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });

function mockApi(extra = () => null) {
  const calls = [];
  vi.stubGlobal('fetch', vi.fn((url, opts = {}) => {
    calls.push([url, opts.method ?? 'GET', opts.body]);
    return extra(url, opts) ?? (url === '/api/settings' ? json({ avgN: 3, forecastThreshold: 0 }) : url === '/api/backups' && (opts.method ?? 'GET') === 'GET' ? json([{ name: 'finance-2026-11-15.db', size: 40960, modified: '2026-11-15T03:00:00Z', kind: 'daily' }]) : json({}));
  }));
  return calls;
}

describe('SettingsPage', () => {
  it('betölti a beállításokat és a mentéseket', async () => {
    mockApi();
    render(<SettingsPage />);
    expect((await screen.findByLabelText(/hány hónapot/)).value).toBe('3');
    expect(screen.getByText('finance-2026-11-15.db')).toBeTruthy();
  });

  it('érvénytelen N-t nem küld el, az érvényeset igen', async () => {
    const calls = mockApi();
    render(<SettingsPage />);
    const n = await screen.findByLabelText(/hány hónapot/);
    fireEvent.change(n, { target: { value: '0' } });
    fireEvent.click(screen.getAllByText('Mentés')[0]);
    expect((await screen.findByRole('alert')).textContent).toContain('1 és 60');
    expect(calls.some(([, m]) => m === 'PUT')).toBe(false);
    fireEvent.change(n, { target: { value: '6' } });
    fireEvent.change(screen.getByLabelText(/küszöbe/), { target: { value: '-20.000' } });
    fireEvent.click(screen.getAllByText('Mentés')[0]);
    await waitFor(() => expect(calls.find(([, m]) => m === 'PUT')?.[2]).toBe('{"avgN":6,"forecastThreshold":-20000}'));
  });

  it('import: megerősítés nélkül nem küld semmit, megerősítéssel igen', async () => {
    const calls = mockApi((url) => (url === '/api/import' ? json({ months: 2, categories: 11, backup: 'finance-pre-import-x.db' }) : null));
    render(<SettingsPage />);
    const input = await screen.findByLabelText('Import fájl kiválasztása');
    const file = new File([JSON.stringify({ months: [{}, {}] })], 'x.json', { type: 'application/json' });
    vi.stubGlobal('confirm', vi.fn(() => false));
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(calls.some(([u]) => u === '/api/import')).toBe(false);
    vi.stubGlobal('confirm', vi.fn(() => true));
    fireEvent.change(input, { target: { files: [file] } });
    expect((await screen.findByRole('status')).textContent).toContain('Import kész: 2 hónap');
  });

  it('nem JSON fájlt elutasít', async () => {
    mockApi();
    render(<SettingsPage />);
    const input = await screen.findByLabelText('Import fájl kiválasztása');
    fireEvent.change(input, { target: { files: [new File(['nem json'], 'x.json')] } });
    expect((await screen.findByRole('alert')).textContent).toContain('nem érvényes JSON');
  });
});
