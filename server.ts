import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === 'production';

// Webhook secret for SendGrid inbound parse — set EMAIL_WEBHOOK_SECRET in .env.local
const EMAIL_WEBHOOK_SECRET = process.env.EMAIL_WEBHOOK_SECRET || '';

// --- Authentication ---
const APP_PASSWORD = process.env.APP_PASSWORD || '';
const AUTH_ENABLED = APP_PASSWORD.length > 0;
const SESSION_COOKIE = 'lao_session';
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SESSION_SECRET = process.env.SESSION_SECRET || (() => {
  const s = crypto.randomBytes(32).toString('hex');
  if (IS_PROD) console.warn('[auth] SESSION_SECRET not set — sessions will reset on restart');
  return s;
})();

function signToken(payload: string): string {
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token: string): { exp: number } | null {
  const lastDot = token.lastIndexOf('.');
  if (lastDot < 0) return null;
  const payload = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString()); } catch { return null; }
}

function parseCookies(req: Request): Record<string, string> {
  const cookies: Record<string, string> = {};
  (req.headers.cookie || '').split(';').forEach(c => {
    const eq = c.indexOf('=');
    if (eq > 0) cookies[c.slice(0, eq).trim()] = decodeURIComponent(c.slice(eq + 1).trim());
  });
  return cookies;
}

function requireAuth(req: Request, res: Response, next: express.NextFunction) {
  if (!AUTH_ENABLED) { next(); return; }
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token) { res.status(401).json({ error: 'unauthenticated' }); return; }
  const data = verifyToken(token);
  if (!data || Date.now() > data.exp) { res.status(401).json({ error: 'session expired' }); return; }
  next();
}

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
    CREATE TABLE IF NOT EXISTS action_log (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS inbox_items (
      id         TEXT PRIMARY KEY,
      data       TEXT NOT NULL,
      received_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS standalone_contacts (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS preferences (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
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

// --- Auth endpoints (no auth required) ---

app.post('/api/auth/login', (req: Request, res: Response) => {
  if (!AUTH_ENABLED) { res.json({ ok: true }); return; }
  const { password } = req.body as { password?: string };
  if (password !== APP_PASSWORD) { res.status(401).json({ error: 'Invalid password' }); return; }
  const now = Date.now();
  const payload = Buffer.from(JSON.stringify({ iat: now, exp: now + SESSION_MAX_AGE_MS })).toString('base64url');
  const token = signToken(payload);
  const secure = IS_PROD ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_MS / 1000}${secure}`);
  res.json({ ok: true });
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  if (!AUTH_ENABLED) { res.json({ authenticated: true, authEnabled: false }); return; }
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token) { res.json({ authenticated: false, authEnabled: true }); return; }
  const data = verifyToken(token);
  if (!data || Date.now() > data.exp) { res.json({ authenticated: false, authEnabled: true }); return; }
  res.json({ authenticated: true, authEnabled: true });
});

app.post('/api/auth/logout', (_req: Request, res: Response) => {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`);
  res.json({ ok: true });
});

// POST /api/email-inbox — registered BEFORE auth guard so external services (Google Apps Script, SendGrid) can POST without a session cookie
// Accepts:
//   - application/json        ← Google Apps Script bridge
//   - multipart/form-data     ← SendGrid Inbound Parse
//   - application/x-www-form-urlencoded ← fallback
app.post('/api/email-inbox', (req: Request, res: Response) => {
  if (!db) { res.status(503).json({ error: 'db unavailable' }); return; }

  // Optional webhook secret check
  if (EMAIL_WEBHOOK_SECRET) {
    const provided = req.headers['x-webhook-secret'] || req.headers['x-sendgrid-webhook-secret'];
    if (provided !== EMAIL_WEBHOOK_SECRET) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
  }

  // JSON payload (Google Apps Script sends application/json)
  if (req.is('application/json')) {
    processEmailPayload(req, res, []);
    return;
  }

  // Multipart (SendGrid) or urlencoded fallback
  const upload = getMulter();
  if (!upload) {
    express.urlencoded({ extended: true, limit: '10mb' })(req, res, () => {
      processEmailPayload(req, res, []);
    });
    return;
  }

  upload.any()(req, res, (err: any) => {
    if (err) {
      console.error('Multer error:', err);
      res.status(400).json({ error: 'Failed to parse multipart payload' });
      return;
    }
    const files = (req as any).files as Express.Multer.File[] | undefined;
    processEmailPayload(req, res, files || []);
  });
});

// Apply auth guard to all remaining /api/* routes
app.use('/api', requireAuth);

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

// --- Action Log ---

app.get('/api/action-log', (_req: Request, res: Response) => {
  if (!db) { res.json([]); return; }
  const rows = db.prepare('SELECT data FROM action_log ORDER BY timestamp DESC LIMIT 50').all() as { data: string }[];
  res.json(rows.map(r => JSON.parse(r.data)));
});

app.post('/api/action-log', (req: Request, res: Response) => {
  if (!db) { res.json(req.body); return; }
  const entry = req.body;
  db.prepare('INSERT OR REPLACE INTO action_log (id, data, timestamp) VALUES (?, ?, ?)').run(
    entry.id,
    JSON.stringify(entry),
    entry.timestamp
  );
  // Prune entries older than 30 days to keep DB lean
  db.prepare("DELETE FROM action_log WHERE timestamp < datetime('now', '-30 days')").run();
  res.json(entry);
});

app.delete('/api/action-log/:id', (req: Request, res: Response) => {
  if (!db) { res.json({ ok: true }); return; }
  db.prepare('DELETE FROM action_log WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// --- Email Inbox ---

// Lazy-load multer only when needed (graceful degradation if not installed)
function getMulter() {
  try {
    const multer = require('multer');
    return multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
  } catch {
    return null;
  }
}

// Helper — extract display name and email from "Name <email@example.com>" or plain "email@example.com"
function parseEmailAddress(raw: string): { name: string; email: string } {
  if (!raw) return { name: '', email: '' };
  const match = raw.match(/^(.+?)\s*<(.+?)>\s*$/);
  if (match) {
    return {
      name: match[1].replace(/^["']|["']$/g, '').trim(),
      email: match[2].trim(),
    };
  }
  return { name: '', email: raw.trim() };
}

// Helper — generate initials avatar color from email string
function emailToColor(email: string): string {
  const colors = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6'];
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function processEmailPayload(req: Request, res: Response, files: any[]) {
  try {
    const body = req.body as Record<string, string>;

    const fromRaw  = body.from  ?? body.sender ?? '';
    const toRaw    = body.to    ?? body.recipient ?? '';
    const subject  = body.subject ?? '(no subject)';
    const bodyText = body.text  ?? body.plain ?? '';
    const bodyHtml = body.html  ?? '';

    const { name: fromName, email: fromEmail } = parseEmailAddress(fromRaw);
    const avatarColor = emailToColor(fromEmail);

    // Build attachments array from multer files
    const attachments = files
      .filter(f => f.fieldname?.startsWith('attachment'))
      .map(f => ({
        id: Math.random().toString(36).substr(2, 9),
        filename: f.originalname ?? 'attachment',
        contentType: f.mimetype ?? 'application/octet-stream',
        size: f.size ?? 0,
        data: (f.buffer as Buffer)?.toString('base64') ?? '',
      }));

    const id = `email_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    const item = {
      id,
      from: fromEmail,
      fromName: fromName || fromEmail.split('@')[0],
      fromRaw,
      to: toRaw,
      subject,
      bodyText,
      bodyHtml,
      receivedAt: new Date().toISOString(),
      isRead: false,
      attachments,
      avatarColor,
      assignedTo: null,
      isDeleted: false,
    };

    db.prepare('INSERT INTO inbox_items (id, data) VALUES (?, ?)').run(id, JSON.stringify(item));
    console.log(`Email received: "${subject}" from ${fromEmail}`);
    res.status(200).json({ ok: true, id });
  } catch (err) {
    console.error('Email processing error:', err);
    res.status(500).json({ error: 'processing failed' });
  }
}

// GET /api/inbox — fetch all non-deleted items newest first
app.get('/api/inbox', (_req: Request, res: Response) => {
  if (!db) { res.json([]); return; }
  const rows = db.prepare(
    "SELECT data FROM inbox_items ORDER BY received_at DESC LIMIT 500"
  ).all() as { data: string }[];
  const items = rows.map(r => JSON.parse(r.data)).filter((i: any) => !i.isDeleted);
  res.json(items);
});

// PUT /api/inbox/:id — update (mark read, assign, etc.)
app.put('/api/inbox/:id', (req: Request, res: Response) => {
  if (!db) { res.status(503).json({ error: 'db unavailable' }); return; }
  const row = db.prepare('SELECT data FROM inbox_items WHERE id = ?').get(req.params.id) as { data: string } | undefined;
  if (!row) { res.status(404).json({ error: 'not found' }); return; }
  const merged = { ...JSON.parse(row.data), ...req.body };
  db.prepare('UPDATE inbox_items SET data = ? WHERE id = ?').run(JSON.stringify(merged), req.params.id);
  res.json(merged);
});

// DELETE /api/inbox/:id — soft delete
app.delete('/api/inbox/:id', (req: Request, res: Response) => {
  if (!db) { res.status(503).json({ error: 'db unavailable' }); return; }
  const row = db.prepare('SELECT data FROM inbox_items WHERE id = ?').get(req.params.id) as { data: string } | undefined;
  if (!row) { res.status(404).json({ error: 'not found' }); return; }
  const item = { ...JSON.parse(row.data), isDeleted: true, deletedAt: new Date().toISOString() };
  db.prepare('UPDATE inbox_items SET data = ? WHERE id = ?').run(JSON.stringify(item), req.params.id);
  res.json({ ok: true });
});

// GET /api/inbox/unread-count — lightweight badge endpoint
app.get('/api/inbox/unread-count', (_req: Request, res: Response) => {
  if (!db) { res.json({ count: 0 }); return; }
  const rows = db.prepare("SELECT data FROM inbox_items WHERE json_extract(data,'$.isDeleted') != 1").all() as { data: string }[];
  const count = rows.filter(r => {
    try { return !JSON.parse(r.data).isRead; } catch { return false; }
  }).length;
  res.json({ count });
});

// --- Standalone Contacts ---

app.get('/api/contacts', (_req: Request, res: Response) => {
  if (!db) { res.json([]); return; }
  const rows = db.prepare('SELECT data FROM standalone_contacts').all() as { data: string }[];
  res.json(rows.map((r: { data: string }) => JSON.parse(r.data)));
});

app.post('/api/contacts', (req: Request, res: Response) => {
  if (!db) { res.status(503).json({ error: 'db unavailable' }); return; }
  const c = req.body;
  db.prepare('INSERT OR REPLACE INTO standalone_contacts (id, data, updated_at) VALUES (?, ?, datetime(\'now\'))').run(c.id, JSON.stringify(c));
  res.json(c);
});

app.put('/api/contacts/:id', (req: Request, res: Response) => {
  if (!db) { res.status(503).json({ error: 'db unavailable' }); return; }
  const c = req.body;
  db.prepare('UPDATE standalone_contacts SET data = ?, updated_at = datetime(\'now\') WHERE id = ?').run(JSON.stringify(c), req.params.id);
  res.json(c);
});

app.delete('/api/contacts/:id', (req: Request, res: Response) => {
  if (!db) { res.status(503).json({ error: 'db unavailable' }); return; }
  db.prepare('DELETE FROM standalone_contacts WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// --- Preferences ---

app.get('/api/preferences', (_req: Request, res: Response) => {
  if (!db) { res.json({}); return; }
  const rows = db.prepare('SELECT key, value FROM preferences').all() as { key: string; value: string }[];
  const prefs: Record<string, unknown> = {};
  rows.forEach((r: { key: string; value: string }) => {
    try { prefs[r.key] = JSON.parse(r.value); } catch { prefs[r.key] = r.value; }
  });
  res.json(prefs);
});

app.post('/api/preferences', (req: Request, res: Response) => {
  if (!db) { res.status(503).json({ error: 'db unavailable' }); return; }
  const updates = req.body as Record<string, unknown>;
  const upsert = db.prepare('INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)');
  const upsertMany = db.transaction(() => {
    Object.entries(updates).forEach(([k, v]) => upsert.run(k, JSON.stringify(v)));
  });
  upsertMany();
  res.json({ ok: true });
});

// Catch-all: serve React app in production
if (IS_PROD) {
  app.get('*', (_req: Request, res: Response) => {
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) res.status(200).send('<html><body><p>App is starting up. Please refresh in a moment.</p></body></html>');
    });
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (${IS_PROD ? 'production' : 'development'})`);
});
