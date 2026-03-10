import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === 'production';

// Initialize SQLite
let db: any = null;
try {
  const Database = require('better-sqlite3');
  db = new Database(process.env.DB_PATH || 'pipeline.db');
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
  console.log('SQLite initialized successfully');
} catch (e) {
  console.error('SQLite initialization failed:', e);
}

app.use(express.json({ limit: '10mb' }));

// Health check — no DB dependency
app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true, db: db !== null });
});

// Serve static frontend in production
if (IS_PROD) {
  app.use(express.static(path.join(__dirname, 'dist')));
}

// --- Transactions ---

app.get('/api/transactions', (_req: Request, res: Response) => {
  if (!db) { res.json([]); return; }
  const rows = db.prepare('SELECT data FROM transactions').all() as { data: string }[];
  res.json(rows.map(r => JSON.parse(r.data)));
});

app.post('/api/transactions', (req: Request, res: Response) => {
  const t = req.body;
  db.prepare('INSERT OR REPLACE INTO transactions (id, data, updated_at) VALUES (?, ?, datetime(\'now\'))').run(t.id, JSON.stringify(t));
  res.json(t);
});

app.post('/api/transactions/batch', (req: Request, res: Response) => {
  const items: any[] = req.body;
  const insert = db.prepare('INSERT OR REPLACE INTO transactions (id, data, updated_at) VALUES (?, ?, datetime(\'now\'))');
  const insertMany = db.transaction((rows: any[]) => {
    for (const t of rows) insert.run(t.id, JSON.stringify(t));
  });
  insertMany(items);
  res.json({ ok: true, count: items.length });
});

app.put('/api/transactions/:id', (req: Request, res: Response) => {
  const t = req.body;
  db.prepare('UPDATE transactions SET data = ?, updated_at = datetime(\'now\') WHERE id = ?').run(JSON.stringify(t), req.params.id);
  res.json(t);
});

// Soft delete
app.delete('/api/transactions/:id', (req: Request, res: Response) => {
  const row = db.prepare('SELECT data FROM transactions WHERE id = ?').get(req.params.id) as { data: string } | undefined;
  if (!row) { res.status(404).json({ error: 'Not found' }); return; }
  const t = JSON.parse(row.data);
  t.isDeleted = true;
  t.deletedAt = new Date().toISOString();
  db.prepare('UPDATE transactions SET data = ?, updated_at = datetime(\'now\') WHERE id = ?').run(JSON.stringify(t), req.params.id);
  res.json(t);
});

// Permanent delete
app.delete('/api/transactions/:id/permanent', (req: Request, res: Response) => {
  db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Batch soft delete
app.post('/api/transactions/batch-delete', (req: Request, res: Response) => {
  const { ids }: { ids: string[] } = req.body;
  const deletedAt = new Date().toISOString();
  const update = db.prepare('UPDATE transactions SET data = json_set(data, \'$.isDeleted\', 1, \'$.deletedAt\', ?), updated_at = datetime(\'now\') WHERE id = ?');
  const updateMany = db.transaction(() => {
    for (const id of ids) update.run(deletedAt, id);
  });
  updateMany();
  res.json({ ok: true });
});

// Batch permanent delete
app.post('/api/transactions/batch-delete-permanent', (req: Request, res: Response) => {
  const { ids }: { ids: string[] } = req.body;
  const del = db.prepare('DELETE FROM transactions WHERE id = ?');
  const deleteMany = db.transaction(() => {
    for (const id of ids) del.run(id);
  });
  deleteMany();
  res.json({ ok: true });
});

// --- Leads ---

app.get('/api/leads', (_req: Request, res: Response) => {
  if (!db) { res.json([]); return; }
  const rows = db.prepare('SELECT data FROM leads').all() as { data: string }[];
  res.json(rows.map(r => JSON.parse(r.data)));
});

app.post('/api/leads', (req: Request, res: Response) => {
  const l = req.body;
  db.prepare('INSERT OR REPLACE INTO leads (id, data, updated_at) VALUES (?, ?, datetime(\'now\'))').run(l.id, JSON.stringify(l));
  res.json(l);
});

app.post('/api/leads/batch', (req: Request, res: Response) => {
  const items: any[] = req.body;
  const insert = db.prepare('INSERT OR REPLACE INTO leads (id, data, updated_at) VALUES (?, ?, datetime(\'now\'))');
  const insertMany = db.transaction((rows: any[]) => {
    for (const l of rows) insert.run(l.id, JSON.stringify(l));
  });
  insertMany(items);
  res.json({ ok: true, count: items.length });
});

app.put('/api/leads/:id', (req: Request, res: Response) => {
  const l = req.body;
  db.prepare('UPDATE leads SET data = ?, updated_at = datetime(\'now\') WHERE id = ?').run(JSON.stringify(l), req.params.id);
  res.json(l);
});

// Soft delete
app.delete('/api/leads/:id', (req: Request, res: Response) => {
  const row = db.prepare('SELECT data FROM leads WHERE id = ?').get(req.params.id) as { data: string } | undefined;
  if (!row) { res.status(404).json({ error: 'Not found' }); return; }
  const l = JSON.parse(row.data);
  l.isDeleted = true;
  l.deletedAt = new Date().toISOString();
  db.prepare('UPDATE leads SET data = ?, updated_at = datetime(\'now\') WHERE id = ?').run(JSON.stringify(l), req.params.id);
  res.json(l);
});

// Permanent delete
app.delete('/api/leads/:id/permanent', (req: Request, res: Response) => {
  db.prepare('DELETE FROM leads WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Batch soft delete
app.post('/api/leads/batch-delete', (req: Request, res: Response) => {
  const { ids }: { ids: string[] } = req.body;
  const deletedAt = new Date().toISOString();
  const update = db.prepare('UPDATE leads SET data = json_set(data, \'$.isDeleted\', 1, \'$.deletedAt\', ?), updated_at = datetime(\'now\') WHERE id = ?');
  const updateMany = db.transaction(() => {
    for (const id of ids) update.run(deletedAt, id);
  });
  updateMany();
  res.json({ ok: true });
});

// Batch permanent delete
app.post('/api/leads/batch-delete-permanent', (req: Request, res: Response) => {
  const { ids }: { ids: string[] } = req.body;
  const del = db.prepare('DELETE FROM leads WHERE id = ?');
  const deleteMany = db.transaction(() => {
    for (const id of ids) del.run(id);
  });
  deleteMany();
  res.json({ ok: true });
});

// Catch-all: serve React app in production
if (IS_PROD) {
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (${IS_PROD ? 'production' : 'development'})`);
});
