/* Admin panel enhancements: theme, menu, confirmations, slugs, file previews,
   upload preparation, Markdown preview, copy links and an unsaved-changes guard. */
(function () {
  'use strict';
  var doc = document;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var shell = $('[data-admin]');
  var csrf = shell ? shell.getAttribute('data-csrf') : '';
  // Upload limits from the server (bytes). Vercel, for example, refuses requests over 4.5 MB.
  var maxFile = Number(shell && shell.getAttribute('data-max-file')) || 0;
  var maxRequest = Number(shell && shell.getAttribute('data-max-request')) || 0;
  var sizeLabel = function (bytes) {
    return bytes >= 1048576 ? (Math.round(bytes / 104857.6) / 10) + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' KB';
  };
  // Photos that the browser can shrink before uploading.
  var canShrink = function (file) {
    return /^image\/(jpeg|png|webp)$/.test(file.type) && typeof DataTransfer === 'function' && !!doc.createElement('canvas').getContext;
  };

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
      zone.classList.remove('is-too-big');
      if (!files.length) { if (text) text.textContent = original; if (preview) preview.hidden = true; return; }
      if (text) text.textContent = files.length === 1 ? files[0].name + ' (' + sizeLabel(files[0].size) + ')' : files.length + ' files selected';
      var tooBig = files.filter(function (f) { return maxFile && f.size > maxFile && !canShrink(f); });
      if (tooBig.length) {
        zone.classList.add('is-too-big');
        if (text) text.textContent += ' · too large, the limit is ' + sizeLabel(maxFile);
      }
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

  // Before a form with files is sent: shrink big photos to at most 2000 px, then
  // check the sizes so an oversized upload gets a clear message, not an error page.
  var SHRINK_OVER = 1.5 * 1048576;
  var MAX_SIDE = 2000;

  // Always resolves: with a smaller copy, or with the original file if anything goes wrong.
  function shrinkImage(file) {
    if (!canShrink(file) || file.size <= SHRINK_OVER) return Promise.resolve(file);
    return new Promise(function (resolve) {
      var settled = false;
      var finish = function (result) { if (!settled) { settled = true; resolve(result); } };
      setTimeout(function () { finish(file); }, 20000);
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onerror = function () { URL.revokeObjectURL(url); finish(file); };
      img.onload = function () {
        URL.revokeObjectURL(url);
        try {
          var scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
          var canvas = doc.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
          var g = canvas.getContext('2d');
          if (!g) { finish(file); return; }
          // JPEG stays JPEG; PNG and WebP become WebP so transparency survives.
          var type = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp';
          if (type === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, canvas.width, canvas.height); }
          g.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(function (blob) {
            var ext = blob && { 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/png': '.png' }[blob.type];
            if (!ext || blob.size >= file.size) { finish(file); return; }
            try { finish(new File([blob], file.name.replace(/\.[^.]*$/, '') + ext, { type: blob.type, lastModified: Date.now() })); } catch (e) { finish(file); }
          }, type, 0.85);
        } catch (e) {
          finish(file);
        }
      };
      img.src = url;
    });
  }

  function prepareInput(input) {
    var files = Array.prototype.slice.call(input.files);
    return Promise.all(files.map(shrinkImage)).then(function (out) {
      if (!out.some(function (f, i) { return f !== files[i]; })) return;
      try {
        var dt = new DataTransfer();
        out.forEach(function (f) { dt.items.add(f); });
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      } catch (e) { /* keep the original files */ }
    });
  }

  function uploadProblem(form, inputs) {
    var total = 0;
    var linkHint = $('[name="link"]', form) ? ' paste its OneDrive or Google Drive share link into “Or a link” instead.' : ' upload it to OneDrive or Google Drive and use the share link instead.';
    for (var i = 0; i < inputs.length; i++) {
      for (var j = 0; j < inputs[i].files.length; j++) {
        var f = inputs[i].files[j];
        if (maxFile && f.size > maxFile) {
          return '“' + f.name + '” is ' + sizeLabel(f.size) + ', but the upload limit is ' + sizeLabel(maxFile) + ' per file. '
            + (/^image\//.test(f.type) ? 'Please choose a smaller photo.' : 'Compress it, or' + linkHint);
        }
        total += f.size;
      }
    }
    var room = maxRequest - 64 * 1024; // leave space for the other form fields
    if (maxRequest && total > room) {
      return 'The chosen files add up to ' + sizeLabel(total) + ', but one save can upload at most ' + sizeLabel(room) + '. Save with fewer files, then add the rest.';
    }
    return '';
  }

  function uploadMessage(form, text, isError) {
    var box = $('.upload-message', form);
    if (!box) {
      box = doc.createElement('p');
      form.insertBefore(box, form.firstChild);
    }
    box.className = 'upload-message notice ' + (isError ? 'notice-error' : 'notice-ok');
    box.setAttribute('role', isError ? 'alert' : 'status');
    box.textContent = text;
    if (isError) box.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  $$('form[enctype="multipart/form-data"]').forEach(function (form) {
    var ready = false;
    var working = false;
    form.addEventListener('submit', function (e) {
      if (ready) return; // second pass: the files are ready, let the browser send them
      var inputs = $$('input[type=file]', form).filter(function (input) { return input.files && input.files.length; });
      if (!inputs.length) return;
      e.preventDefault();
      if (working) return;
      working = true;
      var submitter = e.submitter;
      uploadMessage(form, 'Preparing files…');
      Promise.all(inputs.map(function (input) { return prepareInput(input).catch(function () { /* send as chosen */ }); })).then(function () {
        // Continue in a new task: while the first submit event is still being
        // dispatched, the browser ignores requestSubmit().
        setTimeout(function () {
          working = false;
          var problem = uploadProblem(form, inputs);
          if (problem) { uploadMessage(form, problem, true); return; }
          var total = inputs.reduce(function (n, input) { return n + Array.prototype.reduce.call(input.files, function (m, f) { return m + f.size; }, 0); }, 0);
          uploadMessage(form, 'Uploading ' + sizeLabel(total) + '…');
          ready = true;
          try {
            if (form.requestSubmit) form.requestSubmit(submitter && submitter.form === form ? submitter : undefined);
            else { form.dataset.dirty = ''; form.submit(); }
          } finally {
            ready = false;
          }
        }, 0);
      });
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
  var guarded = $$('form[data-dirty-guard]');
  guarded.forEach(function (form) {
    var mark = function () { form.dataset.dirty = '1'; };
    form.addEventListener('input', mark);
    form.addEventListener('change', mark);
    // A submit held back (files being prepared, or too large) keeps the warning.
    form.addEventListener('submit', function (e) { if (!e.defaultPrevented) form.dataset.dirty = ''; });
  });
  if (guarded.length) {
    window.addEventListener('beforeunload', function (e) {
      if (guarded.some(function (form) { return form.dataset.dirty === '1'; })) { e.preventDefault(); e.returnValue = ''; }
    });
  }
})();
