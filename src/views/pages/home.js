'use strict';
const { html, raw, escapeHtml } = require('../../lib/html');
const { pair, splitPipes, formatDate, youtubeId } = require('../../lib/util');
const { icon } = require('../icons');
const { heroArt, componentArt } = require('../illustrations');
const { sectionHead, statusPill, avatar, memberLine, hasAsset } = require('../partials');
const { layout } = require('../layout');

// Put "Betel Leaf" in the title in the accent italic.
function titleMarkup(title) {
  const safe = escapeHtml(title || '');
  return raw(safe.replace(/(betel\s+leaf)/i, '<em>$1</em>'));
}

const shortInstitution = (inst) => ((/\(([^)]+)\)/.exec(inst || '') || [])[1] || inst || '');

function hero(ctx) {
  const { site, data } = ctx;
  const readouts = (site.heroReadouts || []).map(splitPipes).filter((r) => r[0]).slice(0, 3);
  return html`<section class="hero">
    <div class="wrap hero-grid">
      <div class="hero-text">
        <p class="eyebrow">${[shortInstitution(site.institution), `Research project ${site.groupId}`, site.year].filter(Boolean).join(' · ')}</p>
        <h1 class="hero-title">${titleMarkup(site.siteTitle)}</h1>
        <p class="hero-lead">${site.tagline}</p>
        <div class="hero-cta">
          <a class="btn btn-primary" href="/domain">Explore the research${icon('arrowRight', { size: 18 })}</a>
          <a class="btn btn-ghost" href="/documents">Documents &amp; slides</a>
        </div>
        ${data.components.length ? html`<ul class="hero-components" aria-label="Research components">
          ${data.components.map((c) => html`<li><a href="/research/${c.slug}"><span class="dot dot-${c.accent || 'leaf'}" aria-hidden="true"></span>${c.shortTitle || c.title}</a></li>`)}
        </ul>` : ''}
      </div>
      <figure class="hero-figure">
        <div class="specimen">
          ${heroArt()}
          ${readouts.length ? html`<ul class="readouts" aria-label="Example results from the app">
            ${readouts.map(([label, value, note], i) => html`<li class="readout readout-${i + 1}"><span class="readout-label">${label}</span><span class="readout-value">${value}</span>${note ? html`<span class="readout-note">${note}</span>` : ''}</li>`)}
          </ul>` : ''}
        </div>
        <figcaption class="specimen-label"><em>Piper betle</em> L.<span>Example readings from the ${site.shortTitle || 'Betel AI'} app</span></figcaption>
      </figure>
    </div>
  </section>`;
}

function stats(site) {
  const items = (site.stats || []).map(pair).filter((s) => s.title);
  if (!items.length) return '';
  return html`<section class="stats-band" aria-label="Key figures">
    <div class="wrap"><dl class="stats">${items.map((s) => html`<div class="stat"><dt>${s.text}</dt><dd>${s.title}</dd></div>`)}</dl></div>
  </section>`;
}

function problem(site) {
  const steps = [['Problem', site.problem, 'alert'], ['Effect', site.effect, 'layers'], ['Solution', site.solution, 'leaf']].filter((s) => s[1]);
  if (!steps.length) return '';
  return html`<section class="section">
    <div class="wrap">
      ${sectionHead({ eyebrow: 'Research background', title: 'Why betel farming needs better tools', lead: 'Leaf quality, plant health and yield are still judged by eye. The project replaces guesswork with measurements a farmer can take on a phone.' })}
      <ol class="flow">
        ${steps.map(([label, text, ic]) => html`<li class="flow-step flow-${label.toLowerCase()}"><p class="flow-label">${icon(ic, { size: 18 })}${label}</p><p>${text}</p></li>`)}
      </ol>
    </div>
  </section>`;
}

function componentCards(ctx) {
  const comps = ctx.data.components;
  if (!comps.length) return '';
  return html`<section class="section section-tint">
    <div class="wrap">
      ${sectionHead({ eyebrow: 'Research components', title: `${comps.length === 4 ? 'Four' : comps.length} components, one mobile app`, lead: 'Each member owns one component. All of them run on the phone, so they keep working in betel gardens without mobile data.' })}
      <div class="comp-grid">
        ${comps.map((c, i) => {
    const member = ctx.memberById(c.member);
    return html`<article class="comp-card accent-${c.accent || 'leaf'}">
            <a class="comp-link" href="/research/${c.slug}" aria-label="${c.title}"></a>
            <div class="comp-art-wrap">${componentArt(c.illustration)}</div>
            <div class="comp-body">
              <p class="comp-index">Component ${String(i + 1).padStart(2, '0')}</p>
              <h3 class="comp-title">${c.title}</h3>
              <p class="comp-tagline">${c.tagline}</p>
              ${(c.models || []).length ? html`<ul class="chips">${c.models.slice(0, 4).map((m) => html`<li>${m}</li>`)}</ul>` : ''}
              <div class="comp-foot">${memberLine(member)}<span class="comp-more">Read more${icon('arrowRight', { size: 16 })}</span></div>
            </div>
          </article>`;
  })}
      </div>
    </div>
  </section>`;
}

function pipeline(ctx) {
  const { site, data } = ctx;
  const method = data.domain.find((d) => d.slug === 'methodology');
  const stages = method ? (method.items || []).map(pair).filter((p) => p.title) : [];
  if (!stages.length) return '';
  const stakeholders = (site.stakeholders || []).map(pair).filter((p) => p.title);
  const outcomes = (site.outcomes || []).filter(Boolean);
  return html`<section class="section section-forest">
    <div class="wrap">
      ${sectionHead({ eyebrow: 'System workflow', title: 'From a leaf photo to a farming decision', lead: method.summary })}
      <ol class="pipeline">
        ${stages.map((s, i) => html`<li><span class="pipeline-num">${i + 1}</span><h3>${s.title}</h3><p>${s.text}</p></li>`)}
      </ol>
      <div class="pipeline-extra">
        ${stakeholders.length ? html`<div><p class="mini-label">Built for</p><ul class="who">${stakeholders.map((s) => html`<li><strong>${s.title}</strong>${s.text ? html`<span>${s.text}</span>` : ''}</li>`)}</ul></div>` : ''}
        ${outcomes.length ? html`<div><p class="mini-label">Expected outcomes</p><ul class="outcomes">${outcomes.map((o) => html`<li>${icon('check', { size: 16 })}${o}</li>`)}</ul></div>` : ''}
      </div>
      <a class="btn btn-on-dark" href="/domain#methodology">Read the methodology${icon('arrowRight', { size: 18 })}</a>
    </div>
  </section>`;
}

function collaboration(site) {
  if (!site.collaboratorName) return '';
  const img = site.collaboratorImage && site.collaboratorImage.url;
  return html`<section class="section">
    <div class="wrap collab">
      ${img ? html`<figure class="framed collab-photo"><img src="${img}" alt="The research team at ${site.collaboratorName}" loading="lazy" width="800" height="450" data-lightbox data-caption="${site.collaboratorName}"></figure>` : ''}
      <div class="collab-text">
        <p class="eyebrow">Field collaboration</p>
        <h2 class="section-title">${site.collaboratorName}</h2>
        ${site.collaboratorText ? html`<p class="section-lead">${site.collaboratorText}</p>` : ''}
        <a class="text-link" href="/about">Meet the team${icon('arrowRight', { size: 16 })}</a>
      </div>
    </div>
  </section>`;
}

function progress(ctx) {
  const { data } = ctx;
  const ms = data.milestones;
  if (!ms.length) return '';
  const next = ms.find((m) => m.status !== 'completed');
  const latest = [...data.presentations, ...data.documents].filter(hasAsset)
    .sort((a, b) => String(b.date || b.updatedAt).localeCompare(String(a.date || a.updatedAt))).slice(0, 4);
  return html`<section class="section section-tint">
    <div class="wrap">
      ${sectionHead({ eyebrow: 'Progress', title: 'Where the project stands', lead: next ? `Next assessment: ${next.title}${next.date ? ` on ${formatDate(next.date)}` : ''}.` : 'All assessments are complete.', action: html`<a class="text-link" href="/milestones">All milestones${icon('arrowRight', { size: 16 })}</a>` })}
      <ol class="track">
        ${ms.map((m) => html`<li class="track-item track-${m.status || 'upcoming'}">
          <a href="/milestones#${m.slug}"><span class="track-dot" aria-hidden="true">${m.status === 'completed' ? icon('check', { size: 14 }) : ''}</span>
          <span class="track-title">${m.title}</span>
          <span class="track-date">${m.date ? formatDate(m.date, { short: true }) : (m.status === 'completed' ? 'Completed' : 'Upcoming')}</span></a>
        </li>`)}
      </ol>
      ${latest.length ? html`<div class="latest">
        <p class="mini-label">Recently added</p>
        <ul class="latest-list">${latest.map((item) => html`<li>
          <a href="${item.milestone !== undefined ? '/presentations' : '/documents'}">
            ${icon(item.milestone !== undefined ? 'slides' : 'file', { size: 20 })}
            <span><strong>${item.title}</strong><span class="latest-meta">${item.date ? formatDate(item.date) : (item.category || 'Presentation')}</span></span>
          </a></li>`)}</ul>
      </div>` : ''}
    </div>
  </section>`;
}

function galleryStrip(ctx) {
  const photos = ctx.data.gallery.filter((g) => g.image && g.image.url).slice(0, 5);
  if (!photos.length) return '';
  return html`<section class="section">
    <div class="wrap">
      ${sectionHead({ eyebrow: 'Gallery', title: 'In the field and in the app', action: html`<a class="text-link" href="/about#gallery">Full gallery${icon('arrowRight', { size: 16 })}</a>` })}
      <ul class="strip" data-lightbox-group>
        ${photos.map((g) => html`<li><img src="${g.image.url}" alt="${g.caption || 'Project photo'}" loading="lazy" data-lightbox data-caption="${g.caption || ''}"></li>`)}
      </ul>
    </div>
  </section>`;
}

function team(ctx) {
  const people = ctx.data.members.filter((m) => m.type === 'Team member');
  if (!people.length) return '';
  return html`<section class="section section-tint">
    <div class="wrap team-strip">
      <div>
        <p class="eyebrow">The team</p>
        <h2 class="section-title">Four researchers, one system</h2>
        <a class="text-link" href="/about">About us${icon('arrowRight', { size: 16 })}</a>
      </div>
      <ul class="team-mini">${people.map((m) => html`<li>${avatar(m, 'lg')}<strong>${m.name}</strong><span>${m.role}</span></li>`)}</ul>
    </div>
  </section>`;
}

function demoVideo(ctx) {
  const id = youtubeId(ctx.site.demoVideoUrl);
  if (!id) return '';
  return html`<section class="section"><div class="wrap">
    ${sectionHead({ eyebrow: 'Demo', title: 'See the app in action' })}
    ${ctx.mode === 'server'
    ? html`<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="Demo video" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`
    : html`<a class="btn btn-primary" href="${ctx.site.demoVideoUrl}" target="_blank" rel="noopener">${icon('play', { size: 18 })}Watch the demo on YouTube</a>`}
  </div></section>`;
}

function homePage(ctx) {
  const { site } = ctx;
  const content = html`${hero(ctx)}${stats(site)}${problem(site)}${componentCards(ctx)}${pipeline(ctx)}${demoVideo(ctx)}${collaboration(site)}${progress(ctx)}${galleryStrip(ctx)}${team(ctx)}`;
  return layout(ctx, { title: site.siteTitle, fullTitle: true, active: 'home', content, pageClass: 'page-home' });
}

module.exports = { homePage, titleMarkup };
