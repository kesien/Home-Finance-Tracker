export const MONTH_NAMES = ['január', 'február', 'március', 'április', 'május', 'június', 'július', 'augusztus', 'szeptember', 'október', 'november', 'december'];

/** 832000 → "832.000,-" (negatív: "-832.000,-"). */
export function formatMoney(n) {
  const v = Math.round(Number(n) || 0);
  const s = String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${v < 0 ? '-' : ''}${s},-`;
}

export const monthLabel = (year, month) => `${year}. ${MONTH_NAMES[month - 1]}`;

/** "832 000", "832.000,-" stb. → 832000; érvénytelen esetén null. */
export function parseAmount(text) {
  const cleaned = String(text).replace(/,-$/, '').replace(/[\s.]/g, '');
  if (!/^\d+$/.test(cleaned)) return null;
  return Number(cleaned);
}

export function shiftMonth(year, month, delta) {
  const idx = year * 12 + (month - 1) + delta;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

const PALETTE = ['#5b8def', '#e5a23a', '#3dbb8c', '#d4608f', '#9a7be0', '#4cc3d9', '#e0745a', '#a3c64b', '#d9b84a', '#7a8bb5', '#c76fd6', '#8a8f9c'];
export const categoryColor = (id) => PALETTE[(Number(id) - 1 + PALETTE.length) % PALETTE.length];

/** Előjeles egész (egyenlegekhez, a számla negatív is lehet): "-15000", "−15.000,-" → -15000; érvénytelenre null. */
export function parseSigned(text) {
  const t = String(text).trim().replace(/^[−–]/, '-');
  const neg = t.startsWith('-');
  const v = parseAmount(neg ? t.slice(1) : t);
  return v === null ? null : neg ? -v : v;
}
