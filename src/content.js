'use strict';
// Content service: a cached view of everything in the store, plus the
// create / update / delete operations the admin panel uses.
const { newId, isoNow, slugify } = require('./lib/util');
const { collections: SCHEMA } = require('./schema');
const { buildSeed } = require('./seed/content');

const SORTED_BY_DATE_DESC = new Set(['messages']);

function sortItems(coll, items) {
  const list = [...items];
  if (SORTED_BY_DATE_DESC.has(coll)) return list.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return list.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || String(a.createdAt).localeCompare(String(b.createdAt)));
}

class Content {
  constructor(store, { cacheMs = 0 } = {}) {
    this.store = store;
    this.cacheMs = cacheMs; // 0 = cache until the next write
    this.cache = null;
    this.cachedAt = 0;
  }

  async init({ seed = true } = {}) {
    await this.store.init();
    if (seed && (await this.store.isEmpty()) && (await this.store.seedIfEmpty(buildSeed()))) {
      console.log('[content] Empty store: loaded the starter content from the PP2 presentation.');
    }
  }

  async resetToSeed() {
    await this.store.replaceAll(buildSeed());
    this.invalidate();
  }

  invalidate() { this.cache = null; }

  async snapshot() {
    const fresh = this.cache && (!this.cacheMs || Date.now() - this.cachedAt < this.cacheMs);
    if (fresh) return this.cache;
    const data = await this.store.loadAll();
    const collections = {};
    for (const name of [...Object.keys(SCHEMA), 'messages']) collections[name] = sortItems(name, data.collections[name] || []);
    this.cache = { settings: data.settings || {}, collections };
    this.cachedAt = Date.now();
    return this.cache;
  }

  async settings() { return (await this.snapshot()).settings; }
  async list(coll) { return (await this.snapshot()).collections[coll] || []; }
  async get(coll, id) { return (await this.list(coll)).find((x) => x.id === id) || null; }
  async bySlug(coll, slug) { return (await this.list(coll)).find((x) => x.slug === slug) || null; }

  async uniqueSlug(coll, wanted, exceptId) {
    const base = slugify(wanted) || 'item';
    const taken = new Set((await this.list(coll)).filter((x) => x.id !== exceptId).map((x) => x.slug));
    let slug = base;
    for (let i = 2; taken.has(slug); i += 1) slug = `${base}-${i}`;
    return slug;
  }

  async create(coll, data) {
    const items = await this.list(coll);
    const now = isoNow();
    const item = {
      ...data,
      id: newId(),
      order: items.reduce((max, x) => Math.max(max, Number(x.order) || 0), 0) + 10,
      createdAt: now,
      updatedAt: now,
    };
    if ('slug' in item) item.slug = await this.uniqueSlug(coll, item.slug || item.shortTitle || item.title || item.name, item.id);
    await this.store.insertItem(coll, item);
    this.invalidate();
    return item;
  }

  async update(coll, id, data) {
    const existing = await this.get(coll, id);
    if (!existing) return null;
    const item = { ...existing, ...data, id, order: existing.order, createdAt: existing.createdAt, updatedAt: isoNow() };
    if ('slug' in item) item.slug = await this.uniqueSlug(coll, item.slug || item.shortTitle || item.title || item.name, id);
    await this.store.updateItem(coll, item);
    this.invalidate();
    return item;
  }

  async remove(coll, id) {
    const existing = await this.get(coll, id);
    if (!existing) return null;
    await this.store.deleteItem(coll, id);
    this.invalidate();
    return existing;
  }

  // Swap an item with its neighbour above or below.
  async move(coll, id, direction) {
    const items = [...(await this.list(coll))];
    const i = items.findIndex((x) => x.id === id);
    const j = direction === 'up' ? i - 1 : i + 1;
    if (i === -1 || j < 0 || j >= items.length) return;
    [items[i], items[j]] = [items[j], items[i]];
    // Re-number everything as 10, 20, 30… so the sequence stays tidy.
    for (let k = 0; k < items.length; k += 1) {
      const want = (k + 1) * 10;
      if (Number(items[k].order) !== want) await this.store.updateItem(coll, { ...items[k], order: want });
    }
    this.invalidate();
  }

  async saveSettings(values) {
    const current = await this.settings();
    await this.store.saveSettings({ ...current, ...values });
    this.invalidate();
  }

  // ---- messages from the contact form -------------------------------------
  async addMessage(msg) {
    const item = { ...msg, id: newId(), read: false, createdAt: isoNow(), updatedAt: isoNow() };
    await this.store.insertItem('messages', item);
    this.invalidate();
    return item;
  }

  // ---- files ---------------------------------------------------------------
  async saveFile(meta, buffer) {
    await this.store.putFile(meta, buffer);
    return meta;
  }

  getFile(id) { return this.store.getFile(id); }
  listFiles() { return this.store.listFiles(); }

  async deleteFile(id) {
    await this.store.deleteFile(id);
  }

  // Where is each uploaded file used? -> Map(fileId -> [{ label, href }])
  async fileUsage() {
    const snap = await this.snapshot();
    const usage = new Map();
    const note = (value, label, href) => {
      const visit = (v) => {
        if (!v) return;
        if (Array.isArray(v)) { v.forEach(visit); return; }
        if (typeof v === 'object') {
          if (v.id && v.url) (usage.get(v.id) || usage.set(v.id, []).get(v.id)).push({ label, href });
          return;
        }
        if (typeof v === 'string') {
          for (const m of v.matchAll(/\/files\/([\w-]{6,40})\//g)) (usage.get(m[1]) || usage.set(m[1], []).get(m[1])).push({ label, href });
        }
      };
      visit(value);
    };
    for (const [key, value] of Object.entries(snap.settings)) note(value, `Site settings › ${key}`, '/admin/settings');
    for (const [coll, def] of Object.entries(SCHEMA)) {
      for (const item of snap.collections[coll] || []) {
        const title = item[def.titleField] || def.singular;
        for (const value of Object.values(item)) note(value, `${def.label} › ${title}`, `/admin/${coll}/${item.id}`);
      }
    }
    return usage;
  }
}

module.exports = { Content };
