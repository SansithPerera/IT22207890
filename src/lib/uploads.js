'use strict';
// Validates uploaded files by their actual content (not just the name),
// shrinks photos to web-friendly WebP when "sharp" is installed, and
// produces the file record stored with each item.
const config = require('../config');
const { HttpError } = require('./http');
const { newId, extOf, isoNow, formatBytes } = require('./util');

let sharp = null;
try { sharp = require('sharp'); } catch { sharp = null; }

const IMAGE_TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };
const DOC_TYPES = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  odt: 'application/vnd.oasis.opendocument.text',
  odp: 'application/vnd.oasis.opendocument.presentation',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  zip: 'application/zip',
  txt: 'text/plain; charset=utf-8',
  csv: 'text/csv; charset=utf-8',
  md: 'text/plain; charset=utf-8',
  mp4: 'video/mp4',
  webm: 'video/webm',
};
const ANY_TYPES = { ...DOC_TYPES, ...IMAGE_TYPES };

const ACCEPT = {
  image: Object.keys(IMAGE_TYPES).map((e) => `.${e}`).join(','),
  file: Object.keys(ANY_TYPES).map((e) => `.${e}`).join(','),
};

const startsWith = (buf, bytes, offset = 0) => bytes.every((b, i) => buf[offset + i] === b);

// Does the content match what the extension claims?
function contentMatches(ext, buf) {
  switch (ext) {
    case 'jpg': case 'jpeg': return startsWith(buf, [0xff, 0xd8, 0xff]);
    case 'png': return startsWith(buf, [0x89, 0x50, 0x4e, 0x47]);
    case 'gif': return startsWith(buf, [0x47, 0x49, 0x46, 0x38]);
    case 'webp': return startsWith(buf, [0x52, 0x49, 0x46, 0x46]) && startsWith(buf, [0x57, 0x45, 0x42, 0x50], 8);
    case 'pdf': return buf.slice(0, 1024).includes('%PDF-');
    case 'docx': case 'pptx': case 'xlsx': case 'odt': case 'odp': case 'ods': case 'zip':
      return startsWith(buf, [0x50, 0x4b, 0x03, 0x04]) || startsWith(buf, [0x50, 0x4b, 0x05, 0x06]);
    case 'doc': case 'ppt': case 'xls': return startsWith(buf, [0xd0, 0xcf, 0x11, 0xe0]);
    case 'mp4': return startsWith(buf, [0x66, 0x74, 0x79, 0x70], 4);
    case 'webm': return startsWith(buf, [0x1a, 0x45, 0xdf, 0xa3]);
    case 'txt': case 'csv': case 'md': return !buf.slice(0, 8192).includes(0);
    default: return false;
  }
}

function cleanName(name) {
  const base = String(name || 'file').split(/[\\/]/).pop();
  const cleaned = base.normalize('NFKC').replace(/[^\w.\- ()]+/g, '_').replace(/\s+/g, ' ').trim();
  return cleaned.slice(-120) || 'file';
}

// Turn an uploaded File into { meta, buffer } ready to store.
async function prepareUpload(file, kind = 'file') {
  const limit = config.maxUploadMb * 1024 * 1024;
  if (file.size > limit) throw new HttpError(413, `"${file.name}" is ${formatBytes(file.size)}. Files must be ${config.maxUploadMb} MB or smaller.`);
  let name = cleanName(file.name);
  let ext = extOf(name);
  const allowed = kind === 'image' ? IMAGE_TYPES : ANY_TYPES;
  if (!allowed[ext]) {
    const list = Object.keys(allowed).join(', ');
    throw new HttpError(400, `"${name}" is not a supported ${kind === 'image' ? 'image' : 'file'} type. Use ${list}.`);
  }
  let buffer = Buffer.from(await file.arrayBuffer());
  if (!contentMatches(ext, buffer)) throw new HttpError(400, `"${name}" does not look like a real .${ext} file.`);
  let mime = allowed[ext];

  // Photos: fix rotation, cap the size and convert to WebP (unless the photo is
  // already small enough and WebP would only make the file bigger).
  if (sharp && config.optimiseImages && ['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    try {
      const { width = 0, height = 0 } = await sharp(buffer, { failOn: 'none' }).metadata();
      const oversized = Math.max(width, height) > config.maxImageWidth;
      const out = await sharp(buffer, { failOn: 'none' })
        .rotate()
        .resize({ width: config.maxImageWidth, height: config.maxImageWidth, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      if (oversized || out.length < buffer.length) {
        buffer = out;
        name = name.replace(/\.[a-z0-9]+$/i, '.webp');
        ext = 'webp';
        mime = 'image/webp';
      }
    } catch (err) {
      console.warn('[uploads] Could not optimise image, keeping the original:', err.message);
    }
  }

  const id = newId();
  const meta = { id, name, mime, size: buffer.length, kind: mime.startsWith('image/') ? 'image' : 'file', createdAt: isoNow() };
  return { meta, buffer };
}

// The value stored in an item field.
function fileRef(meta) {
  return { id: meta.id, url: `/files/${meta.id}/${encodeURIComponent(meta.name)}`, name: meta.name, mime: meta.mime, size: meta.size };
}

// Files that browsers display directly; everything else downloads.
const INLINE_TYPES = /^(image\/(jpeg|png|webp|gif)|application\/pdf|video\/(mp4|webm)|text\/plain)/;

module.exports = { prepareUpload, fileRef, ACCEPT, INLINE_TYPES, hasSharp: () => Boolean(sharp), IMAGE_TYPES, ANY_TYPES };
