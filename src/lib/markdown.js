'use strict';
// Markdown -> HTML for content written in the admin panel.
// Raw HTML is escaped and only safe link targets are kept, so content
// cannot inject scripts into the public site.
const { Marked } = require('../vendor/marked.umd.js');
const { escapeHtml, safeUrl, raw } = require('./html');

const marked = new Marked({ gfm: true, breaks: true });

marked.use({
  renderer: {
    html(token) { return escapeHtml(token.text); },
    link(token) {
      const href = safeUrl(token.href);
      const text = this.parser.parseInline(token.tokens);
      if (!href) return text;
      const external = /^https?:/i.test(href);
      const title = token.title ? ` title="${escapeHtml(token.title)}"` : '';
      const ext = external ? ' target="_blank" rel="noopener"' : '';
      return `<a href="${escapeHtml(href)}"${title}${ext}>${text}</a>`;
    },
    image(token) {
      const src = safeUrl(token.href);
      if (!src) return '';
      const alt = escapeHtml(token.text || '');
      // A <span> wrapper keeps the HTML valid inside the paragraph marked creates.
      const caption = token.title ? `<span class="md-caption">${escapeHtml(token.title)}</span>` : '';
      return `<span class="md-figure"><img src="${escapeHtml(src)}" alt="${alt}" loading="lazy" data-lightbox>${caption}</span>`;
    },
    table(token) {
      // Wrap tables so they scroll on phones instead of widening the page.
      const header = token.header.map((cell) => `<th${cell.align ? ` style="text-align:${cell.align}"` : ''}>${this.parser.parseInline(cell.tokens)}</th>`).join('');
      const rows = token.rows.map((row) => `<tr>${row.map((cell) => `<td${cell.align ? ` style="text-align:${cell.align}"` : ''}>${this.parser.parseInline(cell.tokens)}</td>`).join('')}</tr>`).join('');
      return `<div class="table-scroll"><table><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table></div>`;
    },
  },
});

function renderMarkdown(source) {
  if (!source) return raw('');
  return raw(marked.parse(String(source)));
}

function renderInline(source) {
  if (!source) return raw('');
  return raw(marked.parseInline(String(source)));
}

module.exports = { renderMarkdown, renderInline };
