import { describe, it, expect } from 'vitest';
import { formatMoney, parseAmount, shiftMonth, monthLabel } from './format.js';

describe('formatMoney', () => {
  it('magyar formátum', () => {
    expect(formatMoney(832000)).toBe('832.000,-');
    expect(formatMoney(0)).toBe('0,-');
    expect(formatMoney(1234567)).toBe('1.234.567,-');
    expect(formatMoney(-15000)).toBe('-15.000,-');
  });
});
describe('parseAmount', () => {
  it('több bevitelt is elfogad', () => {
    expect(parseAmount('832000')).toBe(832000);
    expect(parseAmount('832 000')).toBe(832000);
    expect(parseAmount('832.000,-')).toBe(832000);
  });
  it('érvénytelenre null', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('12,5')).toBeNull();
    expect(parseAmount('-5')).toBeNull();
  });
});
describe('hónap segédek', () => {
  it('shiftMonth évet vált', () => {
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
  });
  it('monthLabel', () => expect(monthLabel(2026, 11)).toBe('2026. november'));
});
