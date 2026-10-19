'use strict';
const { html, raw } = require('../../lib/html');
const { icon } = require('../icons');
const { logoMark } = require('../illustrations');
const { collections } = require('../../schema');

const NOTICES = {
  saved: 'Changes saved.',
  created: 'Added.',
  deleted: 'Deleted.',
  moved: 'Order updated.',
  uploaded: 'Upload complete.',
  'message-deleted': 'Message deleted.',
  reset: 'Content reset.',
};

const NAV_ICONS = {
  domain: 'book', components: 'layers', milestones: 'flag', documents: 'file', presentations: 'slides', members: 'users', gallery: 'image',
};

function adminLayout(ctx, { title, active, content, actions = '', notice, unread = 0 }) {
  const site = ctx.site;
  const navItem = (key, href, label, ic, badge) => html`<li><a href="${href}"${active === key ? raw(' aria-current="page"') : ''}>${icon(ic, { size: 18 })}<span>${label}</span>${badge ? html`<span class="badge">${badge}</span>` : ''}</a></li>`;
  const noticeText = NOTICES[notice || (ctx.query && ctx.query.notice)] || '';
  return html`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${title} · Admin · ${site.shortTitle || 'Betel AI'}</title>
<link rel="icon" href="/img/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${ctx.asset('/css/site.css')}">
<link rel="stylesheet" href="${ctx.asset('/css/admin.css')}">
<script src="${ctx.asset('/js/theme.js')}"></script>
<script src="${ctx.asset('/js/admin.js')}" defer></script>
</head>
<body class="admin-body">
<div class="admin-shell" data-admin data-csrf="${ctx.csrf}" data-max-file="${ctx.limits ? ctx.limits.file : ''}" data-max-request="${ctx.limits ? ctx.limits.request : ''}">
  <aside class="admin-side" id="admin-side">
    <a class="admin-brand" href="/admin">${logoMark(30)}<span><strong>${site.shortTitle || 'Betel AI'}</strong><small>Admin · ${site.groupId}</small></span></a>
    <nav aria-label="Admin">
      <ul>
        ${navItem('dashboard', '/admin', 'Dashboard', 'grid')}
        ${navItem('settings', '/admin/settings', 'Site settings', 'sliders')}
      </ul>
      <p class="side-label">Content</p>
      <ul>${Object.entries(collections).map(([key, def]) => navItem(key, `/admin/${key}`, def.label, NAV_ICONS[key] || 'leaf'))}</ul>
      <p class="side-label">Files and messages</p>
      <ul>
        ${navItem('media', '/admin/media', 'Media library', 'folder')}
        ${navItem('messages', '/admin/messages', 'Messages', 'inbox', unread)}
        ${navItem('export', '/admin/export', 'Course-web export', 'download')}
      </ul>
    </nav>
    <div class="side-foot">
      <a href="/" target="_blank" rel="noopener">${icon('external', { size: 17 })}View site</a>
      <form method="post" action="/admin/logout"><input type="hidden" name="_csrf" value="${ctx.csrf}"><button type="submit">${icon('logout', { size: 17 })}Sign out</button></form>
    </div>
  </aside>
  <div class="admin-main">
    <header class="admin-top">
      <button type="button" class="icon-btn admin-menu" data-admin-menu aria-controls="admin-side" aria-expanded="false" aria-label="Menu">${icon('menu', { size: 22 })}</button>
      <h1>${title}</h1>
      <div class="admin-actions">${actions}
        <button type="button" class="icon-btn" data-theme-toggle aria-label="Switch between light and dark theme">${icon('moon', { size: 19, className: 'when-light' })}${icon('sun', { size: 19, className: 'when-dark' })}</button>
      </div>
    </header>
    ${noticeText ? html`<p class="notice notice-ok admin-notice" role="status">${icon('check', { size: 18 })}${noticeText}</p>` : ''}
    <div class="admin-content">${content}</div>
  </div>
</div>
</body>
</html>`;
}

function loginPage(ctx, { csrf, error, next, warning }) {
  const site = ctx.site;
  return html`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Sign in · Admin · ${site.shortTitle || 'Betel AI'}</title>
<link rel="icon" href="/img/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${ctx.asset('/css/site.css')}">
<link rel="stylesheet" href="${ctx.asset('/css/admin.css')}">
<script src="${ctx.asset('/js/theme.js')}"></script>
</head>
<body class="admin-body login-body">
<main class="login-card">
  <a class="admin-brand" href="/">${logoMark(36)}<span><strong>${site.shortTitle || 'Betel AI'}</strong><small>${site.siteTitle}</small></span></a>
  <h1>Admin sign in</h1>
  <p class="login-sub">Manage pages, documents, slides and photos for ${site.groupId}.</p>
  ${warning ? html`<p class="notice notice-warn">${icon('alert', { size: 18 })}<span>${warning}</span></p>` : ''}
  ${error ? html`<p class="notice notice-error" role="alert">${icon('alert', { size: 18 })}<span>${error}</span></p>` : ''}
  <form method="post" action="/admin/login" class="login-form">
    <input type="hidden" name="_csrf" value="${csrf}">
    <input type="hidden" name="next" value="${next || '/admin'}">
    <div class="field"><label for="l-user">Username</label><input id="l-user" name="username" autocomplete="username" required autofocus></div>
    <div class="field"><label for="l-pass">Password</label><input id="l-pass" name="password" type="password" autocomplete="current-password" required></div>
    <button class="btn btn-primary btn-block" type="submit">Sign in</button>
  </form>
  <a class="text-link login-back" href="/">${icon('arrowLeft', { size: 16 })}Back to the website</a>
</main>
</body>
</html>`;
}

module.exports = { adminLayout, loginPage };
