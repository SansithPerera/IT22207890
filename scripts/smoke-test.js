'use strict';
// npm test — starts the site on a temporary copy of the content and checks
// the public pages, the contact form, admin sign-in, editing, uploads,
// the media library, messages and the course-web export.
const os = require('os');
const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('assert');

if (process.env.DATABASE_URL && !process.argv.includes('--allow-db')) {
  console.error('DATABASE_URL is set. The smoke test writes test data, so it only runs against local storage.');
  console.error('Unset DATABASE_URL, or pass --allow-db if this database is a throwaway one.');
  process.exit(1);
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'betel-smoke-'));
process.env.DATA_DIR = tmp;
process.env.ADMIN_USERNAME = 'tester';
process.env.ADMIN_PASSWORD = 'test-password-123';
process.env.SESSION_SECRET = 'smoke-test-secret';
process.env.NODE_ENV = 'test';

const { createStore } = require('../src/store');
const { Content } = require('../src/content');
const { createApp } = require('../src/app');

let base = '';
const jar = new Map();
const cookieHeader = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
function keepCookies(res) {
  for (const c of res.headers.getSetCookie ? res.headers.getSetCookie() : []) {
    const [pair] = c.split(';');
    const i = pair.indexOf('=');
    const name = pair.slice(0, i);
    const value = pair.slice(i + 1);
    if (/Max-Age=0/i.test(c) || value === '') jar.delete(name); else jar.set(name, value);
  }
}
async function req(method, url, { body, headers = {} } = {}) {
  const res = await fetch(base + url, { method, body, headers: { cookie: cookieHeader(), ...headers }, redirect: 'manual' });
  keepCookies(res);
  const type = res.headers.get('content-type') || '';
  const text = /text|json|xml/.test(type) ? await res.text() : '';
  if (!text) await res.arrayBuffer().catch(() => {});
  return { status: res.status, headers: res.headers, text };
}
const form = (fields) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
};
const csrfFrom = (html) => (/name="_csrf" value="([^"]+)"/.exec(html) || /data-csrf="([^"]+)"/.exec(html) || [])[1];

const results = [];
async function check(name, fn) {
  try { await fn(); results.push(['ok', name]); console.log(`  ✓ ${name}`); } catch (err) { results.push(['fail', name, err]); console.log(`  ✗ ${name}\n    ${err.message}`); }
}

// 1×1 PNG and a tiny valid PDF
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360f8cfc0f01f0005fe02fe0dc2d6950000000049454e44ae426082', 'hex');
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');

(async () => {
  const store = createStore();
  const content = new Content(store);
  await content.init();
  const server = http.createServer(createApp(content));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
  console.log(`Smoke test against ${base} (${store.info().label})\n`);

  console.log('Public site');
  for (const [url, needle] of [['/', 'Intelligent'], ['/domain', 'Literature Survey'], ['/research/quality-grading', 'EfficientNet-B0'], ['/research/yield-prediction', '94.48%'], ['/milestones', 'Progress Presentation 2'], ['/documents', 'Project Charter'], ['/presentations', 'R62-IT-062-PP2.pdf'], ['/about', 'Thathsara Y P G S'], ['/contact', 'Email template']]) {
    await check(`GET ${url}`, async () => {
      const r = await req('GET', url);
      assert.strictEqual(r.status, 200);
      assert.ok(r.text.includes(needle), `missing "${needle}"`);
      assert.ok(r.headers.get('content-security-policy'), 'missing CSP');
    });
  }
  await check('404 page', async () => assert.strictEqual((await req('GET', '/does-not-exist')).status, 404));
  await check('search index', async () => { const r = await req('GET', '/search-index.json'); const data = JSON.parse(r.text); assert.ok(data.length > 20); });
  await check('static asset with gzip', async () => {
    const res = await fetch(`${base}/css/site.css`, { headers: { 'accept-encoding': 'gzip' } });
    assert.strictEqual(res.status, 200);
    await res.arrayBuffer();
  });
  await check('seed media served', async () => assert.strictEqual((await req('GET', '/media/team/thathsara.webp')).status, 200));
  await check('path traversal blocked', async () => assert.notStrictEqual((await req('GET', '/css/..%2f..%2fpackage.json')).status, 200));

  console.log('\nContact form');
  await check('invalid message is rejected', async () => {
    const r = await req('POST', '/contact', { body: new URLSearchParams({ name: '', email: 'nope', message: 'hi' }) });
    assert.strictEqual(r.status, 422);
    assert.ok(r.text.includes('valid email'));
  });
  await check('valid message is stored', async () => {
    const r = await req('POST', '/contact', { body: new URLSearchParams({ name: 'Nimal Perera', email: 'nimal@example.com', subject: 'Collaboration', message: 'We would like to test the grading app at our packing house.' }) });
    assert.strictEqual(r.status, 303);
    assert.strictEqual(r.headers.get('location'), '/contact?sent=1#message');
  });

  console.log('\nAdmin');
  await check('admin requires sign-in', async () => {
    const r = await req('GET', '/admin');
    assert.strictEqual(r.status, 303);
    assert.ok(r.headers.get('location').startsWith('/admin/login'));
  });
  let loginToken = '';
  await check('login page', async () => { const r = await req('GET', '/admin/login'); assert.strictEqual(r.status, 200); loginToken = csrfFrom(r.text); assert.ok(loginToken); });
  await check('wrong password is rejected', async () => {
    const r = await req('POST', '/admin/login', { body: new URLSearchParams({ _csrf: loginToken, username: 'tester', password: 'wrong' }) });
    assert.strictEqual(r.status, 401);
    loginToken = csrfFrom(r.text);
  });
  await check('sign in', async () => {
    const r = await req('POST', '/admin/login', { body: new URLSearchParams({ _csrf: loginToken, username: 'tester', password: 'test-password-123', next: '/admin' }) });
    assert.strictEqual(r.status, 303);
    assert.ok(jar.has('bl_admin'), 'no session cookie');
  });
  let csrf = '';
  await check('dashboard', async () => {
    const r = await req('GET', '/admin');
    assert.strictEqual(r.status, 200);
    assert.ok(r.text.includes('To do'));
    csrf = csrfFrom(r.text);
    assert.ok(csrf);
  });
  await check('form without CSRF token is refused', async () => {
    const r = await req('POST', '/admin/settings', { body: form({ siteTitle: 'Hacked' }) });
    assert.strictEqual(r.status, 403);
  });
  for (const coll of ['domain', 'components', 'milestones', 'documents', 'presentations', 'members', 'gallery']) {
    await check(`list ${coll}`, async () => assert.strictEqual((await req('GET', `/admin/${coll}`)).status, 200));
  }
  await check('save settings', async () => {
    const page = await req('GET', '/admin/settings');
    const settings = await content.settings();
    const fields = { _csrf: csrf };
    for (const [k, v] of Object.entries(settings)) if (typeof v === 'string') fields[k] = v;
    for (const [k, v] of Object.entries(settings)) if (Array.isArray(v)) fields[k] = v.join('\n');
    fields.contactEmail = 'r62-it-062@example.com';
    assert.strictEqual(page.status, 200);
    const r = await req('POST', '/admin/settings', { body: form(fields) });
    assert.strictEqual(r.status, 303, r.text.slice(0, 300));
    const contact = await req('GET', '/contact');
    assert.ok(contact.text.includes('r62-it-062@example.com'));
    const s2 = await content.settings();
    assert.ok(s2.collaboratorImage && s2.collaboratorImage.url, 'collaborator image lost');
    assert.strictEqual(s2.stats.length, settings.stats.length, 'list field changed');
  });
  await check('invalid settings show errors', async () => {
    const r = await req('POST', '/admin/settings', { body: form({ _csrf: csrf, siteTitle: '', contactEmail: 'not-an-email' }) });
    assert.strictEqual(r.status, 422);
    assert.ok(r.text.includes('valid email'));
  });
  let docId = '';
  await check('upload a document', async () => {
    const fd = form({ _csrf: csrf, title: 'Smoke Test Report', category: 'Other', description: 'Uploaded by the smoke test', author: 'Group', date: '2026-10-01' });
    fd.append('file', new Blob([PDF], { type: 'application/pdf' }), 'smoke report.pdf');
    const r = await req('POST', '/admin/documents/new', { body: fd });
    assert.strictEqual(r.status, 303, r.text.slice(0, 400));
    const doc = (await content.list('documents')).find((d) => d.title === 'Smoke Test Report');
    assert.ok(doc && doc.file && doc.file.url.startsWith('/files/'));
    docId = doc.id;
    const file = await req('GET', doc.file.url);
    assert.strictEqual(file.status, 200);
    assert.strictEqual(file.headers.get('content-type'), 'application/pdf');
    const dl = await req('GET', `${doc.file.url}?download=1`);
    assert.ok(/^attachment/.test(dl.headers.get('content-disposition')));
    assert.ok((await req('GET', '/documents')).text.includes('Smoke Test Report'));
  });
  await check('fake file type is rejected', async () => {
    const fd = form({ _csrf: csrf, title: 'Bad file', category: 'Other' });
    fd.append('file', new Blob([Buffer.from('MZ this is not a pdf')], { type: 'application/pdf' }), 'virus.pdf');
    const r = await req('POST', '/admin/documents/new', { body: fd });
    assert.strictEqual(r.status, 422);
    assert.ok(r.text.includes('does not look like a real .pdf'));
  });
  await check('edit a document and remove its file', async () => {
    const r = await req('POST', `/admin/documents/${docId}`, { body: form({ _csrf: csrf, title: 'Smoke Test Report v2', category: 'Other', file__remove: 'on' }) });
    assert.strictEqual(r.status, 303);
    const doc = await content.get('documents', docId);
    assert.strictEqual(doc.title, 'Smoke Test Report v2');
    assert.strictEqual(doc.file, null);
    assert.strictEqual((await content.listFiles()).length, 0, 'unused file was not deleted');
  });
  await check('add a gallery photo', async () => {
    const fd = form({ _csrf: csrf, caption: 'Smoke test photo', category: 'Team', date: '2026-10-02' });
    fd.append('image', new Blob([PNG], { type: 'image/png' }), 'team.png');
    const r = await req('POST', '/admin/gallery/new', { body: fd });
    assert.strictEqual(r.status, 303, r.text.slice(0, 400));
    const item = (await content.list('gallery')).find((g) => g.caption === 'Smoke test photo');
    assert.ok(item.image.url.startsWith('/files/'));
    assert.strictEqual((await req('GET', item.image.url)).status, 200);
  });
  await check('gallery photo is required', async () => {
    const r = await req('POST', '/admin/gallery/new', { body: form({ _csrf: csrf, caption: 'No photo' }) });
    assert.strictEqual(r.status, 422);
  });
  await check('update milestone marks', async () => {
    const ms = (await content.list('milestones'))[0];
    const fields = { _csrf: csrf };
    for (const [k, v] of Object.entries(ms)) if (typeof v === 'string') fields[k] = v;
    fields.deliverables = ms.deliverables.join('\n');
    fields.marks = '12%';
    const r = await req('POST', `/admin/milestones/${ms.id}`, { body: form(fields) });
    assert.strictEqual(r.status, 303, r.text.slice(0, 300));
    assert.ok((await req('GET', '/milestones')).text.includes('12%'));
  });
  await check('edit component keeps screenshots and captions', async () => {
    const comp = await content.bySlug('components', 'quality-grading');
    const fields = { _csrf: csrf };
    for (const [k, v] of Object.entries(comp)) {
      if (typeof v === 'string') fields[k] = v;
      else if (Array.isArray(v) && typeof v[0] === 'string') fields[k] = v.join('\n');
    }
    comp.screenshots.forEach((s, i) => { fields[`screenshots__caption_${i}`] = i === 0 ? 'Updated caption' : s.caption; fields[`screenshots__order_${i}`] = String(i + 1); });
    fields.screenshots__remove_4 = 'on';
    const fd = form(fields);
    fd.append('screenshots__new', new Blob([PNG], { type: 'image/png' }), 'new-screen.png');
    const r = await req('POST', `/admin/components/${comp.id}`, { body: fd });
    assert.strictEqual(r.status, 303, r.text.slice(0, 300));
    const after = await content.get('components', comp.id);
    assert.strictEqual(after.screenshots.length, 5);
    assert.strictEqual(after.screenshots[0].caption, 'Updated caption');
    assert.ok(after.screenshots[4].url.startsWith('/files/'));
    assert.strictEqual(after.slug, 'quality-grading');
    assert.ok(after.workflowImage && after.workflowImage.url, 'workflow image lost');
  });
  await check('create, reorder and delete a member', async () => {
    let r = await req('POST', '/admin/members/new', { body: form({ _csrf: csrf, name: 'Dr. Test Supervisor', type: 'Supervisor', role: 'Senior Lecturer, SLIIT', email: 'supervisor@example.com' }) });
    assert.strictEqual(r.status, 303);
    const m = (await content.list('members')).find((x) => x.name === 'Dr. Test Supervisor');
    r = await req('POST', `/admin/members/${m.id}/move`, { body: form({ _csrf: csrf, dir: 'up' }) });
    assert.strictEqual(r.status, 303);
    const list = await content.list('members');
    assert.strictEqual(list[list.length - 2].id, m.id, 'move up failed');
    assert.ok((await req('GET', '/about')).text.includes('Dr. Test Supervisor'));
    r = await req('POST', `/admin/members/${m.id}/delete`, { body: form({ _csrf: csrf }) });
    assert.strictEqual(r.status, 303);
    assert.ok(!(await content.get('members', m.id)));
  });
  await check('media library upload and delete', async () => {
    const fd = form({ _csrf: csrf });
    fd.append('files', new Blob([PDF], { type: 'application/pdf' }), 'notes.pdf');
    let r = await req('POST', '/admin/media', { body: fd });
    assert.strictEqual(r.status, 303);
    const page = await req('GET', '/admin/media');
    assert.ok(page.text.includes('notes.pdf'));
    const f = (await content.listFiles()).find((x) => x.name === 'notes.pdf');
    r = await req('POST', `/admin/media/${f.id}/delete`, { body: form({ _csrf: csrf }) });
    assert.strictEqual(r.status, 303);
    assert.strictEqual((await req('GET', `/files/${f.id}/notes.pdf`)).status, 404);
  });
  await check('messages inbox', async () => {
    const list = await req('GET', '/admin/messages');
    assert.ok(list.text.includes('Nimal Perera'));
    const msg = (await content.list('messages'))[0];
    const view = await req('GET', `/admin/messages/${msg.id}`);
    assert.strictEqual(view.status, 200);
    assert.ok((await content.get('messages', msg.id)).read);
    const del = await req('POST', `/admin/messages/${msg.id}/delete`, { body: form({ _csrf: csrf }) });
    assert.strictEqual(del.status, 303);
  });
  await check('markdown preview', async () => {
    const r = await req('POST', '/admin/preview', { body: JSON.stringify({ markdown: '**Bold** <script>alert(1)</script>' }), headers: { 'content-type': 'application/json', 'x-csrf-token': csrf } });
    assert.strictEqual(r.status, 200);
    const { html } = JSON.parse(r.text);
    assert.ok(html.includes('<strong>Bold</strong>'));
    assert.ok(!html.includes('<script>'));
  });
  await check('course-web export ZIP', async () => {
    const res = await fetch(`${base}/admin/export.zip`, { headers: { cookie: cookieHeader() } });
    assert.strictEqual(res.status, 200);
    const buf = Buffer.from(await res.arrayBuffer());
    assert.strictEqual(buf.slice(0, 2).toString(), 'PK');
    assert.ok(buf.length < 20 * 1024 * 1024, `ZIP is ${buf.length} bytes`);
  });
  await check('sign out', async () => {
    const r = await req('POST', '/admin/logout', { body: form({ _csrf: csrf }) });
    assert.strictEqual(r.status, 303);
    assert.strictEqual((await req('GET', '/admin')).status, 303);
  });

  server.close();
  await store.close();
  fs.rmSync(tmp, { recursive: true, force: true });
  const failed = results.filter((r) => r[0] === 'fail');
  console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
  process.exit(failed.length ? 1 : 0);
})().catch((err) => { console.error(err); process.exit(1); });
