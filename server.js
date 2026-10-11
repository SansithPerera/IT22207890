'use strict';
// Entry point: `npm start` (or `node server.js`).
const http = require('http');
const config = require('./src/config');
const { createStore } = require('./src/store');
const { Content } = require('./src/content');
const { createApp } = require('./src/app');

async function main() {
  const store = createStore();
  // With a database, re-read content every 30 s in case another instance changed it.
  const content = new Content(store, { cacheMs: store.info().driver === 'postgres' ? 30000 : 0 });
  await content.init();
  const app = createApp(content);
  const server = http.createServer(app);
  server.requestTimeout = 120000;
  server.headersTimeout = 30000;

  server.listen(config.port, config.host, () => {
    const info = store.info();
    console.log(`\n  Betel AI website running at http://localhost:${config.port}`);
    console.log(`  Admin panel:  http://localhost:${config.port}/admin`);
    console.log(`  Storage:      ${info.label} (${info.location})`);
    if (config.usingDefaultPassword && config.adminPassword) console.log(`  Admin login:  ${config.adminUser} / ${config.adminPassword}  (development only; set ADMIN_PASSWORD for production)`);
    if (!config.adminPassword) console.log('  Admin login is disabled until ADMIN_PASSWORD is set.');
    console.log('');
  });

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down…`);
    server.close(async () => {
      try { await store.close(); } catch { /* ignore */ }
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 8000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('Failed to start:', err.message);
  if (config.databaseUrl) console.error('Check that DATABASE_URL is correct and the database accepts connections.');
  process.exit(1);
});
