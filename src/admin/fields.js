'use strict';
// Renders admin form fields from the schema and turns submitted forms back
// into clean values (with validation and file uploads).
const { html, raw, safeUrl } = require('../lib/html');
const { slugify, formatBytes, fileTypeLabel } = require('../lib/util');
const { prepareUpload, fileRef, ACCEPT } = require('../lib/uploads');
const { HttpError } = require('../lib/http');
const { icon } = require('../views/icons');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ---------------------------------------------------------------- rendering
const fieldId = (name) => `f-${name}`;

function help(field, error) {
  return html`${field.help ? html`<p class="field-help" id="${fieldId(field.name)}-help">${field.help}</p>` : ''}${error ? html`<p class="field-error" id="${fieldId(field.name)}-error">${icon('alert', { size: 15 })}${error}</p>` : ''}`;
}

// Extra attributes shared by most inputs, returned as trusted markup.
function commonAttrs(field, error, { required = field.required } = {}) {
  const ids = [field.help && `${fieldId(field.name)}-help`, error && `${fieldId(field.name)}-error`].filter(Boolean).join(' ');
  let out = '';
  if (required) out += ' required';
  if (ids) out += ` aria-describedby="${ids}"`;
  if (error) out += ' aria-invalid="true"';
  if (field.maxLength) out += ` maxlength="${Number(field.maxLength)}"`;
  return raw(out);
}

function currentFile(field, value) {
  const isImage = field.type === 'image' || /^image\//.test(value.mime || '');
  return html`<div class="file-current">
    ${isImage ? html`<img src="${value.url}" alt="" class="file-thumb">` : html`<span class="file-icon">${icon('file', { size: 26 })}</span>`}
    <div class="file-info">
      <a href="${value.url}" target="_blank" rel="noopener">${value.name || value.url}</a>
      <span>${fileTypeLabel(value.name || value.url)}${value.size ? ` · ${formatBytes(value.size)}` : ''}${value.id ? '' : ' · ships with the site'}</span>
    </div>
    <label class="check-inline check-remove"><input type="checkbox" name="${field.name}__remove"> Remove</label>
  </div>`;
}

function renderField(field, value, { error, options = {} } = {}) {
  const id = fieldId(field.name);
  const label = html`<label for="${id}">${field.label}${field.required ? html`<span class="req" aria-hidden="true"> *</span>` : ''}</label>`;
  const val = value === null || value === undefined ? '' : value;

  switch (field.type) {
    case 'textarea':
    case 'markdown':
    case 'list': {
      const text = Array.isArray(val) ? val.join('\n') : val;
      const rows = field.rows || (field.type === 'markdown' ? 10 : 4);
      const tools = field.type === 'markdown'
        ? html`<span class="label-tools"><span class="hint">Markdown: **bold**, *italic*, [link](https://…), - lists</span><button type="button" class="btn btn-tiny btn-ghost" data-md-preview="${id}">Preview</button></span>`
        : field.type === 'list' ? html`<span class="hint">One item per line</span>` : '';
      return html`<div class="field field-${field.type}">
        <div class="label-row">${label}${tools}</div>
        <textarea id="${id}" name="${field.name}" rows="${rows}"${commonAttrs(field, error)}>${text}</textarea>
        ${field.type === 'markdown' ? html`<div class="md-preview prose" data-md-output="${id}" hidden></div>` : ''}
        ${help(field, error)}
      </div>`;
    }
    case 'select': {
      const current = val || field.default || '';
      return html`<div class="field">${label}
        <div class="select-wrap"><select id="${id}" name="${field.name}"${commonAttrs(field, error, { required: false })}>
          ${field.options.map(([v, l]) => html`<option value="${v}"${v === current ? raw(' selected') : ''}>${l}</option>`)}
        </select>${icon('chevronDown', { size: 16 })}</div>
        ${help(field, error)}</div>`;
    }
    case 'ref': {
      const items = options[field.collection] || [];
      return html`<div class="field">${label}
        <div class="select-wrap"><select id="${id}" name="${field.name}"${commonAttrs(field, error, { required: false })}>
          <option value="">None</option>
          ${items.map((it) => html`<option value="${it.id}"${it.id === val ? raw(' selected') : ''}>${it.name || it.title}</option>`)}
        </select>${icon('chevronDown', { size: 16 })}</div>
        ${help(field, error)}</div>`;
    }
    case 'boolean':
      return html`<div class="field field-check"><label class="check-inline"><input type="checkbox" id="${id}" name="${field.name}"${val ? raw(' checked') : ''}> ${field.label}</label>${help(field, error)}</div>`;
    case 'image':
    case 'file': {
      const has = Boolean(val && val.url);
      const accept = field.type === 'image' ? ACCEPT.image : ACCEPT.file;
      return html`<div class="field field-file">${label}
        ${has ? currentFile(field, val) : ''}
        <div class="dropzone" data-dropzone>
          <input type="file" id="${id}" name="${field.name}" accept="${accept}"${commonAttrs(field, error, { required: field.required && !has })}>
          <span class="dropzone-text">${icon('upload', { size: 18 })}<span>${has ? 'Choose a file to replace it' : 'Choose a file or drop it here'}</span></span>
          <img class="dropzone-preview" alt="" hidden>
        </div>
        ${help(field, error)}</div>`;
    }
    case 'images': {
      const list = Array.isArray(val) ? val : [];
      return html`<div class="field field-images"><span class="label-like">${field.label}</span>
        ${list.length ? html`<ul class="image-list">${list.map((img, i) => html`<li>
          <img src="${img.url}" alt="" class="file-thumb">
          <div class="image-list-fields">
            <label class="visually-hidden" for="${id}-cap-${i}">Caption for image ${i + 1}</label>
            <input id="${id}-cap-${i}" name="${field.name}__caption_${i}" value="${img.caption || ''}" placeholder="Caption" maxlength="200">
            <div class="image-list-row">
              <label class="order-input">Position <input type="number" name="${field.name}__order_${i}" value="${i + 1}" min="1" max="99"></label>
              <label class="check-inline check-remove"><input type="checkbox" name="${field.name}__remove_${i}"> Remove</label>
            </div>
          </div>
        </li>`)}</ul>` : html`<p class="field-help">No images yet.</p>`}
        <div class="dropzone" data-dropzone>
          <input type="file" id="${id}" name="${field.name}__new" accept="${ACCEPT.image}" multiple>
          <span class="dropzone-text">${icon('upload', { size: 18 })}<span>Add images (you can pick several)</span></span>
        </div>
        ${help(field, error)}</div>`;
    }
    default: {
      const type = { url: 'url', email: 'email', date: 'date', number: 'number' }[field.type] || 'text';
      const extra = [
        field.placeholder ? `placeholder="${String(field.placeholder).replace(/"/g, '&quot;')}"` : '',
        field.type === 'slug' ? `data-slug-from="${fieldId(field.from || 'title')}" pattern="[a-z0-9-]*"` : '',
        field.type === 'url' ? 'placeholder="https://"' : '',
      ].filter(Boolean).join(' ');
      return html`<div class="field${field.wide ? ' field-wide' : ''}">${label}
        <input id="${id}" name="${field.name}" type="${type}" value="${val}"${extra ? raw(` ${extra}`) : ''}${commonAttrs(field, error)}>
        ${help(field, error)}</div>`;
    }
  }
}

// ---------------------------------------------------------------- parsing
// Reads the submitted form for the given fields.
// Returns { values, errors, uploaded } where uploaded lists new file ids.
async function readFields(fields, form, existing, { content, options = {} }) {
  const values = {};
  const errors = {};
  const pendingFiles = [];

  for (const field of fields) {
    const name = field.name;
    const rawValue = form.get(name);
    const text = rawValue === null ? '' : String(rawValue).replace(/\r\n/g, '\n');
    switch (field.type) {
      case 'text': case 'textarea': case 'markdown': {
        const v = field.type === 'text' ? text.trim() : text.replace(/\s+$/, '');
        if (field.maxLength && v.length > field.maxLength) errors[name] = `Keep this under ${field.maxLength} characters (it is ${v.length}).`;
        values[name] = v;
        break;
      }
      case 'list':
        values[name] = text.split('\n').map((s) => s.trim()).filter(Boolean);
        break;
      case 'number':
        values[name] = text.trim() === '' ? null : Number(text);
        if (text.trim() !== '' && Number.isNaN(values[name])) errors[name] = 'Enter a number.';
        break;
      case 'date':
        values[name] = text.trim();
        if (values[name] && !DATE_RE.test(values[name])) errors[name] = 'Use the date picker or the format YYYY-MM-DD.';
        break;
      case 'url': {
        const v = text.trim();
        values[name] = v;
        if (v && !/^https?:\/\/\S+$/i.test(v)) errors[name] = 'Enter a full web address starting with https://';
        else if (v && !safeUrl(v)) errors[name] = 'This address cannot be used.';
        break;
      }
      case 'email':
        values[name] = text.trim();
        if (values[name] && !EMAIL_RE.test(values[name])) errors[name] = 'Enter a valid email address, like name@example.com.';
        break;
      case 'slug':
        values[name] = slugify(text);
        break;
      case 'select': {
        const allowed = field.options.map((o) => o[0]);
        values[name] = allowed.includes(text) ? text : (field.default || allowed[0]);
        break;
      }
      case 'ref': {
        const ids = (options[field.collection] || []).map((x) => x.id);
        values[name] = ids.includes(text) ? text : '';
        break;
      }
      case 'boolean':
        values[name] = rawValue === 'on';
        break;
      case 'image': case 'file': {
        const current = existing ? existing[name] : null;
        const upload = form.file(name);
        if (upload) pendingFiles.push({ field, upload, kind: field.type === 'image' ? 'image' : 'file' });
        else if (form.get(`${name}__remove`) === 'on') values[name] = null;
        else values[name] = current || null;
        if (upload) values[name] = current || null; // replaced below once the upload is stored
        break;
      }
      case 'images': {
        const current = existing && Array.isArray(existing[name]) ? existing[name] : [];
        const kept = [];
        current.forEach((img, i) => {
          if (form.get(`${name}__remove_${i}`) === 'on') return;
          const order = Number(form.get(`${name}__order_${i}`)) || i + 1;
          const caption = form.get(`${name}__caption_${i}`);
          kept.push({ img: { ...img, caption: String(caption ?? img.caption ?? '').trim().slice(0, 200) }, order, i });
        });
        kept.sort((a, b) => a.order - b.order || a.i - b.i);
        values[name] = kept.map((k) => k.img);
        for (const upload of form.files(`${name}__new`)) pendingFiles.push({ field, upload, kind: 'image', multiple: true });
        break;
      }
      default:
        values[name] = text.trim();
    }
    const empty = values[name] === '' || values[name] === null || values[name] === undefined || (Array.isArray(values[name]) && !values[name].length);
    if (field.required && !['image', 'file', 'images'].includes(field.type) && empty && !errors[name]) {
      errors[name] = `${field.label} is required.`;
    }
  }

  // Required uploads.
  for (const field of fields.filter((f) => f.required && (f.type === 'image' || f.type === 'file'))) {
    const pending = pendingFiles.some((p) => p.field === field);
    const removed = form.get(`${field.name}__remove`) === 'on';
    if (!pending && (removed || !(values[field.name] && values[field.name].url))) errors[field.name] = `Please choose a ${field.type === 'image' ? 'photo' : 'file'}.`;
  }

  // Store uploads only when everything else is valid, so a failed save
  // never leaves orphaned files behind.
  const uploaded = [];
  if (!Object.keys(errors).length) {
    for (const p of pendingFiles) {
      try {
        const { meta, buffer } = await prepareUpload(p.upload, p.kind);
        await content.saveFile(meta, buffer);
        uploaded.push(meta.id);
        const ref = fileRef(meta);
        if (p.multiple) values[p.field.name].push({ ...ref, caption: meta.name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').trim() });
        else values[p.field.name] = ref;
      } catch (err) {
        if (!(err instanceof HttpError)) throw err;
        errors[p.field.name] = err.message;
      }
    }
    if (Object.keys(errors).length) {
      for (const id of uploaded) await content.deleteFile(id).catch(() => {});
      uploaded.length = 0;
    }
  }
  return { values, errors, uploaded };
}

// File ids referenced anywhere inside a value.
function fileIds(value, out = new Set()) {
  if (!value) return out;
  if (Array.isArray(value)) { value.forEach((v) => fileIds(v, out)); return out; }
  if (typeof value === 'object') {
    if (value.id && value.url && String(value.url).startsWith('/files/')) out.add(value.id);
    return out;
  }
  if (typeof value === 'string') for (const m of value.matchAll(/\/files\/([\w-]{6,40})\//g)) out.add(m[1]);
  return out;
}

module.exports = { renderField, readFields, fileIds };
