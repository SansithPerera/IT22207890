'use strict';
// Page shell: <head>, header with navigation, footer, search and lightbox.
const { html, raw, safeUrl } = require('../lib/html');
const { icon } = require('./icons');
const { sprite, logoMark } = require('./illustrations');
const { emailLine } = require('./partials');

const NAV = [
  { key: 'home', label: 'Home', href: '/' },
  { key: 'domain', label: 'Domain', href: '/domain' },
  { key: 'milestones', label: 'Milestones', href: '/milestones' },
  { key: 'documents', label: 'Documents', href: '/documents' },
  { key: 'presentations', label: 'Presentations', href: '/presentations' },
  { key: 'about', label: 'About Us', href: '/about' },
  { key: 'contact', label: 'Contact Us', href: '/contact' },
];

function domainMenu(ctx) {
  const sections = ctx.data.domain || [];
  const comps = ctx.data.components || [];
  if (!sections.length && !comps.length) return '';
  return html`<div class="submenu" role="group" aria-label="Domain sections">
    <div class="submenu-col">
      <p class="submenu-label">Domain</p>
      ${sections.map((s) => html`<a href="/domain#${s.slug}">${s.title}</a>`)}
    </div>
    ${comps.length ? html`<div class="submenu-col">
      <p class="submenu-label">Research components</p>
      ${comps.map((c) => html`<a href="/research/${c.slug}"><span class="dot dot-${c.accent || 'leaf'}" aria-hidden="true"></span>${c.shortTitle || c.title}</a>`)}
    </div>` : ''}
  </div>`;
}

function header(ctx, active) {
  const site = ctx.site;
  return html`<header class="site-header" data-header>
    <div class="wrap header-inner">
      <a class="brand" href="/" aria-label="${site.shortTitle || site.siteTitle} — home">
        ${logoMark(32)}
        <span class="brand-text"><span class="brand-name">${site.shortTitle || 'Betel AI'}</span><span class="brand-id">${site.groupId}</span></span>
      </a>
      <nav class="main-nav" id="main-nav" aria-label="Main">
        <ul>
          ${NAV.map((item) => html`<li class="${item.key === 'domain' ? 'has-sub' : ''}">
            <a href="${item.href}"${item.key === active ? raw(' aria-current="page"') : ''}>${item.label}</a>
            ${item.key === 'domain' ? domainMenu(ctx) : ''}
          </li>`)}
        </ul>
      </nav>
      <div class="header-tools">
        <button type="button" class="icon-btn" data-search-open aria-label="Search the site (press /)">${icon('search', { size: 19 })}</button>
        <button type="button" class="icon-btn" data-theme-toggle aria-label="Switch between light and dark theme">${icon('moon', { size: 19, className: 'when-light' })}${icon('sun', { size: 19, className: 'when-dark' })}</button>
        <button type="button" class="icon-btn menu-btn" data-menu-toggle aria-controls="main-nav" aria-expanded="false" aria-label="Menu">${icon('menu', { size: 22, className: 'when-closed' })}${icon('close', { size: 22, className: 'when-open' })}</button>
      </div>
    </div>
  </header>`;
}

function footer(ctx) {
  const { site, data } = ctx;
  const year = site.year || new Date().getFullYear();
  const links = [
    site.githubUrl && { href: site.githubUrl, label: 'GitHub', icon: 'code' },
    site.youtubeUrl && { href: site.youtubeUrl, label: 'YouTube', icon: 'youtube' },
    site.linkedinUrl && { href: site.linkedinUrl, label: 'LinkedIn', icon: 'linkedin' },
  ].filter((l) => l && safeUrl(l.href));
  return html`<footer class="site-footer">
    <div class="wrap footer-grid">
      <div class="footer-about">
        <a class="brand brand-footer" href="/">${logoMark(30)}<span class="brand-text"><span class="brand-name">${site.shortTitle || 'Betel AI'}</span><span class="brand-id">${site.groupId}</span></span></a>
        <p>${site.siteTitle}</p>
        <p class="footer-muted">${site.faculty ? `${site.faculty}, ` : ''}${site.institution}</p>
      </div>
      <div>
        <p class="footer-label">Explore</p>
        <ul class="footer-links">${NAV.map((n) => html`<li><a href="${n.href}">${n.label}</a></li>`)}</ul>
      </div>
      <div>
        <p class="footer-label">Research</p>
        <ul class="footer-links">${(data.components || []).map((c) => html`<li><a href="/research/${c.slug}">${c.shortTitle || c.title}</a></li>`)}</ul>
      </div>
      <div>
        <p class="footer-label">Contact</p>
        ${site.contactEmail ? html`<p>${emailLine(site.contactEmail)}</p>` : ''}
        ${site.address ? html`<p class="footer-muted footer-address">${site.address}</p>` : ''}
        ${links.length ? html`<div class="footer-social">${links.map((l) => html`<a class="icon-btn" href="${l.href}" target="_blank" rel="noopener" aria-label="${l.label}">${icon(l.icon, { size: 19 })}</a>`)}</div>` : ''}
      </div>
    </div>
    <div class="wrap footer-bottom">
      <p>© ${year} ${site.groupId} · ${site.footerNote || site.institution}</p>
      ${ctx.mode === 'server' ? html`<a class="footer-admin" href="/admin">${icon('sliders', { size: 15 })}Admin</a>` : ''}
    </div>
  </footer>`;
}

function dialogs() {
  return html`
  <dialog class="search-dialog" data-search-dialog aria-label="Search">
    <form method="dialog" class="search-box" role="search">
      ${icon('search', { size: 20 })}
      <label class="visually-hidden" for="site-search">Search the site</label>
      <input id="site-search" type="search" placeholder="Search pages, components, documents…" autocomplete="off" data-search-input>
      <button class="icon-btn" value="close" aria-label="Close search">${icon('close', { size: 20 })}</button>
    </form>
    <div class="search-results" data-search-results aria-live="polite"><p class="search-hint">Try “OOD”, “yield”, “PP2” or a member’s name.</p></div>
  </dialog>
  <dialog class="lightbox" data-lightbox-dialog aria-label="Image viewer">
    <button type="button" class="icon-btn lightbox-close" data-lightbox-close aria-label="Close">${icon('close', { size: 22 })}</button>
    <button type="button" class="icon-btn lightbox-nav lightbox-prev" data-lightbox-prev aria-label="Previous image">${icon('chevronLeft', { size: 26 })}</button>
    <figure><img alt="" data-lightbox-img><figcaption data-lightbox-caption></figcaption></figure>
    <button type="button" class="icon-btn lightbox-nav lightbox-next" data-lightbox-next aria-label="Next image">${icon('chevronRight', { size: 26 })}</button>
  </dialog>`;
}

function layout(ctx, { title, description, active, content, pageClass = '', fullTitle = false }) {
  const site = ctx.site;
  const docTitle = fullTitle ? `${site.shortTitle || 'Betel AI'} · ${site.siteTitle}` : `${title} · ${site.shortTitle || site.siteTitle}`;
  const desc = description || site.seoDescription || site.tagline || '';
  const ogImage = ctx.absolute ? ctx.absolute('/img/og-image.png') : '/img/og-image.png';
  const doc = html`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${docTitle}</title>
<meta name="description" content="${desc}">
<meta name="theme-color" content="#0d3b2a">
<meta property="og:type" content="website">
<meta property="og:title" content="${docTitle}">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${ogImage}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/img/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/img/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/img/apple-touch-icon.png">
<link rel="preload" href="/fonts/YoungSerif-Regular.woff" as="font" type="font/woff" crossorigin>
<link rel="preload" href="/fonts/InstrumentSans-Regular.woff" as="font" type="font/woff" crossorigin>
<link rel="stylesheet" href="${ctx.asset('/css/site.css')}">
<script src="${ctx.asset('/js/theme.js')}"></script>
<script src="${ctx.asset('/js/site.js')}" defer></script>
</head>
<body>
<div class="page ${pageClass}" data-search-index="/search-index.json">
<a class="skip-link" href="#main">Skip to content</a>
${sprite()}
${ctx.mode === 'preview' ? html`<div class="preview-bar">${icon('info', { size: 16 })}<span>Design preview. Uploads, the admin panel and the contact form work on the deployed site.</span></div>` : ''}
${header(ctx, active)}
<main id="main" tabindex="-1">
${content}
</main>
${footer(ctx)}
${dialogs()}
</div>
</body>
</html>`;
  return doc;
}

module.exports = { layout, NAV };
