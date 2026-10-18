'use strict';
const { html } = require('../../lib/html');
const { formatDate, slugify, youtubeId } = require('../../lib/util');
const { icon } = require('../icons');
const { outlineLeaf } = require('../illustrations');
const { pageHeader, statusPill, assetActions, hasAsset, emptyState } = require('../partials');
const { DOCUMENT_CATEGORIES } = require('../../schema');
const { layout } = require('../layout');

function documentsPage(ctx) {
  const docs = ctx.data.documents;
  const available = docs.filter(hasAsset).length;
  const header = pageHeader({
    eyebrow: 'Documents',
    title: 'Project documents',
    lead: 'Reports and forms produced during the project. Pending documents are listed too and are linked here as soon as they are submitted.',
    crumbs: [{ label: 'Home', href: '/' }, { label: 'Documents' }],
  });
  const categories = [...DOCUMENT_CATEGORIES, ...new Set(docs.map((d) => d.category).filter((c) => !DOCUMENT_CATEGORIES.includes(c)))];
  const groups = categories.map((cat) => ({ cat, items: docs.filter((d) => (d.category || 'Other') === cat) })).filter((g) => g.items.length);

  const content = html`${header}
  <div class="wrap section-tight">
    ${docs.length ? html`
    <div class="doc-summary">
      <p><strong>${available}</strong> available <span aria-hidden="true">·</span> <strong>${docs.length - available}</strong> pending</p>
      <nav class="jump" aria-label="Document categories">${groups.map((g) => html`<a href="#${slugify(g.cat)}">${g.cat}<span>${g.items.length}</span></a>`)}</nav>
    </div>
    ${groups.map((g) => html`<section class="doc-group" id="${slugify(g.cat)}">
      <h2 class="group-title">${g.cat}</h2>
      <ul class="doc-list">
        ${g.items.map((d) => {
    const ready = hasAsset(d);
    return html`<li class="doc-row${ready ? '' : ' is-pending'}">
            <span class="doc-icon" aria-hidden="true">${icon('file', { size: 22 })}</span>
            <div class="doc-main">
              <h3>${d.title}${d.version ? html` <span class="tag tag-${d.version === 'Completed' ? 'completed' : 'in-progress'}">${d.version}</span>` : ''}</h3>
              ${d.description ? html`<p>${d.description}</p>` : ''}
              <p class="doc-meta">${[d.author, d.date ? formatDate(d.date) : ''].filter(Boolean).join(' · ')}</p>
            </div>
            <div class="doc-side">${statusPill(ready ? 'available' : 'pending')}${ready ? assetActions(ctx, d) : ''}</div>
          </li>`;
  })}
      </ul>
    </section>`)}` : emptyState('No documents yet.')}
  </div>`;
  return layout(ctx, { title: 'Documents', active: 'documents', content, pageClass: 'page-documents' });
}

function presentationsPage(ctx) {
  const items = ctx.data.presentations;
  const header = pageHeader({
    eyebrow: 'Presentations',
    title: 'Presentation slides',
    lead: 'Slides from each assessment, from the proposal to the final presentation. Upcoming presentations appear here once they are delivered.',
    crumbs: [{ label: 'Home', href: '/' }, { label: 'Presentations' }],
  });
  const content = html`${header}
  <div class="wrap section-tight">
    ${items.length ? html`<ul class="pres-grid">
      ${items.map((p) => {
    const ready = hasAsset(p);
    const ms = ctx.data.milestones.find((m) => m.id === p.milestone);
    const thumb = p.thumbnail && p.thumbnail.url;
    const video = youtubeId(p.video) ? p.video : '';
    return html`<li class="pres-card${ready ? '' : ' is-pending'}">
          <div class="pres-thumb">${thumb ? html`<img src="${thumb}" alt="" loading="lazy" width="800" height="450">` : html`<div class="pres-placeholder">${outlineLeaf('pres-leaf')}<span>${p.title}</span></div>`}</div>
          <div class="pres-body">
            <p class="eyebrow">${[ms && ms.title !== p.title ? ms.title : '', p.date ? formatDate(p.date) : ''].filter(Boolean).join(' · ') || 'Presentation'}</p>
            <h2 class="pres-title">${p.title}</h2>
            ${p.description ? html`<p>${p.description}</p>` : ''}
            <div class="pres-foot">
              ${statusPill(ready ? 'available' : (ms && ms.status === 'completed' ? 'pending' : 'upcoming'))}
              ${ready ? assetActions(ctx, p, { compact: true }) : ''}
              ${video ? html`<a class="btn btn-small btn-ghost" href="${video}" target="_blank" rel="noopener">${icon('play', { size: 16 })}Recording</a>` : ''}
            </div>
          </div>
        </li>`;
  })}
    </ul>` : emptyState('No presentations yet.')}
  </div>`;
  return layout(ctx, { title: 'Presentations', active: 'presentations', content, pageClass: 'page-presentations' });
}

module.exports = { documentsPage, presentationsPage };
