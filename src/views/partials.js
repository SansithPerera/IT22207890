'use strict';
// Small building blocks shared by the public pages.
const { html, raw, safeUrl } = require('../lib/html');
const { formatDate, formatBytes, fileTypeLabel, initials, pair } = require('../lib/util');
const { icon } = require('./icons');
const { outlineLeaf } = require('./illustrations');

function breadcrumbs(crumbs) {
  if (!crumbs || !crumbs.length) return '';
  return html`<nav class="crumbs" aria-label="Breadcrumb"><ol>
    ${crumbs.map((c, i) => (i === crumbs.length - 1
    ? html`<li><span aria-current="page">${c.label}</span></li>`
    : html`<li><a href="${c.href}">${c.label}</a></li>`))}
  </ol></nav>`;
}

function pageHeader({ eyebrow, title, lead, crumbs, aside }) {
  return html`<header class="page-head">
    <div class="wrap page-head-inner">
      <div class="page-head-text">
        ${breadcrumbs(crumbs)}
        ${eyebrow ? html`<p class="eyebrow">${eyebrow}</p>` : ''}
        <h1 class="page-title">${title}</h1>
        ${lead ? html`<p class="lead">${lead}</p>` : ''}
      </div>
      ${aside || ''}
    </div>
    ${outlineLeaf('page-head-leaf')}
  </header>`;
}

function sectionHead({ eyebrow, title, lead, action, id }) {
  return html`<div class="section-head">
    <div>
      ${eyebrow ? html`<p class="eyebrow">${eyebrow}</p>` : ''}
      <h2 class="section-title"${id ? raw(` id="${id}"`) : ''}>${title}</h2>
      ${lead ? html`<p class="section-lead">${lead}</p>` : ''}
    </div>
    ${action || ''}
  </div>`;
}

const STATUS = {
  completed: { label: 'Completed', cls: 'pill-done', icon: 'check' },
  'in-progress': { label: 'In progress', cls: 'pill-progress', icon: 'clock' },
  upcoming: { label: 'Upcoming', cls: 'pill-upcoming', icon: 'calendar' },
  available: { label: 'Available', cls: 'pill-done', icon: 'check' },
  pending: { label: 'Pending', cls: 'pill-upcoming', icon: 'clock' },
};

function statusPill(status) {
  const s = STATUS[status] || STATUS.upcoming;
  return html`<span class="pill ${s.cls}">${icon(s.icon, { size: 14 })}${s.label}</span>`;
}

// Is the file or link usable?
const hasAsset = (item) => Boolean((item.file && item.file.url) || safeUrl(item.link));

// View / download / open-link buttons for a document or presentation.
function assetActions(ctx, item, { compact = false } = {}) {
  const parts = [];
  const file = item.file && item.file.url ? item.file : null;
  if (file) {
    const viewable = /^(application\/pdf|image\/|video\/|text\/plain)/.test(file.mime || '');
    const href = file.url;
    if (viewable) parts.push(html`<a class="btn btn-small btn-primary" href="${href}" target="_blank" rel="noopener">${icon('eye', { size: 16 })}View</a>`);
    else if (ctx.officeViewer && /(word|presentation|excel|opendocument|ms-powerpoint|msword|ms-excel)/.test(file.mime || '')) {
      parts.push(html`<a class="btn btn-small btn-primary" href="${ctx.officeViewer(href)}" target="_blank" rel="noopener">${icon('eye', { size: 16 })}View online</a>`);
    }
    parts.push(html`<a class="btn btn-small btn-ghost" href="${href}${href.startsWith('/files/') ? '?download=1' : ''}" download="${file.name}">${icon('download', { size: 16 })}Download${compact ? '' : html`<span class="btn-meta">${fileTypeLabel(file.name)} · ${formatBytes(file.size)}</span>`}</a>`);
  }
  const link = safeUrl(item.link);
  if (link) parts.push(html`<a class="btn btn-small ${file ? 'btn-ghost' : 'btn-primary'}" href="${link}" target="_blank" rel="noopener">${icon('external', { size: 16 })}Open link</a>`);
  if (!parts.length) return html`<span class="muted-note">${icon('clock', { size: 15 })}Not uploaded yet</span>`;
  return html`<div class="actions">${parts}</div>`;
}

function avatar(member, size = 'md') {
  const photo = member && member.photo && member.photo.url;
  return photo
    ? html`<img class="avatar avatar-${size}" src="${photo}" alt="" loading="lazy" width="96" height="96">`
    : html`<span class="avatar avatar-${size} avatar-initials" aria-hidden="true">${initials(member && member.name)}</span>`;
}

function memberLine(member) {
  if (!member) return '';
  return html`<span class="member-line">${avatar(member, 'sm')}<span><strong>${member.name}</strong>${member.studentId ? html`<span class="mono">${member.studentId}</span>` : ''}</span></span>`;
}

// Copyable email address shown as plain, selectable text.
function emailLine(email) {
  if (!email) return '';
  return html`<span class="copy-line"><a href="mailto:${email}">${email}</a><button type="button" class="icon-btn" data-copy="${email}" aria-label="Copy ${email}">${icon('copy', { size: 16 })}</button></span>`;
}

function metricRow(lines) {
  const items = (lines || []).map(pair).filter((p) => p.title);
  if (!items.length) return '';
  return html`<dl class="metrics">${items.map((m) => html`<div><dt>${m.title}</dt><dd>${m.text || '—'}</dd></div>`)}</dl>`;
}

function dateLabel(value, fallback = 'Date to be announced') {
  return value ? formatDate(value) : fallback;
}

// A milestone's date: the text version (e.g. "January 2026") wins over the date.
function msDate(m, opts) {
  return m.dateText || (m.date ? formatDate(m.date, opts) : '');
}

function emptyState(text, extra = '') {
  return html`<div class="empty">${icon('leaf', { size: 22 })}<p>${text}</p>${extra}</div>`;
}

module.exports = {
  breadcrumbs, pageHeader, sectionHead, statusPill, assetActions, hasAsset, avatar, memberLine, emailLine,
  metricRow, dateLabel, msDate, emptyState,
};
