'use strict';
const { html, safeUrl } = require('../../lib/html');
const { formatDate } = require('../../lib/util');
const { renderMarkdown } = require('../../lib/markdown');
const { icon } = require('../icons');
const { pageHeader, sectionHead, avatar, emailLine, emptyState } = require('../partials');
const { layout } = require('../layout');

function personCard(ctx, m) {
  const comp = ctx.data.components.find((c) => c.member === m.id);
  const links = [
    safeUrl(m.linkedin) && html`<a class="icon-btn" href="${m.linkedin}" target="_blank" rel="noopener" aria-label="${m.name} on LinkedIn">${icon('linkedin', { size: 18 })}</a>`,
    safeUrl(m.github) && html`<a class="icon-btn" href="${m.github}" target="_blank" rel="noopener" aria-label="${m.name} on GitHub">${icon('code', { size: 18 })}</a>`,
  ].filter(Boolean);
  return html`<li class="person${comp ? ` accent-${comp.accent || 'leaf'}` : ''}">
    <div class="person-photo">${avatar(m, 'xl')}</div>
    <div class="person-body">
      <h3>${m.name}</h3>
      <p class="person-id">${[m.studentId, m.type !== 'Team member' ? m.type : ''].filter(Boolean).join(' · ')}</p>
      ${comp ? html`<p class="person-role"><a href="/research/${comp.slug}">${m.role || comp.title}</a></p>` : (m.role ? html`<p class="person-role">${m.role}</p>` : '')}
      ${m.bio ? html`<p class="person-bio">${m.bio}</p>` : ''}
      ${(m.achievements || []).length ? html`<ul class="person-achievements">${m.achievements.map((a) => html`<li>${icon('check', { size: 15 })}${a}</li>`)}</ul>` : ''}
      <div class="person-contact">${emailLine(m.email)}${links}</div>
    </div>
  </li>`;
}

function aboutPage(ctx) {
  const { site, data } = ctx;
  const team = data.members.filter((m) => m.type === 'Team member');
  const supervisors = data.members.filter((m) => m.type !== 'Team member');
  const header = pageHeader({
    eyebrow: 'About Us',
    title: 'The research team',
    lead: `${site.groupId} · ${site.degree || 'Final-year research project'} · ${site.institution}`,
    crumbs: [{ label: 'Home', href: '/' }, { label: 'About Us' }],
  });
  const facts = [
    ['Group ID', site.groupId], ['Institution', site.institution], ['Faculty', site.faculty], ['Degree', site.degree], ['Year', site.year],
  ].filter((f) => f[1]);
  const photos = data.gallery.filter((g) => g.image && g.image.url);
  const cats = [...new Set(photos.map((g) => g.category).filter(Boolean))];

  const content = html`${header}
  <div class="wrap section-tight about-intro">
    <div class="prose prose-large">${renderMarkdown(site.aboutIntro)}</div>
    ${facts.length ? html`<dl class="facts">${facts.map(([k, v]) => html`<div><dt>${k}</dt><dd>${v}</dd></div>`)}</dl>` : ''}
  </div>

  <section class="section">
    <div class="wrap">
      ${sectionHead({ eyebrow: 'Group members', title: 'Who we are', id: 'team' })}
      ${team.length ? html`<ul class="people">${team.map((m) => personCard(ctx, m))}</ul>` : emptyState('Team members will be listed here.')}
    </div>
  </section>

  ${supervisors.length ? html`<section class="section section-tint">
    <div class="wrap">
      ${sectionHead({ eyebrow: 'Guidance', title: 'Supervisors', id: 'supervisors' })}
      <ul class="people people-compact">${supervisors.map((m) => personCard(ctx, m))}</ul>
    </div>
  </section>` : ''}

  ${site.collaboratorName ? html`<section class="section">
    <div class="wrap collab">
      ${site.collaboratorImage && site.collaboratorImage.url ? html`<figure class="framed collab-photo"><img src="${site.collaboratorImage.url}" alt="The research team at ${site.collaboratorName}" loading="lazy" width="800" height="450" data-lightbox data-caption="${site.collaboratorName}"></figure>` : ''}
      <div class="collab-text"><p class="eyebrow">Collaboration</p><h2 class="section-title">${site.collaboratorName}</h2>${site.collaboratorText ? html`<p class="section-lead">${site.collaboratorText}</p>` : ''}</div>
    </div>
  </section>` : ''}

  ${(site.achievements || []).length ? html`<section class="section section-tint">
    <div class="wrap">
      ${sectionHead({ eyebrow: 'Recognition', title: 'Achievements', id: 'achievements' })}
      <ul class="checks checks-large">${site.achievements.map((a) => html`<li>${icon('check', { size: 18 })}<span>${a}</span></li>`)}</ul>
    </div>
  </section>` : ''}

  <section class="section" id="gallery">
    <div class="wrap">
      ${sectionHead({ eyebrow: 'Gallery', title: 'Photos from the project' })}
      ${photos.length ? html`
        ${cats.length > 1 ? html`<div class="filter" role="group" aria-label="Filter photos" data-filter-group>
          <button type="button" class="filter-btn" aria-pressed="true" data-filter="*">All</button>
          ${cats.map((c) => html`<button type="button" class="filter-btn" aria-pressed="false" data-filter="${c}">${c}</button>`)}
        </div>` : ''}
        <ul class="gallery" data-lightbox-group>
          ${photos.map((g) => html`<li data-category="${g.category || ''}"><figure>
            <img src="${g.image.url}" alt="${g.caption || 'Project photo'}" loading="lazy" data-lightbox data-caption="${g.caption || ''}">
            ${g.caption || g.date ? html`<figcaption>${g.caption}${g.date ? html`<span>${formatDate(g.date)}</span>` : ''}</figcaption>` : ''}
          </figure></li>`)}
        </ul>` : emptyState('Photos will appear here once they are uploaded.')}
    </div>
  </section>`;
  return layout(ctx, { title: 'About Us', active: 'about', content, pageClass: 'page-about' });
}

module.exports = { aboutPage };
