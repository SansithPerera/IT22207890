'use strict';
const { html } = require('../../lib/html');
const { pair } = require('../../lib/util');
const { renderMarkdown } = require('../../lib/markdown');
const { icon } = require('../icons');
const { componentArt } = require('../illustrations');
const { pageHeader, memberLine, emptyState } = require('../partials');
const { layout } = require('../layout');

function items(section) {
  const list = (section.items || []).map(pair).filter((p) => p.title);
  if (!list.length) return '';
  switch (section.itemsStyle) {
    case 'steps':
      return html`<ol class="steps">${list.map((p) => html`<li><h3>${p.title}</h3>${p.text ? html`<p>${p.text}</p>` : ''}</li>`)}</ol>`;
    case 'chips':
      return html`<ul class="tech-grid">${list.map((p) => html`<li><strong>${p.title}</strong>${p.text ? html`<span>${p.text}</span>` : ''}</li>`)}</ul>`;
    case 'list':
      return html`<ul class="bullets">${list.map((p) => html`<li>${p.text ? html`<strong>${p.title}.</strong> ${p.text}` : p.title}</li>`)}</ul>`;
    default:
      return html`<ul class="point-grid">${list.map((p) => html`<li>${p.text ? html`<h3>${p.title}</h3><p>${p.text}</p>` : html`<p>${p.title}</p>`}</li>`)}</ul>`;
  }
}

function componentLinks(ctx) {
  const comps = ctx.data.components;
  if (!comps.length) return '';
  return html`<div class="method-comps">
    <p class="mini-label">Component methodologies</p>
    <ul class="mini-comp-grid">${comps.map((c) => html`<li class="accent-${c.accent || 'leaf'}">
      <a href="/research/${c.slug}">
        <span class="mini-art">${componentArt(c.illustration)}</span>
        <span class="mini-comp-text"><strong>${c.shortTitle || c.title}</strong><span>${(c.models || []).slice(0, 3).join(' · ')}</span></span>
        ${icon('arrowRight', { size: 18 })}
      </a></li>`)}</ul>
  </div>`;
}

function domainPage(ctx) {
  const sections = ctx.data.domain;
  const header = pageHeader({
    eyebrow: 'Domain',
    title: 'Research domain',
    lead: 'The literature behind the project, the gap it fills, the problem and objectives, and how the system is built.',
    crumbs: [{ label: 'Home', href: '/' }, { label: 'Domain' }],
  });
  const body = sections.length ? html`<div class="wrap doc-layout">
    <aside class="toc" aria-label="On this page">
      <p class="mini-label">On this page</p>
      <ol>${sections.map((s) => html`<li><a href="#${s.slug}" data-toc-link>${s.title}</a></li>`)}</ol>
      ${ctx.data.components.length ? html`<p class="mini-label">Components</p>
      <ul>${ctx.data.components.map((c) => html`<li><a href="/research/${c.slug}"><span class="dot dot-${c.accent || 'leaf'}" aria-hidden="true"></span>${c.shortTitle || c.title}</a></li>`)}</ul>` : ''}
    </aside>
    <div class="doc-body">
      ${sections.map((s, i) => html`<section class="doc-section" id="${s.slug}" data-toc-section>
        <p class="eyebrow">Section ${String(i + 1).padStart(2, '0')}</p>
        <h2 class="doc-title">${s.title}</h2>
        ${s.summary ? html`<p class="section-lead">${s.summary}</p>` : ''}
        ${s.body ? html`<div class="prose">${renderMarkdown(s.body)}</div>` : ''}
        ${items(s)}
        ${s.image && s.image.url ? html`<figure class="figure"><div class="figure-scroll"><img src="${s.image.url}" alt="${s.imageCaption || s.title}" loading="lazy" data-lightbox data-caption="${s.imageCaption || ''}"></div>${s.imageCaption ? html`<figcaption>${s.imageCaption} <span class="figure-hint">Select the image to enlarge it.</span></figcaption>` : ''}</figure>` : ''}
        ${s.slug === 'methodology' ? componentLinks(ctx) : ''}
      </section>`)}
    </div>
  </div>` : html`<div class="wrap section">${emptyState('Domain sections have not been added yet.')}</div>`;
  return layout(ctx, { title: 'Domain', active: 'domain', content: html`${header}${body}`, pageClass: 'page-domain' });
}

// ---------------------------------------------------------------- component page
function componentPage(ctx, comp) {
  const comps = ctx.data.components;
  const index = comps.findIndex((c) => c.id === comp.id);
  const prev = comps[index - 1];
  const next = comps[index + 1];
  const member = ctx.memberById(comp.member);
  const steps = (comp.workflow || []).map(pair).filter((p) => p.title);
  const metrics = (comp.metrics || []).map(pair).filter((p) => p.title);
  const shots = (comp.screenshots || []).filter((s) => s && s.url);

  const aside = html`<div class="comp-hero-art framed accent-${comp.accent || 'leaf'}">${componentArt(comp.illustration)}</div>`;
  const header = pageHeader({
    eyebrow: `Research component ${String(index + 1).padStart(2, '0')} of ${comps.length}`,
    title: comp.title,
    lead: comp.tagline,
    crumbs: [{ label: 'Home', href: '/' }, { label: 'Domain', href: '/domain' }, { label: comp.shortTitle || comp.title }],
    aside,
  });

  const content = html`${header}
  <div class="wrap comp-page accent-${comp.accent || 'leaf'}">
    <div class="comp-meta">
      ${member ? html`<div class="owner">${memberLine(member)}<span class="owner-role">Component owner${member.email ? html` · <a href="mailto:${member.email}">${member.email}</a>` : ''}</span></div>` : ''}
      ${(comp.models || []).length ? html`<ul class="chips chips-strong" aria-label="Models and tools">${comp.models.map((m) => html`<li>${m}</li>`)}</ul>` : ''}
    </div>

    <section class="comp-section" aria-labelledby="overview">
      <h2 class="doc-title" id="overview">Overview</h2>
      <div class="overview-grid">
        <ul class="bullets">${(comp.overview || []).map((o) => html`<li>${o}</li>`)}</ul>
        ${comp.novelty ? html`<aside class="novelty"><p class="mini-label">Novelty of the component</p><p>${comp.novelty}</p></aside>` : ''}
      </div>
    </section>

    ${steps.length ? html`<section class="comp-section" aria-labelledby="workflow">
      <h2 class="doc-title" id="workflow">Workflow</h2>
      <ol class="workflow">${steps.map((s, i) => html`<li><span class="wf-num">${i + 1}</span><h3>${s.title}</h3>${s.text ? html`<p>${s.text}</p>` : ''}</li>`)}</ol>
      ${comp.workflowNote ? html`<p class="note">${icon('info', { size: 18 })}<span>${comp.workflowNote}</span></p>` : ''}
      ${comp.workflowImage && comp.workflowImage.url ? html`<figure class="figure"><div class="figure-scroll"><img src="${comp.workflowImage.url}" alt="${comp.shortTitle || comp.title} workflow diagram" loading="lazy" data-lightbox data-caption="${comp.title} workflow"></div><figcaption>Workflow diagram from the PP2 presentation. <span class="figure-hint">Select the image to enlarge it.</span></figcaption></figure>` : ''}
    </section>` : ''}

    ${(comp.pp1Feedback || []).length || (comp.pp2Improvements || []).length ? html`<section class="comp-section" aria-labelledby="progress">
      <h2 class="doc-title" id="progress">Progress since PP1</h2>
      <div class="progress-grid">
        <div class="progress-col"><p class="mini-label">PP1 feedback</p><ul class="bullets bullets-muted">${(comp.pp1Feedback || []).map((f) => html`<li>${f}</li>`)}</ul></div>
        <div class="progress-arrow" aria-hidden="true">${icon('arrowRight', { size: 28 })}</div>
        <div class="progress-col progress-done"><p class="mini-label">PP2 improvements</p><ul class="checks">${(comp.pp2Improvements || []).map((f) => html`<li>${icon('check', { size: 16 })}<span>${f}</span></li>`)}</ul></div>
      </div>
      ${comp.progressNote ? html`<p class="progress-note">${comp.progressNote}</p>` : ''}
    </section>` : ''}

    ${comp.results || metrics.length || shots.length ? html`<section class="comp-section" aria-labelledby="results">
      <h2 class="doc-title" id="results">Results and discussion</h2>
      ${metrics.length ? html`<dl class="metrics">${metrics.map((m) => html`<div><dt>${m.title}</dt><dd>${m.text || '—'}</dd></div>`)}</dl>` : ''}
      ${comp.results ? html`<div class="prose">${renderMarkdown(comp.results)}</div>` : ''}
      ${shots.length ? html`<div class="shots-wrap"><p class="mini-label">Screens from the mobile app</p>
        <ul class="shots" data-lightbox-group>${shots.map((s) => html`<li><figure><img src="${s.url}" alt="${s.caption || 'App screenshot'}" loading="lazy" data-lightbox data-caption="${s.caption || ''}"><figcaption>${s.caption || ''}</figcaption></figure></li>`)}</ul></div>` : ''}
    </section>` : ''}

    <nav class="pager" aria-label="Other components">
      ${prev ? html`<a class="pager-prev" href="/research/${prev.slug}">${icon('arrowLeft', { size: 18 })}<span><small>Previous</small>${prev.shortTitle || prev.title}</span></a>` : html`<span></span>`}
      ${next ? html`<a class="pager-next" href="/research/${next.slug}"><span><small>Next</small>${next.shortTitle || next.title}</span>${icon('arrowRight', { size: 18 })}</a>` : html`<a class="pager-next" href="/domain#methodology"><span><small>Back to</small>Methodology</span>${icon('arrowRight', { size: 18 })}</a>`}
    </nav>
  </div>`;
  return layout(ctx, { title: comp.shortTitle || comp.title, description: comp.tagline, active: 'domain', content, pageClass: 'page-component' });
}

module.exports = { domainPage, componentPage };
