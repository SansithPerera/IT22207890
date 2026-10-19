'use strict';
// Vercel entry point.
//
// Vercel does not run `npm start`. It serves the files in public/ (CSS, fonts,
// images, the starter slides) straight from its CDN and sends every other
// request (the pages, /admin, uploaded files) to this function, which runs the
// same app as server.js. See vercel.json and "Deploy on Vercel" in README.md.
const { createStore } = require('../src/store');
const { Content } = require('../src/content');
const { createApp } = require('../src/app');

let starting = null;

// Start once per function instance; later requests reuse the running app.
function start() {
  if (!starting) {
    starting = (async () => {
      const store = createStore();
      // Several instances can share one database, so re-read content every 15 s.
      const content = new Content(store, { cacheMs: store.info().driver === 'postgres' ? 15000 : 0 });
      await content.init();
      return createApp(content);
    })();
    starting.catch(() => { starting = null; }); // try again on the next request
  }
  return starting;
}

// Error codes that point at a fixable setting. The message never includes the
// connection string or host, because this page is public.
const HINTS = {
  '28P01': 'The database user name or password in DATABASE_URL is wrong.',
  '3D000': 'The database named in DATABASE_URL does not exist.',
  ENOTFOUND: 'The database host in DATABASE_URL could not be found. Check it for typos.',
  ECONNREFUSED: 'The database refused the connection.',
  ETIMEDOUT: 'The database did not answer in time. Try again in a minute.',
  SELF_SIGNED_CERT_IN_CHAIN: 'The database SSL certificate is not trusted. A Neon database works without extra settings.',
};

module.exports = async function handler(req, res) {
  let app;
  try {
    app = await start();
  } catch (err) {
    console.error('[start-up failed]', err);
    const hint = HINTS[err.code] || 'Open your project in Vercel and check Logs for the error.';
    res.statusCode = 503;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(`The website could not start.\n\n${hint}\n\nCheck the Environment Variables in Vercel (Settings > Environment Variables), then redeploy.\n`);
    return;
  }
  await app(req, res);
};
