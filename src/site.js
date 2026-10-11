'use strict';
// Builds the data every public page needs (the "view context") and the
// search index used by the site search.
const path = require('path');
const config = require('./config');
const { assetVersioner } = require('./lib/http');
const { pair, plainText, truncate } = require('./lib/util');

const versioned = assetVersioner(config.paths.public);

async function buildContext(content, { mode = 'server', origin = '', query = {} } = {}) {
  const snap = await content.snapshot();
  const site = snap.settings;
  const data = snap.collections;
  const members = new Map(data.members.map((m) => [m.id, m]));
  const liveUrl = (site.publicSiteUrl || config.publicSiteUrl || '').replace(/\/+$/, '');
  const isPublicOrigin = origin && !/\/\/(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(origin);
  return {
    mode,
    site,
    data,
    query,
    liveUrl,
    asset: mode === 'server' ? versioned : (p) => p,
    memberById: (id) => members.get(id) || null,
    absolute: origin ? (p) => `${origin}${p}` : null,
    // Word/PowerPoint files can be previewed with Microsoft's free viewer,
    // which needs a publicly reachable link.
    officeViewer: mode === 'server' && isPublicOrigin
      ? (href) => `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(origin + href)}`
      : null,
  };
}

function searchIndex(ctx) {
  const { site, data } = ctx;
  const entries = [];
  const add = (title, url, section, text) => entries.push({ t: title, u: url, s: section, x: truncate(plainText(text), 2400) });
  add(site.siteTitle, '/', 'Home', `${site.tagline} ${site.problem} ${site.solution}`);
  for (const d of data.domain) add(d.title, `/domain#${d.slug}`, 'Domain', `${d.summary} ${d.body} ${(d.items || []).join(' ')}`);
  for (const c of data.components) {
    const member = ctx.memberById(c.member);
    add(c.title, `/research/${c.slug}`, 'Research component', `${c.tagline} ${(c.models || []).join(' ')} ${member ? member.name : ''} ${(c.overview || []).join(' ')} ${c.results || ''}`);
  }
  for (const m of data.milestones) add(m.title, `/milestones#${m.slug}`, 'Milestone', `${m.summary} ${m.details || ''} ${m.marks || ''}`);
  for (const d of data.documents) add(d.title, '/documents', `Document · ${d.category}`, `${d.description} ${d.author || ''}`);
  for (const p of data.presentations) add(p.title, '/presentations', 'Presentation', p.description);
  for (const m of data.members) add(m.name, m.type === 'Team member' ? '/about#team' : '/about#supervisors', m.type, `${m.studentId} ${m.role} ${m.bio} ${m.email}`);
  for (const s of (site.stakeholders || []).map(pair)) add(s.title, '/', 'Stakeholder', s.text);
  add('Contact Us', '/contact', 'Contact', `${site.contactEmail} ${site.address} email template message`);
  add('Gallery', '/about#gallery', 'Photos', data.gallery.map((g) => g.caption).join(' '));
  return entries;
}

module.exports = { buildContext, searchIndex, versioned, publicDir: path.resolve(config.paths.public) };
