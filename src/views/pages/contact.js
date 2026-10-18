'use strict';
const { html } = require('../../lib/html');
const { icon } = require('../icons');
const { pageHeader, emailLine } = require('../partials');
const { layout } = require('../layout');

function contactForm(ctx, { values = {}, errors = {}, sent = false } = {}) {
  const action = ctx.mode === 'server' ? '/contact' : (ctx.liveUrl ? `${ctx.liveUrl}/contact` : '');
  const err = (name) => (errors[name] ? html`<p class="field-error" id="${name}-error">${errors[name]}</p>` : '');
  const described = (name) => (errors[name] ? ` aria-describedby="${name}-error" aria-invalid="true"` : '');
  if (!action && ctx.mode !== 'preview') {
    return html`<div class="form-card"><h2 class="card-title">Send us a message</h2><p>Email the team using the template below, or use the contact form on the live site.</p></div>`;
  }
  return html`<div class="form-card" id="message">
    <h2 class="card-title">Send us a message</h2>
    ${sent ? html`<p class="notice notice-ok" role="status">${icon('check', { size: 18 })}Thank you. Your message was sent to the group member.</p>` : ''}
    ${errors._form ? html`<p class="notice notice-error" role="alert">${icon('alert', { size: 18 })}${errors._form}</p>` : ''}
    <form method="post" action="${action || '#'}" class="contact-form" ${ctx.mode === 'preview' ? 'data-preview-form' : ''} novalidate>
      <div class="field">
        <label for="c-name">Your name</label>
        <input id="c-name" name="name" required maxlength="100" autocomplete="name" value="${values.name || ''}"${described('name')}>
        ${err('name')}
      </div>
      <div class="field">
        <label for="c-member">Group member</label>
        <div class="select-wrap"><select id="c-member" name="member" required${described('member')}>
          <option value="">Choose a member</option>
          ${ctx.data.members.filter((m) => m.type === 'Team member').map((m) => html`<option value="${m.id}"${values.member === m.id ? ' selected' : ''}>${m.name}${m.role ? ` — ${m.role}` : ''}</option>`)}
        </select>${icon('chevronDown', { size: 18 })}</div>
        ${err('member')}
      </div>
      <div class="field">
        <label for="c-topic">Topic</label>
        <div class="select-wrap"><select id="c-topic" name="subject">
          ${['General enquiry', 'Collaboration', 'Quality grading', 'Disease detection', 'Pest detection', 'Yield prediction', 'Documents and access'].map((t) => html`<option${values.subject === t ? ' selected' : ''}>${t}</option>`)}
        </select>${icon('chevronDown', { size: 18 })}</div>
      </div>
      <div class="field">
        <label for="c-message">Message</label>
        <textarea id="c-message" name="message" required maxlength="4000" rows="6"${described('message')}>${values.message || ''}</textarea>
        ${err('message')}
      </div>
      <div class="hp-field" aria-hidden="true"><label for="c-website">Leave this empty</label><input id="c-website" name="website" tabindex="-1" autocomplete="off"></div>
      <button class="btn btn-primary" type="submit">${icon('mail', { size: 18 })}Send message</button>
      ${ctx.mode === 'preview' ? html`<p class="form-note" data-preview-note hidden>This is a design preview, so the message was not sent. The form works on the deployed site.</p>` : ''}
    </form>
  </div>`;
}

function contactPage(ctx, formState = {}) {
  const { site, data } = ctx;
  const team = data.members.filter((m) => m.email);
  const header = pageHeader({
    eyebrow: 'Contact Us',
    title: 'Get in touch',
    lead: 'Questions about the research, a collaboration idea or access to a document? Contact a member directly or send the team a message.',
    crumbs: [{ label: 'Home', href: '/' }, { label: 'Contact Us' }],
  });
  const to = site.contactEmail || team.filter((m) => m.type === 'Team member').map((m) => m.email).join(',');
  const subject = site.emailTemplateSubject || `[${site.groupId}] Enquiry`;
  const body = site.emailTemplateBody || '';
  const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const templateText = `Subject: ${subject}\n\n${body}`;

  const content = html`${header}
  <div class="wrap section-tight contact-grid">
    <div class="contact-info">
      <h2 class="card-title">General contacts</h2>
      <ul class="contact-list">
        ${site.contactEmail ? html`<li>${icon('mail', { size: 20 })}<div><span class="mini-label">Group email</span>${emailLine(site.contactEmail)}</div></li>` : ''}
        ${site.contactPhone ? html`<li>${icon('phone', { size: 20 })}<div><span class="mini-label">Phone</span><a href="tel:${site.contactPhone.replace(/\s+/g, '')}">${site.contactPhone}</a></div></li>` : ''}
        ${site.address ? html`<li>${icon('pin', { size: 20 })}<div><span class="mini-label">Address</span><span class="address">${site.address}</span></div></li>` : ''}
      </ul>
      ${team.length ? html`<h3 class="mini-label contact-sub">Team and supervisors</h3>
      <ul class="people-emails">${team.map((m) => html`<li><span><strong>${m.name}</strong><span>${m.type === 'Team member' ? (m.role || 'Team member') : m.type}</span></span>${emailLine(m.email)}</li>`)}</ul>` : ''}
    </div>
    ${contactForm(ctx, formState)}
  </div>

  <section class="section">
    <div class="wrap template-wrap">
      <div>
        <p class="eyebrow">Email template</p>
        <h2 class="section-title">Writing to the team?</h2>
        <p class="section-lead">Copy this template so your email reaches the right person with the details we need.</p>
        <div class="actions">
          <button type="button" class="btn btn-primary" data-copy-target="email-template">${icon('copy', { size: 18 })}Copy template</button>
          <a class="btn btn-ghost" href="${mailto}">${icon('mail', { size: 18 })}Open in email app</a>
        </div>
        ${to ? html`<p class="form-note">Send it to <span class="mono selectable">${to.split(',').join(', ')}</span></p>` : ''}
      </div>
      <pre class="template" id="email-template">${templateText}</pre>
    </div>
  </section>`;
  return layout(ctx, { title: 'Contact Us', active: 'contact', content, pageClass: 'page-contact' });
}

function notFoundPage(ctx) {
  const content = html`${pageHeader({ eyebrow: 'Error 404', title: 'This page could not be found', lead: 'The link may be out of date, or the page may have moved.', crumbs: [{ label: 'Home', href: '/' }, { label: 'Not found' }] })}
  <div class="wrap section-tight"><div class="actions"><a class="btn btn-primary" href="/">${icon('home', { size: 18 })}Go to the home page</a><a class="btn btn-ghost" href="/documents">Documents</a><button type="button" class="btn btn-ghost" data-search-open>${icon('search', { size: 18 })}Search the site</button></div></div>`;
  return layout(ctx, { title: 'Page not found', content, pageClass: 'page-404' });
}

function errorPage(ctx, message, { href = '/', label = 'Go to the home page' } = {}) {
  const content = html`${pageHeader({ eyebrow: 'Something went wrong', title: 'We could not complete that', lead: message || 'Please try again in a moment.' })}
  <div class="wrap section-tight"><a class="btn btn-primary" href="${href}">${icon(href === '/' ? 'home' : 'arrowRight', { size: 18 })}${label}</a></div>`;
  return layout(ctx, { title: 'Error', content });
}

module.exports = { contactPage, notFoundPage, errorPage };
