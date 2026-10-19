'use strict';
// A small HTTP toolkit on top of Node's built-in http module:
// routing, body parsing (forms and file uploads), cookies, static files,
// compression and security headers. No framework needed.
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { parseMultipart } = require('./multipart');

class HttpError extends Error {
  constructor(status, message, expose = true) {
    super(message);
    this.status = status;
    this.expose = expose;
  }
}

// ---------------------------------------------------------------- router
function createRouter() {
  const routes = [];
  const add = (method, pattern, handlers) => {
    const keys = [];
    const source = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\/:([a-zA-Z_]+)/g, (_, key) => { keys.push(key); return '/([^/]+)'; })
      .replace(/\/\*$/, '/(.*)');
    if (pattern.endsWith('/*')) keys.push('rest');
    routes.push({ method, re: new RegExp(`^${source}/?$`), keys, handlers });
  };
  return {
    get(pattern, ...handlers) { add('GET', pattern, handlers); },
    post(pattern, ...handlers) { add('POST', pattern, handlers); },
    async handle(req, res) {
      for (const route of routes) {
        const methodOk = route.method === req.method || (route.method === 'GET' && req.method === 'HEAD');
        if (!methodOk) continue;
        const m = route.re.exec(req.path);
        if (!m) continue;
        req.params = {};
        route.keys.forEach((key, i) => {
          try { req.params[key] = decodeURIComponent(m[i + 1]); } catch { throw new HttpError(400, 'Bad URL'); }
        });
        for (const handler of route.handlers) {
          const result = await handler(req, res);
          if (result === false || res.writableEnded || res.headersSent) break;
        }
        return true;
      }
      return false;
    },
  };
}

// ---------------------------------------------------------------- request helpers
function enhanceRequest(req, { trustProxy }) {
  const url = new URL(req.url, 'http://localhost');
  req.path = url.pathname;
  req.query = Object.fromEntries(url.searchParams);
  req.cookies = parseCookies(req.headers.cookie || '');
  const forwardedProto = trustProxy ? String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() : '';
  req.secure = forwardedProto === 'https' || Boolean(req.socket && req.socket.encrypted);
  const forwardedFor = trustProxy ? String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() : '';
  req.ip = forwardedFor || (req.socket && req.socket.remoteAddress) || 'unknown';
  const host = (trustProxy && req.headers['x-forwarded-host']) || req.headers.host || 'localhost';
  req.origin = `${req.secure ? 'https' : 'http'}://${String(host).split(',')[0].trim()}`;
}

function parseCookies(header) {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    const key = part.slice(0, i).trim();
    if (!key) continue;
    try { out[key] = decodeURIComponent(part.slice(i + 1).trim()); } catch { out[key] = part.slice(i + 1).trim(); }
  }
  return out;
}

function serializeCookie(name, value, { maxAge, httpOnly = true, secure = false, sameSite = 'Lax', path: p = '/' } = {}) {
  let cookie = `${name}=${encodeURIComponent(value)}; Path=${p}; SameSite=${sameSite}`;
  if (maxAge !== undefined) cookie += `; Max-Age=${Math.floor(maxAge)}`;
  if (httpOnly) cookie += '; HttpOnly';
  if (secure) cookie += '; Secure';
  return cookie;
}

function setCookie(res, name, value, options) {
  const prev = res.getHeader('Set-Cookie');
  const list = Array.isArray(prev) ? prev : prev ? [String(prev)] : [];
  list.push(serializeCookie(name, value, options));
  res.setHeader('Set-Cookie', list);
}

const megabytes = (bytes) => `${Number((bytes / 1024 / 1024).toFixed(1))} MB`;

// Reads the whole request body. It listens for 'data' and 'end' events rather
// than using `for await`: Vercel's Node.js runtime reads the body before the app
// runs and replays it to exactly these listeners.
function readBody(req, limitBytes) {
  const tooLarge = () => new HttpError(413, `The upload is too large. The limit is ${megabytes(limitBytes)} per request.`);
  if (Number(req.headers['content-length'] || 0) > limitBytes) return Promise.reject(tooLarge());
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let settled = false;
    const fail = (err) => { if (!settled) { settled = true; chunks.length = 0; reject(err); } };
    req.on('data', (chunk) => {
      if (settled) return; // keep draining, but ignore the rest
      size += chunk.length;
      if (size > limitBytes) fail(tooLarge());
      else chunks.push(chunk);
    });
    req.on('end', () => { if (!settled) { settled = true; resolve(Buffer.concat(chunks)); } });
    req.on('error', fail);
    req.on('close', () => { if (!req.complete) fail(new HttpError(400, 'The upload was interrupted. Please try again.')); });
  });
}

// Uniform access to url-encoded and multipart form bodies.
class FormBody {
  constructor(entries) { this.entries = entries; } // [[name, string | File]]
  get(name) {
    const hit = this.entries.find(([k, v]) => k === name && typeof v === 'string');
    return hit ? hit[1] : null;
  }
  getAll(name) { return this.entries.filter(([k, v]) => k === name && typeof v === 'string').map(([, v]) => v); }
  files(name) {
    return this.entries.filter(([k, v]) => k === name && typeof v !== 'string' && v && v.size > 0).map(([, v]) => v);
  }
  file(name) { return this.files(name)[0] || null; }
  has(name) { return this.entries.some(([k]) => k === name); }
}

async function parseForm(req, limitBytes) {
  const type = String(req.headers['content-type'] || '').toLowerCase();
  const body = await readBody(req, limitBytes);
  if (type.startsWith('application/x-www-form-urlencoded')) {
    return new FormBody([...new URLSearchParams(body.toString('utf8'))]);
  }
  if (type.startsWith('multipart/form-data')) {
    try {
      return new FormBody(parseMultipart(body, req.headers['content-type']));
    } catch (err) {
      throw new HttpError(400, 'The form could not be read. Please try again.');
    }
  }
  if (type.startsWith('application/json')) {
    try { return { json: JSON.parse(body.toString('utf8') || '{}') }; } catch { throw new HttpError(400, 'Invalid JSON'); }
  }
  return new FormBody([]);
}

// ---------------------------------------------------------------- responses
const COMPRESSIBLE = /^(text\/|application\/(json|javascript|xml)|image\/svg\+xml)/;

function acceptsGzip(req) { return /\bgzip\b/.test(String(req.headers['accept-encoding'] || '')); }

function send(req, res, status, body, headers = {}) {
  let payload = Buffer.isBuffer(body) ? body : Buffer.from(String(body ?? ''), 'utf8');
  const type = headers['Content-Type'] || 'text/html; charset=utf-8';
  if (payload.length > 1024 && COMPRESSIBLE.test(type) && acceptsGzip(req)) {
    payload = zlib.gzipSync(payload, { level: 6 });
    headers['Content-Encoding'] = 'gzip';
    headers.Vary = 'Accept-Encoding';
  }
  res.writeHead(status, { 'Content-Type': type, 'Content-Length': payload.length, ...headers });
  res.end(req.method === 'HEAD' ? undefined : payload);
}

const sendHtml = (req, res, status, htmlString, headers = {}) => send(req, res, status, String(htmlString), { 'Cache-Control': 'no-cache', 'Content-Security-Policy': CSP, ...headers, 'Content-Type': 'text/html; charset=utf-8' });
const sendJson = (req, res, status, data, headers = {}) => send(req, res, status, JSON.stringify(data), { 'Cache-Control': 'no-store', ...headers, 'Content-Type': 'application/json; charset=utf-8' });

function redirect(res, location, status = 303) {
  res.writeHead(status, { Location: location, 'Content-Length': 0 });
  res.end();
}

// Content Security Policy for HTML pages: only this site's own scripts run.
const CSP = [
  "default-src 'self'",
  "img-src 'self' data: blob:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join('; ');

function securityHeaders(req, res, { isProduction }) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (isProduction && req.secure) res.setHeader('Strict-Transport-Security', 'max-age=15552000');
}

// ---------------------------------------------------------------- static files
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff': 'font/woff',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.pdf': 'application/pdf', '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json',
};

function createStatic(rootDir) {
  const root = path.resolve(rootDir);
  const gzipCache = new Map();
  return async function serveStatic(req, res) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return false;
    let rel;
    try { rel = decodeURIComponent(req.path); } catch { return false; }
    if (rel.includes('\0')) return false;
    const file = path.join(root, path.normalize(rel));
    if (!file.startsWith(root + path.sep)) return false;
    let stat;
    try { stat = await fsp.stat(file); } catch { return false; }
    if (!stat.isFile()) return false;
    const ext = path.extname(file).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    const etag = `W/"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
    const versioned = 'v' in req.query;
    const maxAge = versioned ? 31536000 : /^\/(media|fonts)\//.test(req.path) ? 604800 : 3600;
    const headers = {
      'Content-Type': type,
      ETag: etag,
      'Last-Modified': stat.mtime.toUTCString(),
      'Cache-Control': `public, max-age=${maxAge}${versioned ? ', immutable' : ''}`,
    };
    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304, headers);
      res.end();
      return true;
    }
    if (COMPRESSIBLE.test(type) && acceptsGzip(req) && stat.size > 1024 && stat.size < 5 * 1024 * 1024) {
      const key = `${file}:${etag}`;
      let gz = gzipCache.get(key);
      if (!gz) { gz = zlib.gzipSync(await fsp.readFile(file), { level: 9 }); gzipCache.set(key, gz); }
      res.writeHead(200, { ...headers, 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding', 'Content-Length': gz.length });
      res.end(req.method === 'HEAD' ? undefined : gz);
      return true;
    }
    res.writeHead(200, { ...headers, 'Content-Length': stat.size });
    if (req.method === 'HEAD') { res.end(); return true; }
    fs.createReadStream(file).pipe(res);
    return true;
  };
}

// Content hash per asset so URLs change whenever a CSS/JS file changes.
function assetVersioner(rootDir) {
  const cache = new Map();
  return (urlPath) => {
    if (cache.has(urlPath)) return cache.get(urlPath);
    let version = '1';
    try { version = crypto.createHash('sha1').update(fs.readFileSync(path.join(rootDir, urlPath))).digest('hex').slice(0, 10); } catch { /* keep default */ }
    const out = `${urlPath}?v=${version}`;
    cache.set(urlPath, out);
    return out;
  };
}

// ---------------------------------------------------------------- rate limiting
function createRateLimiter({ windowMs, max }) {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [key, v] of hits) if (v.reset < now) hits.delete(key);
  }, Math.min(windowMs, 60000)).unref();
  return {
    hit(key) {
      const now = Date.now();
      let entry = hits.get(key);
      if (!entry || entry.reset < now) { entry = { count: 0, reset: now + windowMs }; hits.set(key, entry); }
      entry.count += 1;
      return entry.count <= max;
    },
    reset(key) { hits.delete(key); },
  };
}

module.exports = {
  HttpError, createRouter, enhanceRequest, parseCookies, setCookie, parseForm, readBody, FormBody,
  send, sendHtml, sendJson, redirect, securityHeaders, createStatic, assetVersioner, createRateLimiter, MIME,
};
