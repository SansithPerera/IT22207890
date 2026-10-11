'use strict';
// Tiny, safe HTML templating with tagged template literals.
//   html`<p>${userText}</p>`   -> userText is escaped
//   html`<div>${raw(trusted)}</div>` -> trusted markup is inserted as-is
// Arrays are joined, and null / undefined / false / true render as nothing.

class SafeHtml {
  constructor(value) { this.value = value; }
  toString() { return this.value; }
}

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ESCAPES[c]);

function renderValue(value) {
  if (value === null || value === undefined || value === false || value === true) return '';
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(renderValue).join('');
  return escapeHtml(value);
}

function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i += 1) out += renderValue(values[i]) + strings[i + 1];
  return new SafeHtml(out);
}

const raw = (value) => new SafeHtml(value === null || value === undefined ? '' : String(value));

// Only allow links that cannot run script.
function safeUrl(url) {
  if (!url) return '';
  const value = String(url).trim();
  if (/^(https?:|mailto:|tel:)/i.test(value)) return value;
  if (/^[/#?]/.test(value) && !value.startsWith('//')) return value;
  if (/^[\w.-]+(\/[\w./%-]*)?(\?[^#]*)?(#.*)?$/.test(value) && !value.includes(':')) return value;
  return '';
}

// class names from an object: cls({ active: true, big: false }, 'base')
function cls(...parts) {
  const out = [];
  for (const part of parts) {
    if (!part) continue;
    if (typeof part === 'string') out.push(part);
    else for (const [k, v] of Object.entries(part)) if (v) out.push(k);
  }
  return out.join(' ');
}

module.exports = { html, raw, escapeHtml, safeUrl, cls, SafeHtml, renderValue };
