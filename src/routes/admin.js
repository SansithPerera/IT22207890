'use strict';
const config = require('../config');
const { sendHtml, sendJson, send, redirect, parseForm, createRateLimiter, HttpError } = require('../lib/http');
const auth = require('../lib/auth');
const { prepareUpload, hasSharp } = require('../lib/uploads');
const { renderMarkdown } = require('../lib/markdown');
const { collections, settingsFields } = require('../schema');
const { readFields, fileIds } = require('../admin/fields');
const { buildContext } = require('../site');
const { loginPage } = require('../views/admin/layout');
const pages = require('../views/admin/pages');
const { buildExportZip } = require('../export');

function adminRoutes(router, { content }) {
  const loginLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10 });
  const requestLimit = config.maxRequestMb * 1024 * 1024;

  async function adminCtx(req) {
    const ctx = await buildContext(content, { mode: 'server', origin: req.origin, query: req.query });
    ctx.csrf = req.admin ? req.admin.c : '';
    ctx.unread = ctx.data.messages.filter((m) => !m.read).length;
    return ctx;
  }

  // Parse the form and check its CSRF token.
  async function form(req) {
    const body = await parseForm(req, requestLimit);
    auth.checkCsrf(req, body.get ? body.get('_csrf') : null);
    return body;
  }

  // Delete uploaded files that nothing references any more.
  async function cleanupFiles(candidateIds) {
    if (!candidateIds.size) return;
    const usage = await content.fileUsage();
    for (const id of candidateIds) if (!usage.has(id)) await content.deleteFile(id).catch(() => {});
  }

  const guard = (req, res) => auth.requireAdmin(req, res);
  const validColl = (coll) => {
    if (!Object.prototype.hasOwnProperty.call(collections, coll)) throw new HttpError(404, 'Not found');
    return collections[coll];
  };

  // ---------------------------------------------------------------- sign in
  router.get('/admin/login', async (req, res) => {
    if (auth.loadSession(req)) return redirect(res, '/admin');
    const ctx = await buildContext(content, { mode: 'server' });
    const csrf = auth.loginCsrf(req, res);
    let warning = '';
    if (!config.adminPassword) warning = 'Admin sign-in is switched off because ADMIN_PASSWORD is not set. Add it to the environment variables and restart.';
    else if (config.usingDefaultPassword) warning = `Development mode: sign in with ${config.adminUser} / ${config.adminPassword}. Set ADMIN_PASSWORD before you deploy.`;
    return sendHtml(req, res, 200, loginPage(ctx, { csrf, next: req.query.next, warning }));
  });

  router.post('/admin/login', async (req, res) => {
    const body = await parseForm(req, 16 * 1024);
    const ctx = await buildContext(content, { mode: 'server' });
    const retry = (status, error) => sendHtml(req, res, status, loginPage(ctx, { csrf: auth.loginCsrf(req, res), error, next: body.get('next') }));
    if (!auth.checkLoginCsrf(req, body.get('_csrf'))) return retry(403, 'The sign-in form expired. Please try again.');
    if (!loginLimiter.hit(req.ip)) return retry(429, 'Too many attempts. Wait 15 minutes and try again.');
    const username = String(body.get('username') || '').trim();
    const password = String(body.get('password') || '');
    if (!auth.checkCredentials(username, password)) return retry(401, 'That username and password do not match.');
    loginLimiter.reset(req.ip);
    auth.startSession(req, res, username);
    const next = String(body.get('next') || '/admin');
    return redirect(res, next.startsWith('/admin') && !next.startsWith('//') ? next : '/admin');
  });

  router.post('/admin/logout', guard, async (req, res) => {
    await form(req);
    auth.endSession(req, res);
    redirect(res, '/admin/login');
  });

  // ---------------------------------------------------------------- dashboard
  router.get('/admin', guard, async (req, res) => {
    const ctx = await adminCtx(req);
    const store = content.store.info();
    const warnings = [];
    if (config.usingDefaultPassword && config.adminPassword) warnings.push({ html: 'You are using the development password. Set <strong>ADMIN_PASSWORD</strong> before deploying.' });
    if (config.sessionSecretIsRandom && config.isProduction) warnings.push({ html: 'Set <strong>SESSION_SECRET</strong> so you stay signed in when the server restarts.' });
    if (store.driver === 'local' && (process.env.RENDER || process.env.RAILWAY_ENVIRONMENT || process.env.VERCEL)) {
      warnings.push({ level: 'error', html: 'This host wipes local files on every restart, so uploads and edits will be lost. Set <strong>DATABASE_URL</strong> to a PostgreSQL database (see README).' });
    }
    const files = await content.listFiles();
    const html = pages.dashboardPage(ctx, {
      info: { ...store, sharp: hasSharp(), maxUploadMb: config.maxUploadMb },
      warnings,
      recent: ctx.data.messages.slice(0, 4),
      fileCount: files.length,
    });
    sendHtml(req, res, 200, html);
  });

  // ---------------------------------------------------------------- settings
  router.get('/admin/settings', guard, async (req, res) => {
    const ctx = await adminCtx(req);
    sendHtml(req, res, 200, pages.settingsPage(ctx, { values: ctx.site }));
  });

  router.post('/admin/settings', guard, async (req, res) => {
    const body = await form(req);
    const before = await content.settings();
    const { values, errors } = await readFields(settingsFields, body, before, { content, options: (await content.snapshot()).collections });
    if (Object.keys(errors).length) {
      const ctx = await adminCtx(req);
      return sendHtml(req, res, 422, pages.settingsPage(ctx, { values: { ...before, ...values }, errors }));
    }
    await content.saveSettings(values);
    await cleanupFiles(fileIds(Object.values(before)));
    return redirect(res, '/admin/settings?notice=saved');
  });

  // ---------------------------------------------------------------- media
  router.get('/admin/media', guard, async (req, res) => {
    const ctx = await adminCtx(req);
    sendHtml(req, res, 200, pages.mediaPage(ctx, { files: await content.listFiles(), usage: await content.fileUsage() }));
  });

  router.post('/admin/media', guard, async (req, res) => {
    const body = await form(req);
    const uploads = body.files('files');
    try {
      if (!uploads.length) throw new HttpError(400, 'Choose at least one file to upload.');
      for (const file of uploads) {
        const { meta, buffer } = await prepareUpload(file, 'file');
        await content.saveFile(meta, buffer);
      }
    } catch (err) {
      if (!(err instanceof HttpError)) throw err;
      const ctx = await adminCtx(req);
      return sendHtml(req, res, err.status || 400, pages.mediaPage(ctx, { files: await content.listFiles(), usage: await content.fileUsage(), error: err.message }));
    }
    return redirect(res, '/admin/media?notice=uploaded');
  });

  router.post('/admin/media/:id/delete', guard, async (req, res) => {
    await form(req);
    await content.deleteFile(req.params.id);
    redirect(res, '/admin/media?notice=deleted');
  });

  // ---------------------------------------------------------------- messages
  router.get('/admin/messages', guard, async (req, res) => {
    sendHtml(req, res, 200, pages.messagesPage(await adminCtx(req)));
  });

  router.get('/admin/messages/:id', guard, async (req, res) => {
    let msg = await content.get('messages', req.params.id);
    if (!msg) throw new HttpError(404, 'Message not found');
    if (!msg.read) msg = await content.update('messages', msg.id, { read: true });
    sendHtml(req, res, 200, pages.messagePage(await adminCtx(req), msg));
  });

  router.post('/admin/messages/:id/read', guard, async (req, res) => {
    await form(req);
    const msg = await content.get('messages', req.params.id);
    if (!msg) throw new HttpError(404, 'Message not found');
    await content.update('messages', msg.id, { read: !msg.read });
    redirect(res, msg.read ? '/admin/messages' : `/admin/messages/${msg.id}`);
  });

  router.post('/admin/messages/:id/delete', guard, async (req, res) => {
    await form(req);
    await content.remove('messages', req.params.id);
    redirect(res, '/admin/messages?notice=message-deleted');
  });

  // ---------------------------------------------------------------- export
  router.get('/admin/export', guard, async (req, res) => {
    const ctx = await adminCtx(req);
    sendHtml(req, res, 200, pages.exportPage(ctx, { budgetMb: config.exportBudgetMb, liveUrl: ctx.liveUrl || (/localhost|127\.0\.0\.1/.test(req.origin) ? '' : req.origin) }));
  });

  router.get('/admin/export.zip', guard, async (req, res) => {
    const liveFallback = /localhost|127\.0\.0\.1/.test(req.origin) ? '' : req.origin;
    const { zip, report } = await buildExportZip(content, { liveUrlFallback: liveFallback });
    const stamp = new Date().toISOString().slice(0, 10);
    send(req, res, 200, zip, {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="course-web-site-${stamp}.zip"`,
      'Cache-Control': 'no-store',
      'X-Export-Size': String(report.totalBytes),
    });
  });

  // ---------------------------------------------------------------- markdown preview
  router.post('/admin/preview', guard, async (req, res) => {
    const body = await parseForm(req, 256 * 1024);
    const data = body.json || {};
    auth.checkCsrf(req, req.headers['x-csrf-token']);
    sendJson(req, res, 200, { html: String(renderMarkdown(String(data.markdown || ''))) });
  });

  // ---------------------------------------------------------------- collections
  router.get('/admin/:coll', guard, async (req, res) => {
    validColl(req.params.coll);
    sendHtml(req, res, 200, pages.listPage(await adminCtx(req), req.params.coll));
  });

  router.get('/admin/:coll/new', guard, async (req, res) => {
    const def = validColl(req.params.coll);
    const ctx = await adminCtx(req);
    const values = {};
    for (const f of def.fields) if (f.default !== undefined) values[f.name] = f.default;
    for (const f of def.fields) if (req.query[f.name] && ['select', 'text'].includes(f.type)) values[f.name] = req.query[f.name];
    sendHtml(req, res, 200, pages.formPage(ctx, req.params.coll, { values, isNew: true }));
  });

  router.post('/admin/:coll/new', guard, async (req, res) => {
    const coll = req.params.coll;
    const def = validColl(coll);
    const body = await form(req);
    const snap = await content.snapshot();
    const { values, errors } = await readFields(def.fields, body, null, { content, options: snap.collections });
    if (Object.keys(errors).length) {
      return sendHtml(req, res, 422, pages.formPage(await adminCtx(req), coll, { values, errors, isNew: true }));
    }
    await content.create(coll, values);
    return redirect(res, `/admin/${coll}?notice=created`);
  });

  router.get('/admin/:coll/:id', guard, async (req, res) => {
    validColl(req.params.coll);
    const item = await content.get(req.params.coll, req.params.id);
    if (!item) throw new HttpError(404, 'This item no longer exists.');
    sendHtml(req, res, 200, pages.formPage(await adminCtx(req), req.params.coll, { item, values: item }));
  });

  router.post('/admin/:coll/:id', guard, async (req, res) => {
    const coll = req.params.coll;
    const def = validColl(coll);
    const item = await content.get(coll, req.params.id);
    if (!item) throw new HttpError(404, 'This item no longer exists.');
    const body = await form(req);
    const snap = await content.snapshot();
    const { values, errors } = await readFields(def.fields, body, item, { content, options: snap.collections });
    if (Object.keys(errors).length) {
      return sendHtml(req, res, 422, pages.formPage(await adminCtx(req), coll, { item, values: { ...item, ...values }, errors }));
    }
    await content.update(coll, item.id, values);
    await cleanupFiles(fileIds(Object.values(item)));
    return redirect(res, `/admin/${coll}/${item.id}?notice=saved`);
  });

  router.post('/admin/:coll/:id/delete', guard, async (req, res) => {
    const coll = req.params.coll;
    validColl(coll);
    await form(req);
    const removed = await content.remove(coll, req.params.id);
    if (removed) await cleanupFiles(fileIds(Object.values(removed)));
    redirect(res, `/admin/${coll}?notice=deleted`);
  });

  router.post('/admin/:coll/:id/move', guard, async (req, res) => {
    const coll = req.params.coll;
    validColl(coll);
    const body = await form(req);
    await content.move(coll, req.params.id, body.get('dir') === 'up' ? 'up' : 'down');
    redirect(res, `/admin/${coll}?notice=moved`);
  });
}

module.exports = { adminRoutes };
