'use strict';
// Static export: renders every public page to plain HTML files with relative
// links, for hosts that only accept HTML and CSS (such as the SLIIT course
// web, limited to 20 MB). Files that do not fit link to the live site.
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { buildContext, searchIndex } = require('./site');
const { createZip } = require('./lib/zip');
const { formatBytes } = require('./lib/util');
const { homePage } = require('./views/pages/home');
const { domainPage, componentPage } = require('./views/pages/domain');
const { milestonesPage } = require('./views/pages/milestones');
const { documentsPage, presentationsPage } = require('./views/pages/documents');
const { aboutPage } = require('./views/pages/about');
const { contactPage, notFoundPage } = require('./views/pages/contact');

const PUBLIC = config.paths.public;
const PAGE_FILES = {
  '/': 'index.html', '/domain': 'domain.html', '/milestones': 'milestones.html', '/documents': 'documents.html',
  '/presentations': 'presentations.html', '/about': 'about.html', '/contact': 'contact.html',
};

function walk(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const full = path.join(dir, d.name);
    return d.isDirectory() ? walk(full, base) : [path.relative(base, full).split(path.sep).join('/')];
  });
}

// Remove <!doctype>, <html>, <head> and <body> wrappers (for hosts that add their own).
function stripDocument(doc) {
  return doc
    .replace(/<!doctype html>\s*/i, '')
    .replace(/<html[^>]*>\s*/i, '')
    .replace(/<\/html>\s*$/i, '')
    .replace(/<head>\s*/i, '')
    .replace(/<\/head>\s*/i, '')
    .replace(/<body[^>]*>\s*/i, '')
    .replace(/<\/body>\s*/i, '');
}

async function buildStaticSite(content, { mode = 'static', budgetMb = config.exportBudgetMb, liveUrlFallback = '', stripIndex = false } = {}) {
  const snapshotCtx = await buildContext(content, { mode });
  const liveUrl = mode === 'preview' ? '' : (snapshotCtx.liveUrl || liveUrlFallback || '').replace(/\/+$/, '');
  const ctx = await buildContext(content, { mode, origin: liveUrl });
  ctx.liveUrl = liveUrl;

  // 1. Render pages.
  const pages = [
    ['index.html', homePage(ctx)],
    ['domain.html', domainPage(ctx)],
    ...ctx.data.components.map((c) => [`research-${c.slug}.html`, componentPage(ctx, c)]),
    ['milestones.html', milestonesPage(ctx)],
    ['documents.html', documentsPage(ctx)],
    ['presentations.html', presentationsPage(ctx)],
    ['about.html', aboutPage(ctx)],
    ['contact.html', contactPage(ctx, {})],
    ['404.html', notFoundPage(ctx)],
  ].map(([name, doc]) => [name, String(doc)]);

  // 2. Collect referenced media and uploads.
  const referenced = new Map(); // url path -> { path, kind }
  const attrRe = /\s(href|src|action|poster|content|data-search-index)="([^"]*)"/g;
  for (const [, doc] of pages) {
    for (const m of doc.matchAll(attrRe)) {
      const value = m[2].replace(/&amp;/g, '&');
      const p = value.split(/[?#]/)[0];
      if (/^\/(media|files)\//.test(p)) referenced.set(p, { attr: m[1] });
    }
  }

  // 3. Base assets every page needs.
  const entries = [];
  const add = (name, data) => entries.push({ name, data });
  const baseAssets = [
    ...walk(path.join(PUBLIC, 'css')).filter((f) => f !== 'admin.css').map((f) => `css/${f}`),
    ...walk(path.join(PUBLIC, 'js')).filter((f) => f !== 'admin.js').map((f) => `js/${f}`),
    ...walk(path.join(PUBLIC, 'fonts')).map((f) => `fonts/${f}`),
    ...walk(path.join(PUBLIC, 'img')).map((f) => `img/${f}`),
  ];
  for (const rel of baseAssets) add(rel, fs.readFileSync(path.join(PUBLIC, rel)));

  // 4. Decide which media fit in the budget: images first, then smaller files.
  const candidates = [];
  for (const [urlPath] of referenced) {
    if (urlPath.startsWith('/media/')) {
      const file = path.join(PUBLIC, decodeURIComponent(urlPath));
      if (!file.startsWith(PUBLIC) || !fs.existsSync(file)) continue;
      candidates.push({ urlPath, out: urlPath.slice(1), size: fs.statSync(file).size, load: () => fs.readFileSync(file) });
    } else {
      const [, id, name] = urlPath.split('/').slice(1);
      candidates.push({ urlPath, out: `files/${id}-${decodeURIComponent(name || 'file')}`, id, lazy: true });
    }
  }
  for (const c of candidates.filter((x) => x.lazy)) {
    const found = await content.getFile(c.id);
    if (!found) { c.missing = true; continue; }
    c.size = found.meta.size;
    c.load = () => (found.buffer || fs.readFileSync(found.path));
  }
  const isImage = (p) => /\.(webp|png|jpe?g|gif|svg)$/i.test(p);
  const ordered = candidates.filter((c) => !c.missing).sort((a, b) => (isImage(b.urlPath) - isImage(a.urlPath)) || a.size - b.size);

  const budget = budgetMb * 1024 * 1024;
  const pagesSize = pages.reduce((n, [, d]) => n + Buffer.byteLength(d), 0) + 64 * 1024; // + search index
  let used = entries.reduce((n, e) => n + e.data.length, 0) + pagesSize;
  const included = new Map();
  const excluded = [];
  for (const c of ordered) {
    if (used + c.size <= budget) { included.set(c.urlPath, c.out); add(c.out, c.load()); used += c.size; } else excluded.push(c);
  }

  // 5. Rewrite links to relative files.
  const mapUrl = (value) => {
    if (!value.startsWith('/') || value.startsWith('//')) return value;
    const [, p, rest = ''] = /^([^?#]*)(.*)$/.exec(value);
    const hash = rest.includes('#') ? rest.slice(rest.indexOf('#')) : '';
    if (PAGE_FILES[p]) return PAGE_FILES[p] + hash;
    const research = /^\/research\/([\w-]+)$/.exec(p);
    if (research) return `research-${research[1]}.html${hash}`;
    if (/^\/(css|js|fonts|img)\//.test(p)) return p.slice(1);
    if (p === '/search-index.json') return 'search-index.json';
    if (included.has(p)) return included.get(p).split('/').map(encodeURIComponent).join('/');
    return liveUrl ? `${liveUrl}${value}` : '#';
  };
  const rewrite = (doc) => doc.replace(attrRe, (all, attr, value) => {
    if (attr === 'content' && !value.startsWith('/')) return all;
    const mapped = mapUrl(value.replace(/&amp;/g, '&')).replace(/&/g, '&amp;');
    return ` ${attr}="${mapped}"`;
  });

  for (const [name, doc] of pages) {
    let out = rewrite(doc);
    if (stripIndex && name === 'index.html') out = stripDocument(out);
    add(name, Buffer.from(out));
  }
  const index = searchIndex(ctx).map((e) => ({ ...e, u: mapUrl(e.u) }));
  add('search-index.json', Buffer.from(JSON.stringify(index)));

  const totalBytes = entries.reduce((n, e) => n + e.data.length, 0);
  const report = [
    `Static export of ${ctx.site.siteTitle} (${ctx.site.groupId})`,
    `Generated ${new Date().toISOString()}`,
    `Total size: ${formatBytes(totalBytes)} of the ${budgetMb} MB limit`,
    '',
    'Open index.html to browse the site. Upload all files and folders as they are.',
    liveUrl ? `Files that did not fit, and the contact form, point to ${liveUrl}.` : 'No live site address is set, so files that did not fit are not linked.',
    '',
    `Included files (${included.size}):`,
    ...[...included.values()].map((f) => `  ${f}`),
    '',
    `Left out to stay under the limit (${excluded.length}):`,
    ...(excluded.length ? excluded.map((c) => `  ${c.urlPath} (${formatBytes(c.size)})`) : ['  none']),
  ].join('\n');
  if (mode !== 'preview') add('EXPORT-REPORT.txt', Buffer.from(report));
  return { entries, report: { text: report, totalBytes, included: [...included.values()], excluded: excluded.map((c) => c.urlPath), liveUrl } };
}

async function buildExportZip(content, opts = {}) {
  const { entries, report } = await buildStaticSite(content, opts);
  return { zip: createZip(entries), report };
}

module.exports = { buildStaticSite, buildExportZip, stripDocument };
