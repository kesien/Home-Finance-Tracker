// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App.jsx';

describe('App', () => {
  it('megjeleníti a címet', () => {
    render(<App />);
    expect(screen.getByText('Háztartási költségkövető')).toBeTruthy();
  });
});
