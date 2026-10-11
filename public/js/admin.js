/* Admin panel enhancements: theme, menu, confirmations, slugs, file previews,
   Markdown preview, copy links and an unsaved-changes guard. */
(function () {
  'use strict';
  var doc = document;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var shell = $('[data-admin]');
  var csrf = shell ? shell.getAttribute('data-csrf') : '';

  // Theme toggle (same storage key as the public site)
  $$('[data-theme-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var root = doc.documentElement;
      var cur = root.getAttribute('data-theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      var next = cur === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('bl-theme', next); } catch (e) { /* ignore */ }
    });
  });

  // Sidebar on small screens
  var menu = $('[data-admin-menu]');
  var side = $('#admin-side');
  if (menu && side) {
    menu.addEventListener('click', function () {
      var open = menu.getAttribute('aria-expanded') !== 'true';
      menu.setAttribute('aria-expanded', String(open));
      side.classList.toggle('is-open', open);
    });
  }

  // Confirm destructive actions
  $$('form[data-confirm]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      if (!window.confirm(form.getAttribute('data-confirm'))) e.preventDefault();
    });
  });

  // Fill an empty slug from its source field
  $$('[data-slug-from]').forEach(function (slug) {
    var source = doc.getElementById(slug.getAttribute('data-slug-from'));
    if (!source) return;
    var touched = slug.value !== '';
    slug.addEventListener('input', function () { touched = slug.value !== ''; });
    source.addEventListener('input', function () {
      if (touched) return;
      slug.value = source.value.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
    });
  });

  // Drop zones and image previews
  $$('[data-dropzone]').forEach(function (zone) {
    var input = $('input[type=file]', zone);
    var text = $('.dropzone-text span', zone);
    var preview = $('.dropzone-preview', zone);
    if (!input) return;
    var original = text ? text.textContent : '';
    var describe = function () {
      var files = Array.prototype.slice.call(input.files || []);
      if (!files.length) { if (text) text.textContent = original; if (preview) preview.hidden = true; return; }
      if (text) text.textContent = files.length === 1 ? files[0].name + ' (' + Math.round(files[0].size / 1024) + ' KB)' : files.length + ' files selected';
      if (preview && files.length === 1 && /^image\//.test(files[0].type)) {
        var reader = new FileReader();
        reader.onload = function () { preview.src = reader.result; preview.hidden = false; };
        reader.readAsDataURL(files[0]);
      }
    };
    input.addEventListener('change', describe);
    ['dragenter', 'dragover'].forEach(function (ev) { zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add('is-over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { zone.addEventListener(ev, function () { zone.classList.remove('is-over'); }); });
    zone.addEventListener('drop', function (e) {
      e.preventDefault();
      if (e.dataTransfer && e.dataTransfer.files.length) {
        input.files = e.dataTransfer.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  });

  // Markdown preview
  $$('[data-md-preview]').forEach(function (btn) {
    var id = btn.getAttribute('data-md-preview');
    var area = doc.getElementById(id);
    var out = $('[data-md-output="' + id + '"]');
    if (!area || !out) return;
    btn.addEventListener('click', function () {
      if (!out.hidden) { out.hidden = true; area.hidden = false; btn.textContent = 'Preview'; return; }
      btn.disabled = true;
      fetch('/admin/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: JSON.stringify({ markdown: area.value }),
        credentials: 'same-origin'
      }).then(function (r) { if (!r.ok) throw new Error('Preview failed'); return r.json(); }).then(function (data) {
        out.innerHTML = data.html || '<p><em>Nothing to preview.</em></p>';
        out.hidden = false; area.hidden = true; btn.textContent = 'Edit';
      }).catch(function () { btn.textContent = 'Preview unavailable'; }).then(function () { btn.disabled = false; });
    });
  });

  // Copy links in the media library
  $$('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      var original = btn.innerHTML;
      var done = function (msg) { btn.textContent = msg; setTimeout(function () { btn.innerHTML = original; }, 1500); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { done('Copied'); }, function () { window.prompt('Copy this link:', text); });
      else window.prompt('Copy this link:', text);
    });
  });

  // Warn before leaving a form with unsaved changes
  $$('form[data-dirty-guard]').forEach(function (form) {
    var dirty = false;
    form.addEventListener('input', function () { dirty = true; });
    form.addEventListener('change', function () { dirty = true; });
    form.addEventListener('submit', function () { dirty = false; });
    window.addEventListener('beforeunload', function (e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
  });
})();
