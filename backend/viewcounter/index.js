import cors from 'cors';
import express from 'express';
import Database from 'better-sqlite3';

const PORT = process.env.PORT ?? 3001;
const DB_PATH = process.env.DB_PATH ?? '/data/views.db';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? 'https://uahic.github.io';
const SLUG_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9/_-]{0,199}$/;

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(`
	CREATE TABLE IF NOT EXISTS views (
		slug TEXT PRIMARY KEY,
		count INTEGER NOT NULL DEFAULT 0
	)
`);

const getStmt = db.prepare('SELECT count FROM views WHERE slug = ?');
const incrStmt = db.prepare(`
	INSERT INTO views (slug, count) VALUES (?, 1)
	ON CONFLICT(slug) DO UPDATE SET count = count + 1
`);

const app = express();
app.use(cors({ origin: ALLOWED_ORIGIN }));

app.get('/health', (_req, res) => res.send('ok'));

app.get('/api/views/:slug', (req, res) => {
	const { slug } = req.params;
	if (!SLUG_PATTERN.test(slug)) return res.status(400).json({ error: 'invalid slug' });
	const row = getStmt.get(slug);
	res.json({ slug, views: row?.count ?? 0 });
});

app.post('/api/views/:slug', (req, res) => {
	const { slug } = req.params;
	if (!SLUG_PATTERN.test(slug)) return res.status(400).json({ error: 'invalid slug' });
	incrStmt.run(slug);
	const row = getStmt.get(slug);
	res.json({ slug, views: row.count });
});

app.listen(PORT, () => {
	console.log(`viewcounter listening on :${PORT}, allowed origin: ${ALLOWED_ORIGIN}`);
});
