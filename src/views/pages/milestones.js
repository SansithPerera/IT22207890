'use strict';
const { html } = require('../../lib/html');
const { renderMarkdown } = require('../../lib/markdown');
const { icon } = require('../icons');
const { pageHeader, statusPill, assetActions, emptyState, msDate } = require('../partials');
const { layout } = require('../layout');

function milestonesPage(ctx) {
  const ms = ctx.data.milestones;
  const header = pageHeader({
    eyebrow: 'Milestones',
    title: 'Assessments and milestones',
    lead: 'Every assessment in the research project with its date, weight and status. Choose one to see what it covered.',
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
        <div><dt>${icon('calendar', { size: 16 })}Date</dt><dd>${msDate(m) || 'To be announced'}</dd></div>
        ${m.weight ? html`<div><dt>${icon('target', { size: 16 })}Weight</dt><dd>${m.weight} of the final mark</dd></div>` : ''}
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
            ${ms.map((m) => html`<option value="${m.slug}"${m.slug === initial ? ' selected' : ''}>${m.title}${msDate(m, { short: true }) ? ` — ${msDate(m, { short: true })}` : ''}</option>`)}
          </select>
          ${icon('chevronDown', { size: 18 })}
        </div>
      </div>
      <div class="ms-panels">${panels}</div>
      <div class="ms-grade"><span class="mini-label">${icon('target', { size: 16 })}Overall grade</span><strong>${ctx.site.overallGrade || 'To be announced'}</strong></div>
    </div>
    <aside class="ms-timeline" aria-label="Timeline">
      <p class="mini-label">Timeline · ${done} of ${ms.length} completed</p>
      <ol>
        ${ms.map((m) => html`<li class="tl-${m.status || 'upcoming'}"><a href="#${m.slug}" data-ms-link="${m.slug}">
          <span class="tl-dot" aria-hidden="true">${m.status === 'completed' ? icon('check', { size: 13 }) : ''}</span>
          <span class="tl-text"><strong>${m.title}</strong><span>${msDate(m) || 'Date to be announced'}${m.weight ? ` · ${m.weight}` : ''}</span></span>
        </a></li>`)}
      </ol>
    </aside>
  </div>`;
  return layout(ctx, { title: 'Milestones', active: 'milestones', content, pageClass: 'page-milestones' });
}

module.exports = { milestonesPage };
