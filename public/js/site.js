/* Betel AI website: small progressive enhancements. Every page works without this file. */
(function () {
  'use strict';
  var doc = document;
  var root = doc.documentElement;
  var $ = function (sel, ctx) { return (ctx || doc).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  };
  var escapeHtml = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  /* ---------- Theme toggle ---------- */
  function currentTheme() {
    var set = root.getAttribute('data-theme');
    if (set) return set;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  $$('[data-theme-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      store.set('bl-theme', next);
    });
  });

  /* ---------- Mobile menu ---------- */
  var menuBtn = $('[data-menu-toggle]');
  var nav = $('#main-nav');
  function setMenu(open) {
    if (!menuBtn || !nav) return;
    menuBtn.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
  }
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
    doc.addEventListener('click', function (e) { if (!e.target.closest('[data-header]')) setMenu(false); });
  }

  /* ---------- Copy buttons ---------- */
  function flash(btn, text) {
    var label = btn.getAttribute('aria-label');
    var original = btn.innerHTML;
    if (btn.classList.contains('icon-btn')) {
      btn.setAttribute('aria-label', text);
      btn.classList.add('is-copied');
      btn.title = text;
    } else {
      btn.textContent = text;
    }
    setTimeout(function () {
      if (btn.classList.contains('icon-btn')) { btn.setAttribute('aria-label', label || ''); btn.classList.remove('is-copied'); btn.title = ''; }
      else btn.innerHTML = original;
    }, 1600);
  }
  function selectText(el) {
    var range = doc.createRange(); range.selectNodeContents(el);
    var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
  }
  function copy(text, btn, fallbackEl) {
    var done = function () { flash(btn, 'Copied'); };
    var fail = function () { if (fallbackEl) { selectText(fallbackEl); flash(btn, 'Press Ctrl+C to copy'); } else { window.prompt('Copy this:', text); } };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fail);
    else fail();
  }
  doc.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-copy], [data-copy-target]');
    if (!btn) return;
    if (btn.hasAttribute('data-copy')) copy(btn.getAttribute('data-copy'), btn, btn.previousElementSibling);
    else {
      var target = doc.getElementById(btn.getAttribute('data-copy-target'));
      if (target) copy(target.textContent, btn, target);
    }
  });

  /* ---------- Lightbox ---------- */
  var box = $('[data-lightbox-dialog]');
  if (box && box.showModal) {
    var img = $('[data-lightbox-img]', box);
    var cap = $('[data-lightbox-caption]', box);
    var group = [];
    var index = 0;
    var show = function (i) {
      index = (i + group.length) % group.length;
      var el = group[index];
      img.src = el.currentSrc || el.src;
      img.alt = el.alt || '';
      cap.textContent = el.getAttribute('data-caption') || el.alt || '';
      $$('.lightbox-nav', box).forEach(function (b) { b.hidden = group.length < 2; });
    };
    doc.addEventListener('click', function (e) {
      var el = e.target.closest('img[data-lightbox]');
      if (!el || e.target.closest('a')) return;
      var container = el.closest('[data-lightbox-group]');
      group = container ? $$('img[data-lightbox]', container) : [el];
      show(group.indexOf(el));
      box.showModal();
    });
    $('[data-lightbox-close]', box).addEventListener('click', function () { box.close(); });
    $('[data-lightbox-prev]', box).addEventListener('click', function () { show(index - 1); });
    $('[data-lightbox-next]', box).addEventListener('click', function () { show(index + 1); });
    box.addEventListener('click', function (e) { if (e.target === box) box.close(); });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') show(index - 1);
      if (e.key === 'ArrowRight') show(index + 1);
    });
  }

  /* ---------- Search ---------- */
  var dlg = $('[data-search-dialog]');
  if (dlg && dlg.showModal) {
    var input = $('[data-search-input]', dlg);
    var results = $('[data-search-results]', dlg);
    var page = $('[data-search-index]');
    var indexUrl = page ? page.getAttribute('data-search-index') : 'search-index.json';
    var entries = null;
    var active = -1;
    var hint = results.innerHTML;
    var load = function () {
      if (entries) return Promise.resolve(entries);
      return fetch(indexUrl, { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (data) { entries = data; return data; }).catch(function () { entries = []; return entries; });
    };
    var mark = function (text, terms) {
      var out = escapeHtml(text);
      terms.forEach(function (t) {
        if (t.length < 2) return;
        out = out.replace(new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>');
      });
      return out;
    };
    var render = function () {
      var q = input.value.trim().toLowerCase();
      active = -1;
      if (!q) { results.innerHTML = hint; return; }
      var terms = q.split(/\s+/).filter(Boolean);
      var scored = (entries || []).map(function (e) {
        var title = (e.t || '').toLowerCase();
        var hay = (title + ' ' + (e.s || '') + ' ' + (e.x || '')).toLowerCase();
        var score = 0;
        for (var i = 0; i < terms.length; i++) {
          if (hay.indexOf(terms[i]) === -1) return null;
          if (title.indexOf(terms[i]) !== -1) score += 3;
          score += 1;
        }
        return { e: e, score: score };
      }).filter(Boolean).sort(function (a, b) { return b.score - a.score; }).slice(0, 12);
      if (!scored.length) { results.innerHTML = '<p class="search-empty">No results for “' + escapeHtml(input.value) + '”.</p>'; return; }
      var snippet = function (text) {
        var lower = text.toLowerCase();
        var at = -1;
        for (var i = 0; i < terms.length && at === -1; i++) at = lower.indexOf(terms[i]);
        if (at < 120) return text.length > 220 ? text.slice(0, 220) + '…' : text;
        var start = text.lastIndexOf(' ', at - 90);
        return '…' + text.slice(start + 1, start + 221) + (start + 221 < text.length ? '…' : '');
      };
      results.innerHTML = scored.map(function (r, i) {
        return '<a href="' + escapeHtml(r.e.u) + '" id="sr-' + i + '"><span class="r-section">' + escapeHtml(r.e.s || '') + '</span><span class="r-title">' + mark(r.e.t || '', terms) + '</span><span class="r-text">' + mark(snippet(r.e.x || ''), terms) + '</span></a>';
      }).join('');
    };
    var open = function () {
      dlg.showModal();
      input.value = '';
      results.innerHTML = hint;
      input.focus();
      load().then(render);
    };
    $$('[data-search-open]').forEach(function (b) { b.addEventListener('click', open); });
    input.addEventListener('input', function () { load().then(render); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); dlg.close(); return; }
      var links = $$('a', results);
      if (!links.length) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        active = e.key === 'ArrowDown' ? Math.min(active + 1, links.length - 1) : Math.max(active - 1, 0);
        links.forEach(function (l, i) { l.setAttribute('aria-selected', String(i === active)); });
        links[active].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        window.location.href = links[Math.max(active, 0)].getAttribute('href');
      }
    });
    results.addEventListener('click', function (e) { if (e.target.closest('a')) dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    doc.addEventListener('keydown', function (e) {
      var typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '') || (e.target && e.target.isContentEditable);
      if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
        if (dlg.open) return;
        e.preventDefault();
        open();
      }
    });
  }

  /* ---------- Milestone picker ---------- */
  var ms = $('[data-ms]');
  if (ms) {
    var select = $('[data-ms-select]', ms);
    var panels = $$('[data-ms-panel]', ms);
    var links = $$('[data-ms-link]', ms);
    var choose = function (slug, updateHash) {
      if (!panels.some(function (p) { return p.id === slug; })) slug = panels[0].id;
      panels.forEach(function (p) { p.hidden = p.id !== slug; });
      links.forEach(function (l) { l.setAttribute('aria-current', String(l.getAttribute('data-ms-link') === slug)); });
      select.value = slug;
      if (updateHash && history.replaceState) history.replaceState(null, '', '#' + slug);
    };
    var fromHash = decodeURIComponent((location.hash || '').slice(1));
    choose(fromHash || ms.getAttribute('data-ms-initial'), false);
    select.addEventListener('change', function () { choose(select.value, true); });
    links.forEach(function (l) {
      l.addEventListener('click', function (e) {
        e.preventDefault();
        choose(l.getAttribute('data-ms-link'), true);
        if (window.innerWidth < 900) select.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
    window.addEventListener('hashchange', function () { choose(decodeURIComponent(location.hash.slice(1)), false); });
  }

  /* ---------- Table of contents highlight ---------- */
  var tocLinks = $$('[data-toc-link]');
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var visible = {};
    var sections = $$('[data-toc-section]');
    var update = function () {
      var current = null;
      for (var i = 0; i < sections.length; i++) if (visible[sections[i].id]) { current = sections[i].id; break; }
      if (!current) return;
      tocLinks.forEach(function (l) { l.setAttribute('aria-current', String(l.getAttribute('href') === '#' + current)); });
    };
    var io = new IntersectionObserver(function (items) {
      items.forEach(function (it) { visible[it.target.id] = it.isIntersecting; });
      update();
    }, { rootMargin: '-20% 0px -60% 0px' });
    sections.forEach(function (s) { io.observe(s); });
  }

  /* ---------- Gallery filter ---------- */
  $$('[data-filter-group]').forEach(function (groupEl) {
    var buttons = $$('[data-filter]', groupEl);
    var items = $$('[data-category]', groupEl.parentNode);
    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        var f = b.getAttribute('data-filter');
        buttons.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        items.forEach(function (it) { it.hidden = f !== '*' && it.getAttribute('data-category') !== f; });
      });
    });
  });

  /* ---------- Design preview: forms do not submit ---------- */
  $$('[data-preview-form]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var note = $('[data-preview-note]', form);
      if (note) note.hidden = false;
    });
  });
})();
