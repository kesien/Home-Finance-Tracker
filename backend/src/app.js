import express from 'express';

export function createApp({ db }) {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    const row = db.prepare('SELECT 1 AS ok').get();
    res.json({ status: 'ok', db: row.ok === 1 });
  });

  return app;
}
