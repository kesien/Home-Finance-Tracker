import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { formatMoney, categoryColor } from '../format.js';

const AXIS = { stroke: '#8b93a7', fontSize: 12 };
const TOOLTIP = { contentStyle: { background: '#181b22', border: '1px solid #2a2f3a', borderRadius: 8 }, labelStyle: { color: '#e8eaf0' }, itemStyle: { color: '#e8eaf0' } };
export const INCOME_COLORS = ['#3dbb8c', '#5b8def', '#e5a23a', '#9a7be0', '#4cc3d9', '#d4608f'];
const compact = (v) => (Math.abs(v) >= 1e6 ? `${Math.round(v / 1e5) / 10}M` : Math.abs(v) >= 1e3 ? `${Math.round(v / 1e3)}e` : v);

/** Kategória-megoszlás tortadiagramon; `data`: [{id, name, value}]. */
export function CategoryPie({ data }) {
  if (data.length === 0) return <p className="muted">Nincs megjeleníthető kiadás.</p>;
  return (
    <div className="chart" role="img" aria-label="Kiadások kategóriák szerint">
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
  );
}

export function TrendChart({ data }) {
  return (
    <div className="chart" role="img" aria-label="Havi trend: bevétel, kiadás, megtakarítás">
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
  );
}

export function IncomeStack({ rows, names }) {
  return (
    <div className="chart" role="img" aria-label="Bevételi összetétel havonként">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={rows} margin={{ left: 0, right: 8, top: 8 }}>
          <CartesianGrid stroke="#2a2f3a" vertical={false} />
          <XAxis dataKey="label" {...AXIS} />
          <YAxis {...AXIS} tickFormatter={compact} width={44} />
          <Tooltip {...TOOLTIP} formatter={(v) => formatMoney(v)} cursor={{ fill: '#ffffff10' }} />
          <Legend />
          {names.map((n, i) => <Bar key={n} dataKey={n} stackId="i" fill={INCOME_COLORS[i % INCOME_COLORS.length]} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
