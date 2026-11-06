// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import App from './App.jsx';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('App', () => {
  it('megjeleníti a navigációt', () => {
    render(<App />);
    expect(screen.getByRole('navigation', { name: 'Fő navigáció' })).toBeTruthy();
    expect(screen.getByText('Kategóriák')).toBeTruthy();
  });
});
