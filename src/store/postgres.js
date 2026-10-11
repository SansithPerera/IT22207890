'use strict';
// PostgreSQL storage: content and uploaded files live in the database, so
// nothing is lost when a hosting instance restarts (Render, Vercel, Railway…).
// Works with Neon, Supabase, Render Postgres or any PostgreSQL 12+.
// Tables are prefixed with bl_ so they can share a database with other apps.

const SCHEMA = [
  'CREATE TABLE IF NOT EXISTS bl_settings (id INTEGER PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS bl_items (id TEXT PRIMARY KEY, coll TEXT NOT NULL, data TEXT NOT NULL, updated_at TEXT NOT NULL)',
  'CREATE INDEX IF NOT EXISTS bl_items_coll ON bl_items (coll)',
  'CREATE TABLE IF NOT EXISTS bl_files (id TEXT PRIMARY KEY, name TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL, kind TEXT NOT NULL, created_at TEXT NOT NULL, data BYTEA NOT NULL)',
];

// Several server instances can start at the same moment (Vercel starts one per
// burst of traffic). This lock makes them create tables and load the starter
// content one at a time.
const SETUP_LOCK = 'SELECT pg_advisory_xact_lock(727400)';

// A serverless function can be paused between requests, and the database may
// close idle connections meanwhile. Such errors are retried once on a fresh one.
const CONNECTION_CODES = new Set(['ECONNRESET', 'EPIPE', 'ETIMEDOUT', '57P01', '57P02', '57P03', '08000', '08003', '08006']);
const isConnectionError = (err) => Boolean(err) && (CONNECTION_CODES.has(err.code)
  || /Connection terminated|connection timeout|Client has encountered a connection error|Connection ended unexpectedly/i.test(String(err.message)));

class PostgresStore {
  constructor(connectionString) {
    let pg;
    try {
      pg = require('pg');
    } catch (err) {
      throw new Error('DATABASE_URL is set but the "pg" package is missing. Run "npm install" first.');
    }
    const serverless = Boolean(process.env.VERCEL);
    this.pool = new pg.Pool({
      connectionString,
      max: serverless ? 3 : 4,
      idleTimeoutMillis: serverless ? 10000 : 30000,
      connectionTimeoutMillis: 20000, // a sleeping Neon database takes a few seconds to wake up
    });
    this.pool.on('error', (err) => console.error('[db] idle client error:', err.message));
    this.host = (() => { try { return new URL(connectionString).hostname; } catch { return 'database'; } })();
  }

  info() {
    return { driver: 'postgres', label: 'PostgreSQL', location: this.host };
  }

  async query(text, params) {
    try {
      return await this.pool.query(text, params);
    } catch (err) {
      if (!isConnectionError(err)) throw err;
      return this.pool.query(text, params);
    }
  }

  async transaction(fn, retried = false) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
    } catch (err) {
      client.release(err); // a truthy argument discards the broken connection
      if (!retried && isConnectionError(err)) return this.transaction(fn, true);
      throw err;
    }
    try {
      const result = await fn(client);
      await client.query('COMMIT');
      client.release();
      return result;
    } catch (err) {
      let broken = isConnectionError(err) ? err : null;
      try { await client.query('ROLLBACK'); } catch (rollbackErr) { broken = rollbackErr; }
      client.release(broken || undefined);
      throw err;
    }
  }

  async init() {
    await this.transaction(async (db) => {
      await db.query(SETUP_LOCK);
      for (const sql of SCHEMA) await db.query(sql);
    });
  }

  async isEmpty() {
    const { rows } = await this.query('SELECT COUNT(*) AS n FROM bl_settings');
    return Number(rows[0].n) === 0;
  }

  async loadAll() {
    const settingsRes = await this.query('SELECT data FROM bl_settings WHERE id = 1');
    const itemsRes = await this.query('SELECT coll, data FROM bl_items');
    const collections = {};
    for (const row of itemsRes.rows) (collections[row.coll] ||= []).push(JSON.parse(row.data));
    return {
      settings: settingsRes.rows[0] ? JSON.parse(settingsRes.rows[0].data) : {},
      collections,
    };
  }

  async writeAll(db, { settings, collections }) {
    const now = new Date().toISOString();
    await db.query('DELETE FROM bl_items');
    await db.query('DELETE FROM bl_settings');
    await db.query('INSERT INTO bl_settings (id, data, updated_at) VALUES (1, $1, $2)', [JSON.stringify(settings), now]);
    for (const [coll, items] of Object.entries(collections)) {
      for (const item of items) {
        await db.query('INSERT INTO bl_items (id, coll, data, updated_at) VALUES ($1, $2, $3, $4)', [item.id, coll, JSON.stringify(item), now]);
      }
    }
  }

  async replaceAll(data) {
    await this.transaction(async (db) => {
      await db.query(SETUP_LOCK);
      await this.writeAll(db, data);
    });
  }

  // Load the starter content unless another instance already did. Returns true if it loaded it.
  async seedIfEmpty(data) {
    return this.transaction(async (db) => {
      await db.query(SETUP_LOCK);
      const { rows } = await db.query('SELECT COUNT(*) AS n FROM bl_settings');
      if (Number(rows[0].n) > 0) return false;
      await this.writeAll(db, data);
      return true;
    });
  }

  async saveSettings(settings) {
    await this.query(
      'INSERT INTO bl_settings (id, data, updated_at) VALUES (1, $1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at',
      [JSON.stringify(settings), new Date().toISOString()],
    );
  }

  async insertItem(coll, item) {
    await this.query('INSERT INTO bl_items (id, coll, data, updated_at) VALUES ($1, $2, $3, $4)', [item.id, coll, JSON.stringify(item), new Date().toISOString()]);
  }

  async updateItem(coll, item) {
    const res = await this.query('UPDATE bl_items SET data = $1, updated_at = $2 WHERE id = $3 AND coll = $4', [JSON.stringify(item), new Date().toISOString(), item.id, coll]);
    if (res.rowCount === 0) throw new Error(`Item ${item.id} not found`);
  }

  async deleteItem(coll, id) {
    await this.query('DELETE FROM bl_items WHERE id = $1 AND coll = $2', [id, coll]);
  }

  // ---- files -------------------------------------------------------------
  async putFile(meta, buffer) {
    await this.query(
      'INSERT INTO bl_files (id, name, mime, size, kind, created_at, data) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [meta.id, meta.name, meta.mime, meta.size, meta.kind, meta.createdAt, buffer],
    );
  }

  async getFile(id) {
    const { rows } = await this.query('SELECT id, name, mime, size, kind, created_at, data FROM bl_files WHERE id = $1', [id]);
    if (!rows[0]) return null;
    const r = rows[0];
    return {
      meta: { id: r.id, name: r.name, mime: r.mime, size: Number(r.size), kind: r.kind, createdAt: r.created_at },
      buffer: Buffer.isBuffer(r.data) ? r.data : Buffer.from(r.data),
    };
  }

  async listFiles() {
    const { rows } = await this.query('SELECT id, name, mime, size, kind, created_at FROM bl_files ORDER BY created_at DESC');
    return rows.map((r) => ({ id: r.id, name: r.name, mime: r.mime, size: Number(r.size), kind: r.kind, createdAt: r.created_at }));
  }

  async deleteFile(id) {
    await this.query('DELETE FROM bl_files WHERE id = $1', [id]);
  }

  async close() { await this.pool.end(); }
}

module.exports = PostgresStore;
