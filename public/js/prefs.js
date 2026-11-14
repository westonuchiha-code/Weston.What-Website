/* Applies saved display settings before the page paints, so nothing flickers.
   Settings are stored only in this browser (localStorage key "ww-prefs"). */
(function () {
  var d = document.documentElement;
  var p = {};
  try { p = JSON.parse(localStorage.getItem('ww-prefs') || '{}') || {}; } catch (e) { /* storage blocked */ }
  d.classList.remove('no-js');
  d.classList.add('js');
  if (p.crt !== false) d.classList.add('crt');
  if (p.phosphor) d.setAttribute('data-phosphor', p.phosphor);
  if (p.motion === 'reduce') d.classList.add('reduce-motion');
  if (p.motion === 'full') d.classList.add('force-motion');
  if (p.mode1999 && p.unlocked1999) d.classList.add('mode-1999');
})();
