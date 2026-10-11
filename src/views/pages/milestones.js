'use strict';
const { html } = require('../../lib/html');
const { formatDate } = require('../../lib/util');
const { renderMarkdown } = require('../../lib/markdown');
const { icon } = require('../icons');
const { pageHeader, statusPill, assetActions, emptyState } = require('../partials');
const { layout } = require('../layout');

function milestonesPage(ctx) {
  const ms = ctx.data.milestones;
  const header = pageHeader({
    eyebrow: 'Milestones',
    title: 'Assessments and milestones',
    lead: 'Every assessment in the research project with its date, marks and status. Choose one to see what it covered.',
    crumbs: [{ label: 'Home', href: '/' }, { label: 'Milestones' }],
  });
  if (!ms.length) return layout(ctx, { title: 'Milestones', active: 'milestones', content: html`${header}<div class="wrap section">${emptyState('No milestones yet.')}</div>` });

  const latestDone = [...ms].reverse().find((m) => m.status === 'completed');
  const initial = (latestDone || ms[0]).slug;
  const done = ms.filter((m) => m.status === 'completed').length;

  const panels = ms.map((m, i) => {
    const slides = ctx.data.presentations.filter((p) => p.milestone === m.id);
    return html`<article class="ms-panel" id="${m.slug}" data-ms-panel>
      <header class="ms-panel-head">
        <div>
          <p class="eyebrow">Milestone ${i + 1} of ${ms.length}</p>
          <h2 class="doc-title">${m.title}</h2>
        </div>
        ${statusPill(m.status)}
      </header>
      <dl class="ms-facts">
        <div><dt>${icon('calendar', { size: 16 })}Date</dt><dd>${m.date ? formatDate(m.date) : 'To be announced'}</dd></div>
        <div><dt>${icon('target', { size: 16 })}Marks allocated</dt><dd>${m.marks || 'To be confirmed'}</dd></div>
        <div><dt>${icon('flag', { size: 16 })}Status</dt><dd>${{ completed: 'Completed', 'in-progress': 'In progress' }[m.status] || 'Upcoming'}</dd></div>
      </dl>
      ${m.summary ? html`<p class="section-lead">${m.summary}</p>` : ''}
      ${m.details ? html`<div class="prose">${renderMarkdown(m.details)}</div>` : ''}
      ${(m.deliverables || []).length ? html`<div class="ms-block"><p class="mini-label">Deliverables</p><ul class="checks">${m.deliverables.map((d) => html`<li>${icon(m.status === 'completed' ? 'check' : 'clock', { size: 16 })}<span>${d}</span></li>`)}</ul></div>` : ''}
      ${slides.length ? html`<div class="ms-block"><p class="mini-label">Slides</p>${slides.map((p) => html`<div class="ms-slide"><span>${icon('slides', { size: 18 })}${p.title}</span>${assetActions(ctx, p, { compact: true })}</div>`)}</div>` : ''}
    </article>`;
  });

  const content = html`${header}
  <div class="wrap ms-layout" data-ms data-ms-initial="${initial}">
    <div class="ms-main">
      <div class="ms-picker">
        <label for="ms-select" class="mini-label">Choose an assessment</label>
        <div class="select-wrap">
          <select id="ms-select" data-ms-select>
            ${ms.map((m) => html`<option value="${m.slug}"${m.slug === initial ? ' selected' : ''}>${m.title}${m.date ? ` — ${formatDate(m.date, { short: true })}` : ''}</option>`)}
          </select>
          ${icon('chevronDown', { size: 18 })}
        </div>
      </div>
      <div class="ms-panels">${panels}</div>
    </div>
    <aside class="ms-timeline" aria-label="Timeline">
      <p class="mini-label">Timeline · ${done} of ${ms.length} completed</p>
      <ol>
        ${ms.map((m) => html`<li class="tl-${m.status || 'upcoming'}"><a href="#${m.slug}" data-ms-link="${m.slug}">
          <span class="tl-dot" aria-hidden="true">${m.status === 'completed' ? icon('check', { size: 13 }) : ''}</span>
          <span class="tl-text"><strong>${m.title}</strong><span>${m.date ? formatDate(m.date) : 'Date to be announced'}${m.marks ? ` · ${m.marks}` : ''}</span></span>
        </a></li>`)}
      </ol>
    </aside>
  </div>`;
  return layout(ctx, { title: 'Milestones', active: 'milestones', content, pageClass: 'page-milestones' });
}

module.exports = { milestonesPage };
