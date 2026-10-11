'use strict';
// Central configuration. Everything is read from environment variables
// (a local .env file is loaded too, see loadDotEnv below).
const fs = require('fs');
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
const isProduction = env.NODE_ENV === 'production';
const num = (v, d) => (v !== undefined && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : d);

const adminPasswordFromEnv = env.ADMIN_PASSWORD && env.ADMIN_PASSWORD.trim();
const config = {
  root: ROOT,
  isProduction,
  port: num(env.PORT, 3000),
  host: env.HOST || '0.0.0.0',
  // Storage: PostgreSQL when DATABASE_URL is set, otherwise local files in DATA_DIR.
  databaseUrl: env.DATABASE_URL || '',
  dataDir: path.resolve(ROOT, env.DATA_DIR || 'data'),
  // Admin login
  adminUser: (env.ADMIN_USERNAME || 'admin').trim(),
  adminPassword: adminPasswordFromEnv || (isProduction ? '' : 'betel-admin'),
  usingDefaultPassword: !adminPasswordFromEnv,
  // Sessions are signed with this secret. Without one, a random secret is used
  // and everybody is logged out whenever the server restarts.
  sessionSecret: env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  sessionSecretIsRandom: !env.SESSION_SECRET,
  sessionHours: num(env.SESSION_HOURS, 12),
  // Uploads
  maxUploadMb: num(env.MAX_UPLOAD_MB, 25),
  maxRequestMb: num(env.MAX_REQUEST_MB, 80),
  optimiseImages: env.OPTIMISE_IMAGES !== 'false',
  maxImageWidth: num(env.MAX_IMAGE_WIDTH, 2000),
  // Static export for the SLIIT course web (20 MB limit)
  exportBudgetMb: num(env.EXPORT_BUDGET_MB, 20),
  publicSiteUrl: (env.PUBLIC_SITE_URL || '').replace(/\/+$/, ''),
  trustProxy: env.TRUST_PROXY ? env.TRUST_PROXY === 'true' : true,
  paths: {
    public: path.join(ROOT, 'public'),
  },
};

module.exports = config;
