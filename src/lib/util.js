'use strict';
const crypto = require('crypto');

const newId = () => crypto.randomBytes(9).toString('base64url'); // 12 URL-safe characters

function slugify(text) {
  return String(text || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// '2026-09-01' -> '1 September 2026'
function formatDate(value, { short = false } = {}) {
  if (!value) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  if (!m) return String(value);
  const month = MONTHS[Number(m[2]) - 1];
  if (!month) return String(value);
  return `${Number(m[3])} ${short ? month.slice(0, 3) : month} ${m[1]}`;
}

function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${formatDate(d.toISOString().slice(0, 10), { short: true })}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

// "Title | description" -> { title, text }
function pair(line) {
  const s = String(line || '');
  const i = s.indexOf('|');
  if (i === -1) return { title: s.trim(), text: '' };
  return { title: s.slice(0, i).trim(), text: s.slice(i + 1).trim() };
}

// "Label | value | note" -> [label, value, note]
const splitPipes = (line) => String(line || '').split('|').map((p) => p.trim());

function initials(name) {
  const parts = String(name || '').split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

const FILE_TYPES = {
  pdf: 'PDF', doc: 'Word', docx: 'Word', ppt: 'PowerPoint', pptx: 'PowerPoint', xls: 'Excel', xlsx: 'Excel',
  odt: 'Document', odp: 'Slides', ods: 'Spreadsheet', zip: 'ZIP', txt: 'Text', csv: 'CSV', md: 'Text',
  mp4: 'Video', webm: 'Video', jpg: 'Image', jpeg: 'Image', png: 'Image', webp: 'Image', gif: 'Image',
};
const extOf = (name) => (/\.([a-z0-9]+)$/i.exec(String(name || '')) || [])[1]?.toLowerCase() || '';
const fileTypeLabel = (name) => FILE_TYPES[extOf(name)] || 'File';

function isoNow() { return new Date().toISOString(); }

function truncate(text, n) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s;
}

// Strip markdown to plain text (for search index / meta descriptions).
function plainText(md) {
  return String(md || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`|~-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function youtubeId(url) {
  const m = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/.exec(String(url || ''));
  return m ? m[1] : '';
}

module.exports = {
  newId, slugify, formatDate, formatDateTime, formatBytes, pair, splitPipes, initials,
  extOf, fileTypeLabel, isoNow, truncate, plainText, youtubeId,
};
