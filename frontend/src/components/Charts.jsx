import { ResponsiveContainer, ReferenceLine, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { formatMoney, categoryColor } from '../format.js';
import { incomeKey } from '../stats.js';

const AXIS = { stroke: '#8b93a7', fontSize: 12 };
const TOOLTIP = { contentStyle: { background: '#181b22', border: '1px solid #2a2f3a', borderRadius: 8 }, labelStyle: { color: '#e8eaf0' }, itemStyle: { color: '#e8eaf0' } };
export const INCOME_COLORS = ['#3dbb8c', '#5b8def', '#e5a23a', '#9a7be0', '#4cc3d9', '#d4608f'];
const compact = (v) => (Math.abs(v) >= 1e6 ? `${Math.round(v / 1e5) / 10}M` : Math.abs(v) >= 1e3 ? `${Math.round(v / 1e3)}e` : v);

/** Képernyőolvasóval és billentyűzettel is elérhető táblázat a diagram adataihoz. */
export function DataTable({ caption, columns, rows }) {
  return (
    <details className="data-table">
      <summary>Adatok táblázatként</summary>
      <table>
        <caption className="sr-only">{caption}</caption>
        <thead><tr>{columns.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((cell, j) => (j === 0 ? <th key={j} scope="row">{cell}</th> : <td key={j}>{cell}</td>))}</tr>)}</tbody>
      </table>
    </details>
  );
}

/** Kategória-megoszlás tortadiagramon; `data`: [{id, name, value}]. */
export function CategoryPie({ data }) {
  if (data.length === 0) return <p className="muted">Nincs megjeleníthető kiadás.</p>;
  const total = data.reduce((sum, c) => sum + c.value, 0);
  return (
    <>
    <div className="chart" role="img" aria-label={`Kiadások kategóriák szerint, összesen ${formatMoney(total)}; részletek a táblázatban`}>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2} stroke="none">
            {data.map((c) => <Cell key={c.id} fill={categoryColor(c.id)} />)}
          </Pie>
          <Tooltip {...TOOLTIP} formatter={(v) => formatMoney(v)} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
    <DataTable caption="Kiadások kategóriák szerint" columns={['Kategória', 'Összeg', 'Arány']}
      rows={data.map((c) => [c.name, formatMoney(c.value), `${Math.round((c.value / total) * 100)}%`])} />
    </>
  );
}

export function TrendChart({ data }) {
  return (
    <>
    <div className="chart" role="img" aria-label="Havi trend: bevétel, kiadás és megtakarítás hónapokon át; részletek a táblázatban">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
          <CartesianGrid stroke="#2a2f3a" vertical={false} />
          <XAxis dataKey="label" {...AXIS} />
          <YAxis {...AXIS} tickFormatter={compact} width={44} />
          <Tooltip {...TOOLTIP} formatter={(v) => formatMoney(v)} />
          <Legend />
          <Line type="monotone" dataKey="income" name="Bevétel" stroke="#3dbb8c" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="expense" name="Kiadás" stroke="#ef6b6b" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="savings" name="Megtakarítás" stroke="#5b8def" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
    <DataTable caption="Havi trend" columns={['Hónap', 'Bevétel', 'Kiadás', 'Megtakarítás']}
      rows={data.map((d) => [d.label, formatMoney(d.income), formatMoney(d.expense), formatMoney(d.savings)])} />
    </>
  );
}

export function IncomeStack({ rows, names }) {
  return (
    <>
    <div className="chart" role="img" aria-label="Bevételi összetétel havonként; részletek a táblázatban">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={rows} margin={{ left: 0, right: 8, top: 8 }}>
          <CartesianGrid stroke="#2a2f3a" vertical={false} />
          <XAxis dataKey="label" {...AXIS} />
          <YAxis {...AXIS} tickFormatter={compact} width={44} />
          <Tooltip {...TOOLTIP} formatter={(v) => formatMoney(v)} cursor={{ fill: '#ffffff10' }} />
          <Legend />
          {names.map((n, i) => <Bar key={n} dataKey={incomeKey(n)} name={n} stackId="i" fill={INCOME_COLORS[i % INCOME_COLORS.length]} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
    <DataTable caption="Bevételi összetétel havonként" columns={['Hónap', ...names]}
      rows={rows.map((r) => [r.label, ...names.map((n) => formatMoney(r[incomeKey(n)] ?? 0))])} />
    </>
  );
}

/** Egyenleg-előrejelzés vonaldiagramja a küszöb jelölésével; `data`: [{label, balance}]. */
export function ForecastChart({ data, threshold }) {
  return (
    <div className="chart" role="img" aria-label="Várható egyenleg a következő 12 hónapban; részletek a táblázatban">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
          <CartesianGrid stroke="#2a2f3a" vertical={false} />
          <XAxis dataKey="label" {...AXIS} />
          <YAxis {...AXIS} tickFormatter={compact} width={44} />
          <Tooltip {...TOOLTIP} formatter={(v) => formatMoney(v)} />
          <ReferenceLine y={threshold} stroke="#ef6b6b" strokeDasharray="5 4" label={{ value: 'Küszöb', fill: '#ef6b6b', fontSize: 12, position: 'insideBottomRight' }} />
          <Line type="monotone" dataKey="balance" name="Egyenleg" stroke="#5b8def" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
