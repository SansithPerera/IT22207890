'use strict';
// PostgreSQL storage: content and uploaded files live in the database, so
// nothing is lost when a free hosting instance restarts (Render, Railway…).
// Works with Neon, Supabase, Render Postgres or any PostgreSQL 12+.
// Tables are prefixed with bl_ so they can share a database with other apps.

const SCHEMA = [
  'CREATE TABLE IF NOT EXISTS bl_settings (id INTEGER PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS bl_items (id TEXT PRIMARY KEY, coll TEXT NOT NULL, data TEXT NOT NULL, updated_at TEXT NOT NULL)',
  'CREATE INDEX IF NOT EXISTS bl_items_coll ON bl_items (coll)',
  'CREATE TABLE IF NOT EXISTS bl_files (id TEXT PRIMARY KEY, name TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL, kind TEXT NOT NULL, created_at TEXT NOT NULL, data BYTEA NOT NULL)',
];

class PostgresStore {
  constructor(connectionString) {
    let pg;
    try {
      pg = require('pg');
    } catch (err) {
      throw new Error('DATABASE_URL is set but the "pg" package is missing. Run "npm install" first.');
    }
    this.pool = new pg.Pool({ connectionString, max: 4, idleTimeoutMillis: 30000 });
    this.pool.on('error', (err) => console.error('[db] idle client error:', err.message));
    this.host = (() => { try { return new URL(connectionString).hostname; } catch { return 'database'; } })();
  }

  info() {
    return { driver: 'postgres', label: 'PostgreSQL', location: this.host };
  }

  async init() {
    for (const sql of SCHEMA) await this.pool.query(sql);
  }

  async isEmpty() {
    const { rows } = await this.pool.query('SELECT COUNT(*) AS n FROM bl_settings');
    return Number(rows[0].n) === 0;
  }

  async loadAll() {
    const settingsRes = await this.pool.query('SELECT data FROM bl_settings WHERE id = 1');
    const itemsRes = await this.pool.query('SELECT coll, data FROM bl_items');
    const collections = {};
    for (const row of itemsRes.rows) (collections[row.coll] ||= []).push(JSON.parse(row.data));
    return {
      settings: settingsRes.rows[0] ? JSON.parse(settingsRes.rows[0].data) : {},
      collections,
    };
  }

  async transaction(fn) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await fn(client);
      await client.query('COMMIT');
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch { /* ignore */ }
      throw err;
    } finally {
      client.release();
    }
  }

  async replaceAll({ settings, collections }) {
    const now = new Date().toISOString();
    await this.transaction(async (db) => {
      await db.query('DELETE FROM bl_items');
      await db.query('DELETE FROM bl_settings');
      await db.query('INSERT INTO bl_settings (id, data, updated_at) VALUES (1, $1, $2)', [JSON.stringify(settings), now]);
      for (const [coll, items] of Object.entries(collections)) {
        for (const item of items) {
          await db.query('INSERT INTO bl_items (id, coll, data, updated_at) VALUES ($1, $2, $3, $4)', [item.id, coll, JSON.stringify(item), now]);
        }
      }
    });
  }

  async saveSettings(settings) {
    await this.pool.query(
      'INSERT INTO bl_settings (id, data, updated_at) VALUES (1, $1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at',
      [JSON.stringify(settings), new Date().toISOString()],
    );
  }

  async insertItem(coll, item) {
    await this.pool.query('INSERT INTO bl_items (id, coll, data, updated_at) VALUES ($1, $2, $3, $4)', [item.id, coll, JSON.stringify(item), new Date().toISOString()]);
  }

  async updateItem(coll, item) {
    const res = await this.pool.query('UPDATE bl_items SET data = $1, updated_at = $2 WHERE id = $3 AND coll = $4', [JSON.stringify(item), new Date().toISOString(), item.id, coll]);
    if (res.rowCount === 0) throw new Error(`Item ${item.id} not found`);
  }

  async deleteItem(coll, id) {
    await this.pool.query('DELETE FROM bl_items WHERE id = $1 AND coll = $2', [id, coll]);
  }

  // ---- files -------------------------------------------------------------
  async putFile(meta, buffer) {
    await this.pool.query(
      'INSERT INTO bl_files (id, name, mime, size, kind, created_at, data) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [meta.id, meta.name, meta.mime, meta.size, meta.kind, meta.createdAt, buffer],
    );
  }

  async getFile(id) {
    const { rows } = await this.pool.query('SELECT id, name, mime, size, kind, created_at, data FROM bl_files WHERE id = $1', [id]);
    if (!rows[0]) return null;
    const r = rows[0];
    return {
      meta: { id: r.id, name: r.name, mime: r.mime, size: Number(r.size), kind: r.kind, createdAt: r.created_at },
      buffer: Buffer.isBuffer(r.data) ? r.data : Buffer.from(r.data),
    };
  }

  async listFiles() {
    const { rows } = await this.pool.query('SELECT id, name, mime, size, kind, created_at FROM bl_files ORDER BY created_at DESC');
    return rows.map((r) => ({ id: r.id, name: r.name, mime: r.mime, size: Number(r.size), kind: r.kind, createdAt: r.created_at }));
  }

  async deleteFile(id) {
    await this.pool.query('DELETE FROM bl_files WHERE id = $1', [id]);
  }

  async close() { await this.pool.end(); }
}

module.exports = PostgresStore;
