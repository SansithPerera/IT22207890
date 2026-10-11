'use strict';
// Wires everything together into a request handler.
const config = require('./config');
const { createRouter, enhanceRequest, securityHeaders, createStatic, sendHtml, sendJson, HttpError } = require('./lib/http');
const { publicRoutes } = require('./routes/public');
const { adminRoutes } = require('./routes/admin');
const { buildContext } = require('./site');
const { notFoundPage, errorPage } = require('./views/pages/contact');

function createApp(content) {
  const router = createRouter();
  publicRoutes(router, { content });
  adminRoutes(router, { content });
  const serveStatic = createStatic(config.paths.public);

  async function renderError(req, res, status, message) {
    const wantsJson = req.path.startsWith('/admin/preview') || String(req.headers.accept || '').includes('application/json');
    if (wantsJson) return sendJson(req, res, status, { error: message });
    try {
      const ctx = await buildContext(content, { mode: 'server' });
      const adminAuth = req.path.startsWith('/admin') && (status === 401 || status === 403);
      const page = status === 404 ? notFoundPage(ctx) : errorPage(ctx, message, adminAuth ? { href: '/admin/login', label: 'Sign in again' } : undefined);
      return sendHtml(req, res, status, page);
    } catch {
      return sendHtml(req, res, status, `<!doctype html><title>Error</title><p>${status} — ${String(message).replace(/[<>&]/g, '')}</p>`);
    }
  }

  return async function handle(req, res) {
    try {
      enhanceRequest(req, { trustProxy: config.trustProxy });
      securityHeaders(req, res, { isProduction: config.isProduction });
      if (await serveStatic(req, res)) return;
      if (await router.handle(req, res)) return;
      await renderError(req, res, 404, 'Page not found');
    } catch (err) {
      if (res.headersSent) { res.destroy(); return; }
      const status = err instanceof HttpError ? err.status : 500;
      if (status >= 500) console.error('[error]', req.method, req.url, err);
      const message = err instanceof HttpError && err.expose ? err.message : 'Something went wrong on our side. Please try again.';
      // Drain any unread request body so the connection can be reused.
      req.resume();
      await renderError(req, res, status, message);
    }
  };
}

module.exports = { createApp };
