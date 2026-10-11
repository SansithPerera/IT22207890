'use strict';
// Local storage: content in data/content.json, uploads in data/uploads/.
// Good for running on your own computer or any host with a persistent disk.
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

class LocalStore {
  constructor(dir) {
    this.dir = dir;
    this.file = path.join(dir, 'content.json');
    this.uploadDir = path.join(dir, 'uploads');
    this.db = null;
    this.queue = Promise.resolve();
  }

  info() {
    return { driver: 'local', label: 'Local files', location: this.dir };
  }

  async init() {
    await fsp.mkdir(this.uploadDir, { recursive: true });
    if (fs.existsSync(this.file)) {
      const text = await fsp.readFile(this.file, 'utf8');
      this.db = JSON.parse(text);
      this.db.collections ||= {};
      this.db.files ||= {};
    }
  }

  async isEmpty() { return !this.db; }

  // Serialise writes so two admin saves never interleave.
  write(mutator) {
    const run = async () => {
      if (!this.db) this.db = { version: 1, settings: {}, collections: {}, files: {} };
      mutator(this.db);
      const tmp = `${this.file}.${process.pid}.tmp`;
      await fsp.writeFile(tmp, JSON.stringify(this.db, null, 2));
      await fsp.rename(tmp, this.file);
    };
    const next = this.queue.then(run, run);
    this.queue = next.catch(() => {});
    return next;
  }

  async loadAll() {
    const db = this.db || { settings: {}, collections: {} };
    return {
      settings: structuredClone(db.settings || {}),
      collections: structuredClone(db.collections || {}),
    };
  }

  async replaceAll({ settings, collections }) {
    await this.write((db) => {
      db.settings = structuredClone(settings);
      db.collections = structuredClone(collections);
    });
  }

  // Load the starter content if nothing is stored yet. Returns true if it did.
  async seedIfEmpty(data) {
    if (this.db) return false;
    await this.replaceAll(data);
    return true;
  }

  async saveSettings(settings) {
    await this.write((db) => { db.settings = structuredClone(settings); });
  }

  async insertItem(coll, item) {
    await this.write((db) => {
      (db.collections[coll] ||= []).push(structuredClone(item));
    });
  }

  async updateItem(coll, item) {
    await this.write((db) => {
      const list = db.collections[coll] || [];
      const i = list.findIndex((x) => x.id === item.id);
      if (i === -1) throw new Error(`Item ${item.id} not found`);
      list[i] = structuredClone(item);
    });
  }

  async deleteItem(coll, id) {
    await this.write((db) => {
      db.collections[coll] = (db.collections[coll] || []).filter((x) => x.id !== id);
    });
  }

  // ---- files -------------------------------------------------------------
  filePath(id) {
    if (!/^[\w-]{6,40}$/.test(id)) throw new Error('Bad file id');
    return path.join(this.uploadDir, id);
  }

  async putFile(meta, buffer) {
    await fsp.writeFile(this.filePath(meta.id), buffer);
    await this.write((db) => { db.files[meta.id] = { ...meta }; });
  }

  async getFile(id) {
    const meta = this.db && this.db.files && this.db.files[id];
    if (!meta) return null;
    const file = this.filePath(id);
    if (!fs.existsSync(file)) return null;
    return { meta, path: file };
  }

  async listFiles() {
    const files = Object.values((this.db && this.db.files) || {});
    return files.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  async deleteFile(id) {
    await fsp.rm(this.filePath(id), { force: true });
    await this.write((db) => { delete db.files[id]; });
  }

  async close() { await this.queue; }
}

module.exports = LocalStore;
