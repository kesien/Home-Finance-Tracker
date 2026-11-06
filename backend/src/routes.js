import { Router } from 'express';
import { HttpError } from './service.js';

const id = (req) => {
  const n = Number(req.params.id);
  if (!Number.isInteger(n)) throw new HttpError(400, 'Érvénytelen azonosító');
  return n;
};
const ym = (req) => [Number(req.params.year), Number(req.params.month)];

export function createRouter(svc, now = () => new Date()) {
  const r = Router();

  r.get('/settings', (_q, res) => res.json(svc.getSettings()));
  r.put('/settings', (q, res) => res.json(svc.updateSettings(q.body)));

  r.get('/categories', (_q, res) => res.json(svc.listCategories()));
  r.post('/categories', (q, res) => res.status(201).json(svc.createCategory(q.body)));
  r.patch('/categories/:id', (q, res) => res.json(svc.renameCategory(id(q), q.body)));
  r.delete('/categories/:id', (q, res) => (svc.deleteCategory(id(q)), res.status(204).end()));

  r.get('/forecast', (q, res) => {
    const { year, month } = q.query;
    res.json(svc.forecastFor(now(), year === undefined ? undefined : Number(year), month === undefined ? undefined : Number(month)));
  });
  r.get('/stats', (_q, res) => res.json(svc.stats()));
  r.get('/months', (_q, res) => res.json(svc.listMonths()));
  r.post('/months', (q, res) => res.status(201).json(svc.createMonth(q.body)));
  r.get('/months/:year/:month', (q, res) => res.json(svc.monthDetail(...ym(q))));
  r.patch('/months/:year/:month', (q, res) => res.json(svc.updateBalances(...ym(q), q.body)));
  r.delete('/months/:year/:month', (q, res) => (svc.deleteMonth(...ym(q)), res.status(204).end()));

  r.post('/months/:year/:month/incomes', (q, res) => res.status(201).json(svc.createIncome(...ym(q), q.body)));
  r.patch('/incomes/:id', (q, res) => res.json(svc.updateIncome(id(q), q.body)));
  r.delete('/incomes/:id', (q, res) => (svc.deleteIncome(id(q)), res.status(204).end()));

  r.post('/months/:year/:month/expenses', (q, res) => res.status(201).json(svc.createExpense(...ym(q), q.body)));
  r.patch('/expenses/:id', (q, res) => res.json(svc.updateExpense(id(q), q.body)));
  r.delete('/expenses/:id', (q, res) => (svc.deleteExpense(id(q)), res.status(204).end()));

  // eslint-disable-next-line no-unused-vars
  r.use((err, _req, res, _next) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: 'Szerverhiba' });
  });
  return r;
}
