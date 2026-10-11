/* Applies the saved light/dark choice before the page paints. */
(function () {
  try {
    var t = localStorage.getItem('bl-theme');
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  } catch (e) { /* storage unavailable: follow the system setting */ }
})();
