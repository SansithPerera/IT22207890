'use strict';
const fs = require('fs');
const { sendHtml, sendJson, send, redirect, parseForm, createRateLimiter, HttpError } = require('../lib/http');
const { INLINE_TYPES } = require('../lib/uploads');
const { buildContext, searchIndex } = require('../site');
const { homePage } = require('../views/pages/home');
const { domainPage, componentPage } = require('../views/pages/domain');
const { milestonesPage } = require('../views/pages/milestones');
const { documentsPage, presentationsPage } = require('../views/pages/documents');
const { aboutPage } = require('../views/pages/about');
const { contactPage, notFoundPage } = require('../views/pages/contact');

function publicRoutes(router, { content }) {
  const contactLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5 });
  const ctxFor = (req) => buildContext(content, { mode: 'server', origin: req.origin, query: req.query });
  const page = (view) => async (req, res) => sendHtml(req, res, 200, view(await ctxFor(req)));

  router.get('/', page(homePage));
  router.get('/domain', page(domainPage));
  router.get('/milestones', page(milestonesPage));
  router.get('/documents', page(documentsPage));
  router.get('/presentations', page(presentationsPage));
  router.get('/about', page(aboutPage));

  router.get('/research/:slug', async (req, res) => {
    const ctx = await ctxFor(req);
    const comp = ctx.data.components.find((c) => c.slug === req.params.slug);
    if (!comp) return sendHtml(req, res, 404, notFoundPage(ctx));
    return sendHtml(req, res, 200, componentPage(ctx, comp));
  });

  router.get('/contact', async (req, res) => {
    sendHtml(req, res, 200, contactPage(await ctxFor(req), { sent: req.query.sent === '1' }));
  });

  router.post('/contact', async (req, res) => {
    const form = await parseForm(req, 64 * 1024);
    const values = {
      name: String(form.get('name') || '').trim().slice(0, 100),
      member: String(form.get('member') || '').trim().slice(0, 40),
      subject: String(form.get('subject') || 'General enquiry').trim().slice(0, 80),
      message: String(form.get('message') || '').trim().slice(0, 4000),
    };
    // Bots fill in the hidden "website" field; pretend all went well.
    if (form.get('website')) return redirect(res, '/contact?sent=1#message');
    const errors = {};
    if (!values.name) errors.name = 'Please enter your name.';
    // The visitor picks a group member; the member's email comes from the admin panel.
    const member = (await content.list('members')).find((m) => m.id === values.member && m.type === 'Team member');
    if (!member) errors.member = 'Please choose the group member you want to contact.';
    if (values.message.length < 10) errors.message = 'Please write a message of at least 10 characters.';
    if (!Object.keys(errors).length && !contactLimiter.hit(req.ip)) errors._form = 'Too many messages from your connection. Please wait 15 minutes and try again.';
    if (Object.keys(errors).length) {
      return sendHtml(req, res, 422, contactPage(await ctxFor(req), { values, errors }));
    }
    await content.addMessage({ ...values, memberName: member.name, toEmail: member.email || '', ip: req.ip, userAgent: String(req.headers['user-agent'] || '').slice(0, 200) });
    return redirect(res, '/contact?sent=1#message');
  });

  router.get('/search-index.json', async (req, res) => {
    sendJson(req, res, 200, searchIndex(await ctxFor(req)), { 'Cache-Control': 'public, max-age=300' });
  });

  // Uploaded files. The id is unique per upload, so the response can be cached for good.
  const serveFile = async (req, res) => {
    const found = await content.getFile(req.params.id);
    if (!found) throw new HttpError(404, 'File not found');
    const { meta } = found;
    const inline = INLINE_TYPES.test(meta.mime) && req.query.download !== '1';
    const encoded = encodeURIComponent(meta.name).replace(/['()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
    const asciiName = meta.name.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '');
    const headers = {
      'Content-Type': meta.mime,
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${asciiName}"; filename*=UTF-8''${encoded}`,
      'Cache-Control': 'public, max-age=31536000, immutable',
      // Lets a CDN (Vercel's, for example) keep a copy for a day, so popular
      // photos are not read from the database on every visit.
      'CDN-Cache-Control': 'public, max-age=86400',
      ETag: `"${meta.id}"`,
    };
    if (req.headers['if-none-match'] === headers.ETag) { res.writeHead(304, headers); return res.end(); }
    if (found.path) {
      const stat = fs.statSync(found.path);
      res.writeHead(200, { ...headers, 'Content-Length': stat.size });
      if (req.method === 'HEAD') return res.end();
      return fs.createReadStream(found.path).pipe(res);
    }
    res.writeHead(200, { ...headers, 'Content-Length': found.buffer.length });
    return res.end(req.method === 'HEAD' ? undefined : found.buffer);
  };
  router.get('/files/:id', serveFile);
  router.get('/files/:id/:name', serveFile);

  router.get('/robots.txt', (req, res) => send(req, res, 200, 'User-agent: *\nDisallow: /admin\n', { 'Content-Type': 'text/plain; charset=utf-8' }));
  router.get('/sitemap.xml', async (req, res) => {
    const ctx = await ctxFor(req);
    const paths = ['/', '/domain', '/milestones', '/documents', '/presentations', '/about', '/contact', ...ctx.data.components.map((c) => `/research/${c.slug}`)];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((p) => `<url><loc>${req.origin}${p}</loc></url>`).join('')}</urlset>`;
    send(req, res, 200, xml, { 'Content-Type': 'application/xml; charset=utf-8' });
  });
  router.get('/healthz', (req, res) => sendJson(req, res, 200, { ok: true, storage: content.store.info().driver }));
}

module.exports = { publicRoutes };
