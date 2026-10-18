'use strict';
// Central configuration. Everything is read from environment variables
// (a local .env file is loaded too, see loadDotEnv below).
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

// Minimal .env loader so the project needs no extra dependency.
function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!m || line.trim().startsWith('#')) continue;
    let value = m[2];
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
    else value = value.replace(/\s+#.*$/, '');
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}
loadDotEnv(path.join(ROOT, '.env'));

const env = process.env;
// Vercel sets VERCEL=1 for its builds and functions (VERCEL_ENV=development under `vercel dev`).
const onVercel = Boolean(env.VERCEL);
const isProduction = env.NODE_ENV === 'production' || (onVercel && env.VERCEL_ENV !== 'development');
const num = (v, d) => (v !== undefined && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : d);

const adminPasswordFromEnv = env.ADMIN_PASSWORD && env.ADMIN_PASSWORD.trim();
// Vercel's Postgres integrations may name the connection string POSTGRES_URL.
const databaseUrl = (env.DATABASE_URL || env.POSTGRES_URL || '').trim();

// The admin cookie is signed with SESSION_SECRET. Without it, a secret is derived
// from the admin password and database address, so every server instance (Vercel
// runs several) accepts the same cookie. A random secret is the last resort: it
// signs everyone out whenever the server restarts.
function pickSessionSecret() {
  if (env.SESSION_SECRET) return { value: env.SESSION_SECRET, source: 'env' };
  if (adminPasswordFromEnv) {
    const value = crypto.createHash('sha256').update(`betel-session\n${adminPasswordFromEnv}\n${databaseUrl}`).digest('hex');
    return { value, source: 'derived' };
  }
  return { value: crypto.randomBytes(32).toString('hex'), source: 'random' };
}
const sessionSecret = pickSessionSecret();
const exportBudgetMb = num(env.EXPORT_BUDGET_MB, 20);

const config = {
  root: ROOT,
  isProduction,
  onVercel,
  port: num(env.PORT, 3000),
  host: env.HOST || '0.0.0.0',
  // Storage: PostgreSQL when DATABASE_URL is set, otherwise local files in DATA_DIR.
  // Vercel only allows writing to /tmp, which is wiped often, so a database is
  // needed there to keep anything.
  databaseUrl,
  dataDir: path.resolve(ROOT, env.DATA_DIR || (onVercel ? path.join(os.tmpdir(), 'betel-data') : 'data')),
  // Admin login
  adminUser: (env.ADMIN_USERNAME || 'admin').trim(),
  adminPassword: adminPasswordFromEnv || (isProduction ? '' : '1234'),
  usingDefaultPassword: !adminPasswordFromEnv,
  sessionSecret: sessionSecret.value,
  sessionSecretIsRandom: sessionSecret.source === 'random',
  sessionHours: num(env.SESSION_HOURS, 12),
  // Uploads. Vercel refuses any request over 4.5 MB before it reaches the app,
  // so the limits are lower there.
  maxUploadMb: num(env.MAX_UPLOAD_MB, onVercel ? 4 : 25),
  maxRequestMb: num(env.MAX_REQUEST_MB, onVercel ? 4.3 : 80),
  optimiseImages: env.OPTIMISE_IMAGES !== 'false',
  maxImageWidth: num(env.MAX_IMAGE_WIDTH, 2000),
  // Static export for the SLIIT course web (20 MB limit). Vercel also caps
  // responses at 4.5 MB, so the ZIP downloaded from its admin panel is smaller.
  exportBudgetMb,
  adminExportBudgetMb: onVercel ? Math.min(exportBudgetMb, 4) : exportBudgetMb,
  publicSiteUrl: (env.PUBLIC_SITE_URL || '').replace(/\/+$/, ''),
  trustProxy: env.TRUST_PROXY ? env.TRUST_PROXY === 'true' : true,
  paths: {
    public: path.join(ROOT, 'public'),
  },
};

module.exports = config;
