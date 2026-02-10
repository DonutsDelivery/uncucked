import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data', 'relay.db');
const DB_DIR = join(__dirname, '..', 'data');

let db;

export async function initDatabase() {
  const SQL = await initSqlJs();

  if (existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL,
      discriminator TEXT,
      avatar TEXT,
      global_name TEXT,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      token_expires_at INTEGER,
      age_verified INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s','now')),
      updated_at INTEGER DEFAULT (strftime('%s','now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS webhook_cache (
      channel_id TEXT PRIMARY KEY,
      webhook_id TEXT NOT NULL,
      webhook_token TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    )
  `);

  saveDb();
  return db;
}

export function saveDb() {
  mkdirSync(DB_DIR, { recursive: true });
  const data = db.export();
  writeFileSync(DB_PATH, Buffer.from(data));
}

export function getDb() {
  return db;
}

// Session helpers
export function upsertSession(user) {
  const existing = db.exec(`SELECT id FROM sessions WHERE user_id = ?`, [user.id]);

  if (existing.length && existing[0].values.length) {
    db.run(
      `UPDATE sessions SET username=?, discriminator=?, avatar=?, global_name=?, access_token=?, refresh_token=?, token_expires_at=?, updated_at=strftime('%s','now')
       WHERE user_id=?`,
      [user.username, user.discriminator || null, user.avatar, user.globalName || null,
       user.accessToken, user.refreshToken, user.tokenExpiresAt, user.id]
    );
  } else {
    db.run(
      `INSERT INTO sessions (user_id, username, discriminator, avatar, global_name, access_token, refresh_token, token_expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [user.id, user.username, user.discriminator || null, user.avatar, user.globalName || null,
       user.accessToken, user.refreshToken, user.tokenExpiresAt]
    );
  }
  saveDb();
}

export function getSession(userId) {
  const result = db.exec(`SELECT * FROM sessions WHERE user_id = ?`, [userId]);
  if (!result.length || !result[0].values.length) return null;
  const cols = result[0].columns;
  const vals = result[0].values[0];
  const row = {};
  cols.forEach((c, i) => row[c] = vals[i]);
  return row;
}

export function setAgeVerified(userId) {
  db.run(`UPDATE sessions SET age_verified = 1, updated_at = strftime('%s','now') WHERE user_id = ?`, [userId]);
  saveDb();
}

// Webhook cache helpers
export function getCachedWebhook(channelId) {
  const result = db.exec(`SELECT * FROM webhook_cache WHERE channel_id = ?`, [channelId]);
  if (!result.length || !result[0].values.length) return null;
  const cols = result[0].columns;
  const vals = result[0].values[0];
  const row = {};
  cols.forEach((c, i) => row[c] = vals[i]);
  return row;
}

export function cacheWebhook(channelId, webhookId, webhookToken) {
  db.run(
    `INSERT OR REPLACE INTO webhook_cache (channel_id, webhook_id, webhook_token) VALUES (?, ?, ?)`,
    [channelId, webhookId, webhookToken]
  );
  saveDb();
}

