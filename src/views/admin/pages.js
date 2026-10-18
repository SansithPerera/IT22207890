'use strict';
// Admin panel pages.
const { html, raw } = require('../../lib/html');
const { formatDate, formatDateTime, formatBytes, fileTypeLabel, truncate } = require('../../lib/util');
const { icon } = require('../icons');
const { collections, settingsGroups } = require('../../schema');
const { renderField } = require('../../admin/fields');
const { hasAsset } = require('../partials');
const { adminLayout } = require('./layout');

const csrfInput = (ctx) => html`<input type="hidden" name="_csrf" value="${ctx.csrf}">`;

function confirmForm(ctx, action, label, message, { className = 'btn btn-small btn-danger', iconName = 'trash', hidden = {} } = {}) {
  return html`<form method="post" action="${action}" class="inline-form" data-confirm="${message}">
    ${csrfInput(ctx)}${Object.entries(hidden).map(([k, v]) => html`<input type="hidden" name="${k}" value="${v}">`)}
    <button type="submit" class="${className}">${icon(iconName, { size: 16 })}${label}</button>
  </form>`;
}

// ---------------------------------------------------------------- dashboard
function checklist(ctx) {
  const { site, data } = ctx;
  const todo = [];
  const missingDates = data.milestones.filter((m) => !m.date && !m.dateText);
  if (missingDates.length) todo.push({ text: `Add the date for ${missingDates.length} milestone${missingDates.length > 1 ? 's' : ''} (${missingDates.map((m) => m.title).join(', ')}).`, href: '/admin/milestones' });
  const pendingDocs = data.documents.filter((d) => !hasAsset(d));
  if (pendingDocs.length) todo.push({ text: `${pendingDocs.length} document${pendingDocs.length > 1 ? 's are' : ' is'} still waiting for a file or link.`, href: '/admin/documents' });
  const pastNoSlides = data.presentations.filter((p) => !hasAsset(p) && (data.milestones.find((m) => m.id === p.milestone) || {}).status === 'completed');
  if (pastNoSlides.length) todo.push({ text: `Upload the slides for ${pastNoSlides.map((p) => p.title).join(', ')}.`, href: '/admin/presentations' });
  if (!data.members.some((m) => m.type !== 'Team member')) todo.push({ text: 'Add your supervisor and co-supervisor so they appear on About Us.', href: '/admin/members/new?type=Supervisor' });
  const untouched = data.domain.filter((d) => d.createdAt === d.updatedAt && String(d.id).startsWith('seed-'));
  if (untouched.length) todo.push({ text: `Review the starter text in ${untouched.length} Domain section${untouched.length > 1 ? 's' : ''} against your proposal (especially the literature survey and references).`, href: '/admin/domain' });
  if (!site.contactEmail) todo.push({ text: 'Add a group email address for the Contact Us page.', href: '/admin/settings#group-contact' });
  if (!site.publicSiteUrl) todo.push({ text: 'Add the live site address so the course-web export can link files that do not fit in 20 MB.', href: '/admin/settings#group-links-and-footer' });
  return todo;
}

function dashboardPage(ctx, { info, warnings, recent, fileCount }) {
  const { data } = ctx;
  const docsReady = data.documents.filter(hasAsset).length;
  const presReady = data.presentations.filter(hasAsset).length;
  const unread = data.messages.filter((m) => !m.read).length;
  const todo = checklist(ctx);
  const cards = [
    { label: 'Documents', value: `${docsReady} / ${data.documents.length}`, note: 'available', href: '/admin/documents', ic: 'file' },
    { label: 'Presentations', value: `${presReady} / ${data.presentations.length}`, note: 'with slides', href: '/admin/presentations', ic: 'slides' },
    { label: 'Gallery', value: data.gallery.length, note: 'photos', href: '/admin/gallery', ic: 'image' },
    { label: 'Messages', value: unread, note: 'unread', href: '/admin/messages', ic: 'inbox' },
  ];
  const content = html`
    ${warnings.map((w) => html`<p class="notice ${w.level === 'error' ? 'notice-error' : 'notice-warn'}">${icon('alert', { size: 18 })}<span>${raw(w.html)}</span></p>`)}
    <section class="dash-cards">${cards.map((c) => html`<a class="dash-card" href="${c.href}"><span class="dash-icon">${icon(c.ic, { size: 20 })}</span><span class="dash-value">${c.value}</span><span class="dash-label">${c.label} <span>${c.note}</span></span></a>`)}</section>
    <div class="dash-grid">
      <section class="panel">
        <h2 class="panel-title">To do</h2>
        ${todo.length ? html`<ul class="todo">${todo.map((t) => html`<li><a href="${t.href}">${icon('flag', { size: 16 })}<span>${t.text}</span>${icon('chevronRight', { size: 16 })}</a></li>`)}</ul>` : html`<p class="muted">Everything on the checklist is done.</p>`}
      </section>
      <section class="panel">
        <h2 class="panel-title">Quick actions</h2>
        <ul class="quick">
          <li><a class="btn btn-ghost" href="/admin/documents">${icon('upload', { size: 17 })}Upload a document</a></li>
          <li><a class="btn btn-ghost" href="/admin/presentations">${icon('slides', { size: 17 })}Add presentation slides</a></li>
          <li><a class="btn btn-ghost" href="/admin/gallery/new">${icon('image', { size: 17 })}Add a gallery photo</a></li>
          <li><a class="btn btn-ghost" href="/admin/media">${icon('folder', { size: 17 })}Media library (${fileCount} files)</a></li>
          <li><a class="btn btn-ghost" href="/admin/milestones">${icon('flag', { size: 17 })}Update milestones</a></li>
          <li><a class="btn btn-ghost" href="/admin/export">${icon('download', { size: 17 })}Course-web ZIP</a></li>
        </ul>
      </section>
      <section class="panel">
        <h2 class="panel-title">Latest messages</h2>
        ${recent.length ? html`<ul class="msg-mini">${recent.map((m) => html`<li class="${m.read ? '' : 'unread'}"><a href="/admin/messages/${m.id}"><strong>${m.name}</strong><span>${m.subject}</span><time>${formatDateTime(m.createdAt)}</time></a></li>`)}</ul>` : html`<p class="muted">No messages yet. Messages sent from the Contact Us page appear here.</p>`}
      </section>
      <section class="panel">
        <h2 class="panel-title">Storage</h2>
        <dl class="kv">
          <div><dt>Content and uploads</dt><dd>${info.label}</dd></div>
          <div><dt>Location</dt><dd class="mono">${info.location}</dd></div>
          <div><dt>Image optimisation</dt><dd>${info.sharp ? 'On (large photos are resized and saved as WebP)' : 'Off (install the "sharp" package to shrink photos)'}</dd></div>
          <div><dt>Upload limit</dt><dd>${info.maxUploadMb} MB per file${info.vercel ? ' (Vercel’s limit). Photos are shrunk before upload; for bigger documents paste a OneDrive or Google Drive link instead.' : ''}</dd></div>
        </dl>
      </section>
    </div>
    <div class="danger-zone">
      <div><h2>Load the latest starter content</h2><p>Replaces all pages, milestones, documents and settings with the starter content that ships with this version of the site. Your edits are lost; uploaded files stay in the media library.</p></div>
      ${confirmForm(ctx, '/admin/reset', 'Reset content', 'Replace ALL content with the starter content? Your edits will be lost. This cannot be undone.', { iconName: 'alert' })}
    </div>`;
  return adminLayout(ctx, { title: 'Dashboard', active: 'dashboard', content, unread });
}

// ---------------------------------------------------------------- lists
function cellValue(ctx, item, col) {
  const v = item[col.field];
  switch (col.format) {
    case 'date': return v ? formatDate(v, { short: true }) : html`<span class="muted">—</span>`;
    case 'mono': return v ? html`<span class="mono">${v}</span>` : html`<span class="muted">—</span>`;
    case 'status': return html`<span class="tag tag-${v || 'upcoming'}">${{ completed: 'Completed', 'in-progress': 'In progress' }[v] || 'Upcoming'}</span>`;
    case 'file': return v && v.url ? html`<span class="tag tag-completed">${fileTypeLabel(v.name)} · ${formatBytes(v.size)}</span>` : (item.link ? html`<span class="tag tag-completed">Link</span>` : html`<span class="tag tag-upcoming">Pending</span>`);
    case 'thumb': return v && v.url ? html`<img class="list-thumb" src="${v.url}" alt="">` : '';
    default:
      if (col.format && col.format.startsWith('ref:')) {
        const coll = col.format.slice(4);
        const ref = (ctx.data[coll] || []).find((x) => x.id === v);
        return ref ? (ref.name || ref.title) : html`<span class="muted">—</span>`;
      }
      return v ? truncate(v, 60) : html`<span class="muted">—</span>`;
  }
}

function listPage(ctx, coll) {
  const def = collections[coll];
  const items = ctx.data[coll] || [];
  const actions = html`<a class="btn btn-primary" href="/admin/${coll}/new">${icon('plus', { size: 17 })}Add ${def.singular}</a>`;
  const content = html`
    <p class="page-intro">${def.intro}</p>
    ${items.length ? html`<div class="table-wrap"><table class="admin-table">
      <thead><tr><th scope="col">${def.titleField === 'name' ? 'Name' : def.titleField === 'caption' ? 'Caption' : 'Title'}</th>${def.listColumns.map((c) => html`<th scope="col">${c.label}</th>`)}<th scope="col" class="col-actions"><span class="visually-hidden">Actions</span></th></tr></thead>
      <tbody>${items.map((item, i) => html`<tr>
        <th scope="row"><a href="/admin/${coll}/${item.id}">${item[def.titleField] || html`<span class="muted">Untitled</span>`}</a></th>
        ${def.listColumns.map((c) => html`<td>${cellValue(ctx, item, c)}</td>`)}
        <td class="col-actions"><div class="row-actions">
          <form method="post" action="/admin/${coll}/${item.id}/move" class="inline-form">${csrfInput(ctx)}<input type="hidden" name="dir" value="up"><button class="icon-btn" type="submit" aria-label="Move up"${i === 0 ? raw(' disabled') : ''}>${icon('up', { size: 17 })}</button></form>
          <form method="post" action="/admin/${coll}/${item.id}/move" class="inline-form">${csrfInput(ctx)}<input type="hidden" name="dir" value="down"><button class="icon-btn" type="submit" aria-label="Move down"${i === items.length - 1 ? raw(' disabled') : ''}>${icon('down', { size: 17 })}</button></form>
          <a class="icon-btn" href="/admin/${coll}/${item.id}" aria-label="Edit">${icon('edit', { size: 17 })}</a>
          <a class="icon-btn" href="${def.publicPath(item)}" target="_blank" rel="noopener" aria-label="View on site">${icon('external', { size: 17 })}</a>
        </div></td>
      </tr>`)}</tbody>
    </table></div>` : html`<div class="empty-admin"><p>Nothing here yet.</p>${actions}</div>`}`;
  return adminLayout(ctx, { title: def.label, active: coll, content, actions, unread: ctx.unread });
}

// ---------------------------------------------------------------- forms
function formPage(ctx, coll, { item, values, errors = {}, isNew }) {
  const def = collections[coll];
  const hasFiles = def.fields.some((f) => ['image', 'file', 'images'].includes(f.type));
  const action = isNew ? `/admin/${coll}/new` : `/admin/${coll}/${item.id}`;
  const errorCount = Object.keys(errors).length;
  const title = isNew ? `Add ${def.singular}` : (item[def.titleField] || `Edit ${def.singular}`);
  const actions = !isNew ? html`<a class="btn btn-ghost" href="${def.publicPath(item)}" target="_blank" rel="noopener">${icon('external', { size: 17 })}View on site</a>` : '';
  const content = html`
    <a class="text-link back-link" href="/admin/${coll}">${icon('arrowLeft', { size: 16 })}${def.label}</a>
    ${errorCount ? html`<p class="notice notice-error" role="alert">${icon('alert', { size: 18 })}<span>Please fix ${errorCount === 1 ? 'the highlighted field' : `the ${errorCount} highlighted fields`}. Files have to be chosen again after an error.</span></p>` : ''}
    <form method="post" action="${action}" class="admin-form" ${hasFiles ? raw('enctype="multipart/form-data"') : ''} data-dirty-guard>
      ${csrfInput(ctx)}
      <div class="form-grid">${def.fields.map((f) => renderField(f, values[f.name], { error: errors[f.name], options: ctx.data }))}</div>
      <div class="form-actions">
        <button class="btn btn-primary" type="submit">${icon('check', { size: 17 })}${isNew ? `Add ${def.singular}` : 'Save changes'}</button>
        <a class="btn btn-ghost" href="/admin/${coll}">Cancel</a>
      </div>
    </form>
    ${!isNew ? html`<div class="danger-zone">
      <div><h2>Delete this ${def.singular}</h2><p>It disappears from the website. Uploaded files that nothing else uses are deleted too.</p></div>
      ${confirmForm(ctx, `/admin/${coll}/${item.id}/delete`, 'Delete', `Delete “${item[def.titleField] || def.singular}”? This cannot be undone.`)}
    </div>` : ''}`;
  return adminLayout(ctx, { title, active: coll, content, actions, unread: ctx.unread });
}

function settingsPage(ctx, { values, errors = {} }) {
  const errorCount = Object.keys(errors).length;
  const slug = (t) => `group-${t.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const content = html`
    <p class="page-intro">Project details used across the site: titles, the home page story, collaboration, About Us and contact details.</p>
    <nav class="jump jump-admin" aria-label="Settings sections">${settingsGroups.map((g) => html`<a href="#${slug(g.title)}">${g.title}</a>`)}</nav>
    ${errorCount ? html`<p class="notice notice-error" role="alert">${icon('alert', { size: 18 })}<span>Please fix the highlighted fields.</span></p>` : ''}
    <form method="post" action="/admin/settings" class="admin-form" enctype="multipart/form-data" data-dirty-guard>
      ${csrfInput(ctx)}
      ${settingsGroups.map((g) => html`<fieldset class="settings-group" id="${slug(g.title)}"><legend>${g.title}</legend>
        <div class="form-grid">${g.fields.map((f) => renderField(f, values[f.name], { error: errors[f.name], options: ctx.data }))}</div>
      </fieldset>`)}
      <div class="form-actions form-actions-sticky"><button class="btn btn-primary" type="submit">${icon('check', { size: 17 })}Save settings</button></div>
    </form>`;
  return adminLayout(ctx, { title: 'Site settings', active: 'settings', content, unread: ctx.unread });
}

// ---------------------------------------------------------------- media library
function mediaPage(ctx, { files, usage, error }) {
  const content = html`
    <p class="page-intro">Every uploaded file in one place. Upload files here to link them from any text (copy the link and use it in Markdown, for example <span class="mono">[Report](/files/…)</span> or <span class="mono">![Photo](/files/…)</span>).</p>
    ${error ? html`<p class="notice notice-error" role="alert">${icon('alert', { size: 18 })}<span>${error}</span></p>` : ''}
    <form method="post" action="/admin/media" enctype="multipart/form-data" class="panel upload-panel">
      ${csrfInput(ctx)}
      <div class="dropzone dropzone-large" data-dropzone>
        <input type="file" id="media-files" name="files" multiple required>
        <span class="dropzone-text">${icon('upload', { size: 22 })}<span>Choose files or drop them here · images, PDF, Word, PowerPoint, Excel, ZIP, MP4</span></span>
      </div>
      <button class="btn btn-primary" type="submit">${icon('upload', { size: 17 })}Upload</button>
    </form>
    ${files.length ? html`<ul class="media-grid">${files.map((f) => {
    const url = `/files/${f.id}/${encodeURIComponent(f.name)}`;
    const used = usage.get(f.id) || [];
    return html`<li class="media-item">
        <a class="media-preview" href="${url}" target="_blank" rel="noopener">${f.kind === 'image' ? html`<img src="${url}" alt="" loading="lazy">` : html`<span>${icon('file', { size: 30 })}<small>${fileTypeLabel(f.name)}</small></span>`}</a>
        <div class="media-body">
          <p class="media-name" title="${f.name}">${f.name}</p>
          <p class="media-meta">${formatBytes(f.size)} · ${formatDate(String(f.createdAt).slice(0, 10), { short: true })}</p>
          <p class="media-usage">${used.length ? html`Used in ${used.slice(0, 2).map((u, i) => html`${i ? ', ' : ''}<a href="${u.href}">${u.label}</a>`)}${used.length > 2 ? ` and ${used.length - 2} more` : ''}` : html`<span class="muted">Not used on any page</span>`}</p>
          <div class="media-actions">
            <button type="button" class="btn btn-tiny btn-ghost" data-copy="${url}">${icon('copy', { size: 14 })}Copy link</button>
            ${confirmForm(ctx, `/admin/media/${f.id}/delete`, 'Delete', used.length ? `“${f.name}” is still used on the site. Delete it anyway? Those pages will show a broken link.` : `Delete “${f.name}”?`, { className: 'btn btn-tiny btn-danger' })}
          </div>
        </div>
      </li>`;
  })}</ul>` : html`<div class="empty-admin"><p>No uploads yet.</p></div>`}`;
  return adminLayout(ctx, { title: 'Media library', active: 'media', content, unread: ctx.unread });
}

// ---------------------------------------------------------------- messages
function messagesPage(ctx) {
  const msgs = ctx.data.messages;
  const content = html`
    <p class="page-intro">Messages sent from the Contact Us page.</p>
    ${msgs.length ? html`<div class="table-wrap"><table class="admin-table">
      <thead><tr><th scope="col">From</th><th scope="col">To</th><th scope="col">Topic</th><th scope="col">Message</th><th scope="col">Received</th></tr></thead>
      <tbody>${msgs.map((m) => html`<tr class="${m.read ? '' : 'row-unread'}">
        <th scope="row"><a href="/admin/messages/${m.id}">${m.name}</a>${m.read ? '' : html` <span class="tag tag-in-progress">New</span>`}${m.email ? html`<br><span class="muted">${m.email}</span>` : ''}</th>
        <td>${m.memberName || html`<span class="muted">Whole team</span>`}</td><td>${m.subject}</td><td>${truncate(m.message, 90)}</td><td class="nowrap">${formatDateTime(m.createdAt)}</td>
      </tr>`)}</tbody></table></div>` : html`<div class="empty-admin"><p>No messages yet.</p></div>`}`;
  return adminLayout(ctx, { title: 'Messages', active: 'messages', content, unread: ctx.unread });
}

function messagePage(ctx, m) {
  // Old messages have the sender's email; new ones go to a chosen member.
  const target = m.toEmail || m.email || '';
  const reply = `mailto:${target}?subject=${encodeURIComponent(`${m.toEmail ? 'Website message' : 'Re'}: ${m.subject}`)}&body=${encodeURIComponent(`From: ${m.name}\n\n${m.message}`)}`;
  const content = html`
    <a class="text-link back-link" href="/admin/messages">${icon('arrowLeft', { size: 16 })}Messages</a>
    <article class="panel message">
      <header><h2>${m.subject}</h2><p><strong>${m.name}</strong>${m.email ? html` · <a href="mailto:${m.email}">${m.email}</a>` : ''}${m.memberName ? html` · to <strong>${m.memberName}</strong>${m.toEmail ? html` (<a href="mailto:${m.toEmail}">${m.toEmail}</a>)` : html` <span class="muted">(no email saved for this member)</span>`}` : ''} · ${formatDateTime(m.createdAt)}</p></header>
      <div class="message-body">${m.message}</div>
      <div class="form-actions">
        <a class="btn btn-primary" href="${reply}">${icon('mail', { size: 17 })}${m.toEmail ? 'Forward to member' : 'Reply by email'}</a>
        <form method="post" action="/admin/messages/${m.id}/read" class="inline-form">${csrfInput(ctx)}<button class="btn btn-ghost" type="submit">${m.read ? 'Mark as unread' : 'Mark as read'}</button></form>
        ${confirmForm(ctx, `/admin/messages/${m.id}/delete`, 'Delete', 'Delete this message?', { className: 'btn btn-danger' })}
      </div>
    </article>`;
  return adminLayout(ctx, { title: 'Message', active: 'messages', content, unread: ctx.unread });
}

// ---------------------------------------------------------------- export
function exportPage(ctx, { budgetMb, courseLimitMb = budgetMb, vercel = false, liveUrl }) {
  const content = html`
    <p class="page-intro">The course web accepts plain HTML and CSS sites up to ${courseLimitMb} MB. This builds that version of the website from the current content: every page, image and style, plus as many documents and slides as fit in ${budgetMb} MB.</p>
    ${vercel && budgetMb < courseLimitMb ? html`<p class="notice notice-warn">${icon('alert', { size: 18 })}<span>Vercel limits downloads to 4.5 MB, so this ZIP is kept under ${budgetMb} MB and larger files link to the live site. For a full ${courseLimitMb} MB version, run <span class="mono">npm run export</span> on your computer with the same <span class="mono">DATABASE_URL</span> (see README, section 4).</span></p>` : ''}
    <div class="panel export-panel">
      <ol class="steps steps-compact">
        <li><h3>Download the ZIP</h3><p>It is generated from what is on the site right now.</p></li>
        <li><h3>Unzip and check</h3><p>Open <span class="mono">index.html</span>, or read <span class="mono">EXPORT-REPORT.txt</span> to see which files were left out to stay under ${budgetMb} MB.</p></li>
        <li><h3>Upload the files</h3><p>Upload the unzipped contents to the course web.</p></li>
      </ol>
      ${liveUrl ? html`<p class="notice notice-ok">${icon('check', { size: 18 })}<span>Files that do not fit, and the contact form, will point to <span class="mono">${liveUrl}</span>.</span></p>` : html`<p class="notice notice-warn">${icon('alert', { size: 18 })}<span>Add the live site address in <a href="/admin/settings#group-links-and-footer">Site settings</a> so files that do not fit, and the contact form, can point to the live site.</span></p>`}
      <a class="btn btn-primary" href="/admin/export.zip">${icon('download', { size: 18 })}Download course-web ZIP</a>
    </div>`;
  return adminLayout(ctx, { title: 'Course-web export', active: 'export', content, unread: ctx.unread });
}

module.exports = { dashboardPage, listPage, formPage, settingsPage, mediaPage, messagesPage, messagePage, exportPage };
